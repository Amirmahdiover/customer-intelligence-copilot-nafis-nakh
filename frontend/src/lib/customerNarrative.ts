import { SNAPSHOT_DATE } from '@/lib/constants'
import { daysSince, formatCurrency } from '@/lib/formatters'
import type {
  CrmInteraction,
  Customer,
  CustomerChurn,
  CustomerFinancial,
  NegotiationScore,
  RecommendedAction,
} from '@/types/crm'

export type HealthLevel = 'critical' | 'warning' | 'healthy'

export interface HealthVerdict {
  level: HealthLevel
  /** Short verdict shown as the panel headline, e.g. «در معرض ریزش». */
  label: string
  /** One-line justification, e.g. «۹۹.۴٪ احتمال ریزش در ۹۰ روز آینده». */
  headline: string
}

export type TimelineTone = 'neutral' | 'positive' | 'warning' | 'critical' | 'future'

export interface TimelineEvent {
  id: string
  /** ISO date. Future events sort above the snapshot. */
  date: string
  title: string
  detail?: string
  tone: TimelineTone
}

function toPercent(value: number): string {
  return `${(value * 100).toFixed(1)}٪`
}

/**
 * Recency in days, falling back to the expected-next-order offset when the
 * API omits Recency_Days.
 */
export function resolveRecencyDays(customer: Customer): number | null {
  if (customer.recencyDays != null) return customer.recencyDays
  if (customer.daysUntilExpectedNextOrder != null) {
    return customer.typicalOrderInterval - customer.daysUntilExpectedNextOrder
  }
  if (customer.lastOrderDate) {
    const days = daysSince(customer.lastOrderDate)
    return Number.isFinite(days) ? days : null
  }
  return null
}

export function buildHealthVerdict(
  customer: Customer,
  churn?: CustomerChurn,
): HealthVerdict {
  if (churn) {
    if (churn.riskLevel === 'بالا' || churn.churnProbability >= 0.7) {
      return {
        level: 'critical',
        label: 'در معرض ریزش',
        headline: `${toPercent(churn.churnProbability)} احتمال ریزش`,
      }
    }
    if (churn.riskLevel === 'متوسط' || churn.churnProbability >= 0.4) {
      return {
        level: 'warning',
        label: 'نیازمند توجه',
        headline: `${toPercent(churn.churnProbability)} احتمال ریزش`,
      }
    }
    return {
      level: 'healthy',
      label: 'سالم',
      headline: `${toPercent(churn.churnProbability)} احتمال ریزش`,
    }
  }

  if (customer.status === 'high-risk') {
    return {
      level: 'critical',
      label: 'در معرض ریزش',
      headline: 'ارزیابی بر پایه قواعد ریسک',
    }
  }
  if (customer.status === 'watch') {
    return {
      level: 'warning',
      label: 'نیازمند توجه',
      headline: 'ارزیابی بر پایه قواعد ریسک',
    }
  }
  return {
    level: 'healthy',
    label: 'سالم',
    headline: 'ارزیابی بر پایه قواعد ریسک',
  }
}

/**
 * The «چرا؟» bullets. Every item is derived from a real field so the sales
 * manager can trace the model output back to observable behaviour.
 */
export function buildRiskReasons(
  customer: Customer,
  churn?: CustomerChurn,
  negotiation?: NegotiationScore,
): string[] {
  const reasons: string[] = []
  const recency = resolveRecencyDays(customer)

  if (recency != null && recency > 0) {
    if (customer.typicalOrderInterval > 0 && recency > customer.typicalOrderInterval) {
      const ratio = (recency / customer.typicalOrderInterval).toFixed(1)
      reasons.push(
        `${recency.toLocaleString('fa-IR')} روز از آخرین خرید گذشته — ${ratio} برابر فاصله معمول این مشتری (${customer.typicalOrderInterval.toLocaleString('fa-IR')} روز)`,
      )
    } else {
      reasons.push(`${recency.toLocaleString('fa-IR')} روز از آخرین خرید گذشته`)
    }
  }

  if (customer.orderCount <= 1) {
    reasons.push('تعداد سفارش بسیار پایین — الگوی خرید تکرارشونده شکل نگرفته است')
  } else if (customer.orderCount <= 3) {
    reasons.push(
      `فقط ${customer.orderCount.toLocaleString('fa-IR')} سفارش در طول عمر مشتری ثبت شده است`,
    )
  }

  if (customer.accountStatus === 'غیرفعال') {
    reasons.push('حساب مشتری در سیستم غیرفعال علامت خورده است')
  }

  if (customer.paymentStatus === 'overdue') {
    reasons.push('پرداخت معوق دارد')
  } else if (customer.paymentStatus === 'pending') {
    reasons.push('سابقه تأخیر در پرداخت دارد')
  }

  const trend = customer.revenueTrend
  if (trend.length >= 2) {
    const last = trend[trend.length - 1]?.revenue ?? 0
    const prev = trend[trend.length - 2]?.revenue ?? 0
    if (prev > 0 && last < prev * 0.85) {
      const drop = Math.round((1 - last / prev) * 100)
      reasons.push(`روند درآمد نزولی است — ${drop.toLocaleString('fa-IR')}٪ کاهش نسبت به دوره قبل`)
    }
  }

  if (customer.risk.commercial === 'high') {
    reasons.push('ریسک تجاری بالا در ارزیابی قواعد ریسک')
  }
  if (customer.risk.financial === 'high') {
    reasons.push('ریسک مالی بالا در ارزیابی قواعد ریسک')
  }

  if (negotiation?.keyDrivers?.length) {
    reasons.push(...negotiation.keyDrivers)
  }

  if (reasons.length === 0) {
    reasons.push(
      churn && churn.churnProbability < 0.4
        ? 'سیگنال منفی قابل توجهی در رفتار این مشتری ثبت نشده است'
        : 'دلیل قابل استنادی از داده‌های موجود استخراج نشد',
    )
  }

  return reasons
}

interface TimelineSources {
  customer?: Customer
  interactions?: CrmInteraction[]
  financial?: CustomerFinancial
  actions?: RecommendedAction[]
}

/**
 * There is no activity endpoint. This stitches a single ordered feed out of
 * the dated facts the API already returns.
 */
export function buildTimeline({
  customer,
  interactions,
  financial,
  actions,
}: TimelineSources): TimelineEvent[] {
  const events: TimelineEvent[] = []

  if (customer?.lastOrderDate) {
    events.push({
      id: 'last-order',
      date: customer.lastOrderDate,
      title: 'آخرین سفارش',
      detail:
        customer.averageOrderValue > 0
          ? `به ارزش ${formatCurrency(customer.averageOrderValue)}`
          : undefined,
      tone: 'positive',
    })
  }

  interactions?.forEach((item, index) => {
    if (!item.updatedAt) return
    const parts = [item.interactionType, item.summaryText].filter(Boolean)
    events.push({
      id: `crm-${index}`,
      date: item.updatedAt,
      title: item.nextAction ?? 'تعامل CRM',
      detail: parts.length > 0 ? parts.join(' · ') : undefined,
      tone: item.urgency === 'فوری' ? 'critical' : 'neutral',
    })
  })

  if (financial?.lastReturnedCheckDate) {
    events.push({
      id: 'returned-check',
      date: financial.lastReturnedCheckDate,
      title: 'چک برگشتی',
      detail:
        financial.returnedCheckCount > 1
          ? `${financial.returnedCheckCount.toLocaleString('fa-IR')} مورد ثبت‌شده`
          : undefined,
      tone: 'critical',
    })
  }

  const recency = customer ? resolveRecencyDays(customer) : null
  if (
    customer &&
    recency != null &&
    customer.typicalOrderInterval > 0 &&
    recency > customer.typicalOrderInterval
  ) {
    events.push({
      id: 'inactivity-gap',
      date: SNAPSHOT_DATE,
      title: 'وقفه در تعامل',
      detail: `${recency.toLocaleString('fa-IR')} روز بدون خرید، در برابر فاصله معمول ${customer.typicalOrderInterval.toLocaleString('fa-IR')} روز`,
      tone: 'warning',
    })
  }

  const primaryAction = actions?.find((a) => a.priority === 'high') ?? actions?.[0]
  if (primaryAction) {
    events.push({
      id: 'ai-recommendation',
      date: SNAPSHOT_DATE,
      title: `توصیه سیستم: ${primaryAction.title}`,
      detail: primaryAction.reason,
      tone: 'neutral',
    })
  }

  if (customer?.expectedNextOrderDate) {
    events.push({
      id: 'expected-next-order',
      date: customer.expectedNextOrderDate,
      title: 'موعد پیش‌بینی‌شده سفارش بعدی',
      tone: 'future',
    })
  }

  return events.sort((a, b) => {
    const diff = new Date(b.date).getTime() - new Date(a.date).getTime()
    return Number.isNaN(diff) ? 0 : diff
  })
}
