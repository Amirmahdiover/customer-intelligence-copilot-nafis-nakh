import type { Customer, CustomerFinancial } from '@/types/crm'

export type PaymentPatternKind = 'cash' | 'check' | 'check-risky'

export type DependencyLevel = 'none' | 'watch' | 'high' | 'critical' | 'financial-risk'

export interface PaymentPattern {
  kind: PaymentPatternKind
  label: string
  /** 0-100 share of purchases attributed to the dominant mode. */
  dominantSharePct: number
  caption: string
}

export interface DependencyAlert {
  level: DependencyLevel
  message: string
}

export interface EconomicValueModel {
  companyRevenueSharePct: number | null
  annualSalesT12m: number | null
  walletSharePct: number | null
  growthCapacity: 'بالا' | 'متوسط' | 'پایین' | null
  payment: PaymentPattern
  economicScore: number
  dependency: DependencyAlert | null
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Infer cash vs check mix from delay / bounce signals when an explicit
 * payment-mix column is not available in the analytics snapshot.
 */
export function buildPaymentPattern(
  customer: Customer,
  financial?: CustomerFinancial | null,
): PaymentPattern {
  const bounce = customer.bouncedCheckRate ?? 0
  const avgDelay = customer.avgPaymentDelayDays ?? 0
  const maxDelay = customer.maxPaymentDelayDays ?? 0
  const hasReturned =
    Boolean(financial?.hasReturnedCheck) || (financial?.returnedCheckCount ?? 0) > 0

  const riskPressure = bounce * 100 + avgDelay * 1.2 + (maxDelay > 45 ? 15 : 0)
  const cashPct = Math.round(clamp(100 - riskPressure, 8, 96))
  const checkPct = 100 - cashPct

  const isRisky =
    hasReturned || bounce >= 0.05 || avgDelay >= 30 || maxDelay >= 60

  if (isRisky) {
    const delayPart =
      avgDelay > 0
        ? ` | میانگین تأخیر: ${Math.round(avgDelay).toLocaleString('fa-IR')} روز`
        : ''
    return {
      kind: 'check-risky',
      label: 'چکی پرریسک',
      dominantSharePct: Math.max(checkPct, 55),
      caption: `${Math.max(checkPct, 55).toLocaleString('fa-IR')}٪ خریدها چکی${delayPart}`,
    }
  }

  if (cashPct >= 55) {
    return {
      kind: 'cash',
      label: 'نقدی',
      dominantSharePct: cashPct,
      caption: `${cashPct.toLocaleString('fa-IR')}٪ خریدها نقدی`,
    }
  }

  const delayPart =
    avgDelay > 0
      ? ` | میانگین تأخیر: ${Math.round(avgDelay).toLocaleString('fa-IR')} روز`
      : ''
  return {
    kind: 'check',
    label: 'چکی',
    dominantSharePct: checkPct,
    caption: `${checkPct.toLocaleString('fa-IR')}٪ خریدها چکی${delayPart}`,
  }
}

function scoreRevenueShare(share: number | null): number {
  if (share == null || share <= 0) return 0
  // 15٪ سهم از درآمد شرکت = امتیاز کامل این بُعد
  return clamp((share / 0.15) * 100, 0, 100)
}

function scoreMargin(marginPct: number | null): number {
  if (marginPct == null) return 40
  // حاشیه ۳۵٪ = امتیاز کامل این بُعد
  return clamp((marginPct / 0.35) * 100, 0, 100)
}

function scoreWallet(walletShare: number | null): number {
  if (walletShare == null) return 35
  // سهم از سبد ۶۰٪ = امتیاز کامل؛ فضای رشد در سطوح پایین‌تر هم امتیاز می‌گیرد
  const penetration = clamp((walletShare / 0.6) * 100, 0, 100)
  const growthRoom = walletShare < 0.35 ? 12 : walletShare < 0.5 ? 6 : 0
  return clamp(penetration * 0.85 + growthRoom, 0, 100)
}

function scorePayment(payment: PaymentPattern): number {
  if (payment.kind === 'cash') return 88 + Math.min(12, (payment.dominantSharePct - 55) * 0.25)
  if (payment.kind === 'check') return 48
  return 18
}

export function buildDependencyAlert(
  companyShare: number | null,
  payment: PaymentPattern,
): DependencyAlert | null {
  if (companyShare == null || companyShare < 0.1) return null

  const pctLabel = `${(companyShare * 100).toFixed(1)}٪`
  const riskyPayment =
    payment.kind === 'check-risky' || payment.kind === 'check'

  // High concentration + weak collection quality → escalate to financial risk.
  if (companyShare >= 0.1 && riskyPayment) {
    return {
      level: 'financial-risk',
      message:
        'وابستگی مالی پرریسک: سهم بالای درآمد همراه با ریسک وصول.',
    }
  }

  if (companyShare >= 0.2) {
    return {
      level: 'critical',
      message: `هشدار وابستگی بحرانی — تمرکز درآمد شرکت روی این مشتری بالاست (${pctLabel}).`,
    }
  }

  if (companyShare >= 0.15) {
    return {
      level: 'high',
      message: `وابستگی بالا — برنامه حفظ مشتری ضروری است. ${pctLabel} از درآمد شرکت به این مشتری وابسته است.`,
    }
  }

  return {
    level: 'watch',
    message: `وابستگی قابل پایش: ${pctLabel} از درآمد شرکت به این مشتری وابسته است.`,
  }
}

function growthCapacityLabel(
  walletShare: number | null,
): 'بالا' | 'متوسط' | 'پایین' | null {
  if (walletShare == null) return null
  if (walletShare < 0.2) return 'بالا'
  if (walletShare < 0.5) return 'متوسط'
  return 'پایین'
}

export function buildEconomicValue(
  customer: Customer,
  portfolioAnnualSales: number | null | undefined,
  financial?: CustomerFinancial | null,
): EconomicValueModel {
  const annual = customer.annualSalesT12m ?? null
  const companyShare =
    annual != null &&
    portfolioAnnualSales != null &&
    portfolioAnnualSales > 0
      ? annual / portfolioAnnualSales
      : null

  const payment = buildPaymentPattern(customer, financial)
  const wallet = customer.walletSharePct ?? null

  const economicScore = Math.round(
    scoreRevenueShare(companyShare) * 0.45 +
      scoreMargin(customer.marginPct ?? null) * 0.25 +
      scoreWallet(wallet) * 0.2 +
      scorePayment(payment) * 0.1,
  )

  return {
    companyRevenueSharePct: companyShare,
    annualSalesT12m: annual,
    walletSharePct: wallet,
    growthCapacity: growthCapacityLabel(wallet),
    payment,
    economicScore: clamp(economicScore, 0, 100),
    dependency: buildDependencyAlert(companyShare, payment),
  }
}

export { formatTomanCompact } from '@/lib/formatters'
