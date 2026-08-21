import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import type { SignalTone } from '@/components/crm/customer360/MetricRow'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  useCustomer,
  useCustomerBestOffer,
  useCustomerChurn,
  useCustomerNegotiationScore,
} from '@/hooks/crm/useCrmQueries'
import { resolveRecencyDays } from '@/lib/customerNarrative'
import { formatNumber } from '@/lib/formatters'
import type { NegotiationPillarKey } from '@/types/crm'
import { cn } from '@/lib/utils'

interface SalesIntelligenceProps {
  customerId: string
}

const PILLAR_LABELS: Record<NegotiationPillarKey, string> = {
  collection: 'سلامت وصول',
  retention: 'حفظ مشتری',
  loyalty: 'وفاداری',
  cash: 'نقدینگی',
}

const PILLAR_ORDER: NegotiationPillarKey[] = [
  'collection',
  'retention',
  'loyalty',
  'cash',
]

const CONFIDENCE_LABELS: Record<string, string> = {
  high: 'اطمینان بالا',
  medium: 'اطمینان متوسط',
  low: 'اطمینان پایین',
}

const TONE_SURFACE: Record<SignalTone, string> = {
  critical: 'bg-red-50/80',
  warning: 'bg-orange-50/80',
  caution: 'bg-amber-50/80',
  positive: 'bg-emerald-50/80',
  neutral: 'bg-muted/40',
}

const TONE_VALUE: Record<SignalTone, string> = {
  critical: 'text-red-700',
  warning: 'text-orange-700',
  caution: 'text-amber-700',
  positive: 'text-emerald-700',
  neutral: 'text-muted-foreground',
}

const TONE_BAR: Record<SignalTone, string> = {
  critical: '[&_[data-slot=progress-indicator]]:bg-red-500',
  warning: '[&_[data-slot=progress-indicator]]:bg-orange-500',
  caution: '[&_[data-slot=progress-indicator]]:bg-amber-500',
  positive: '[&_[data-slot=progress-indicator]]:bg-emerald-500',
  neutral: '[&_[data-slot=progress-indicator]]:bg-muted-foreground/40',
}

const TONE_LABEL: Record<SignalTone, string> = {
  critical: 'بحرانی',
  warning: 'هشدار',
  caution: 'نیازمند توجه',
  positive: 'مطلوب',
  neutral: 'بدون داده',
}

function formatPct(fraction: number): string {
  return `${(fraction * 100).toFixed(1)}٪`
}

/** Higher is worse. */
function riskTone(fraction: number): SignalTone {
  if (fraction >= 0.7) return 'critical'
  if (fraction >= 0.4) return 'warning'
  return 'positive'
}

/** Higher is better. */
function opportunityTone(fraction: number): SignalTone {
  if (fraction >= 0.6) return 'positive'
  if (fraction >= 0.35) return 'caution'
  return 'critical'
}

function pillarBarClass(score: number): string {
  if (score >= 0.7) return '[&_[data-slot=progress-indicator]]:bg-emerald-500'
  if (score >= 0.45) return '[&_[data-slot=progress-indicator]]:bg-amber-500'
  return '[&_[data-slot=progress-indicator]]:bg-destructive'
}

interface Prediction {
  key: string
  label: string
  value: string
  /** Bar magnitude, 0-100. */
  percent: number | null
  tone: SignalTone
  caption: string
}

function PredictionCell({ prediction }: { prediction: Prediction }) {
  const { label, value, percent, tone, caption } = prediction

  return (
    <div className={cn('flex flex-col gap-2 p-4', TONE_SURFACE[tone])}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-card-foreground">{label}</span>
        <span className={cn('text-[0.65rem] font-medium', TONE_VALUE[tone])}>
          {TONE_LABEL[tone]}
        </span>
      </div>

      <span
        className={cn(
          'text-3xl leading-none font-bold tabular-nums',
          TONE_VALUE[tone],
        )}
      >
        {value}
      </span>

      <Progress
        value={percent ?? 0}
        className={cn('h-1.5 bg-foreground/10', TONE_BAR[tone])}
      />

      <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {caption}
      </p>
    </div>
  )
}

export function SalesIntelligence({ customerId }: SalesIntelligenceProps) {
  const [showDetails, setShowDetails] = useState(false)

  const {
    data: customer,
    isLoading: customerLoading,
    isError: customerError,
    refetch,
  } = useCustomer(customerId)
  const { data: churn } = useCustomerChurn(customerId)
  const { data: offer } = useCustomerBestOffer(customerId)
  const { data: negotiation } = useCustomerNegotiationScore(customerId)

  if (customerLoading) return <SectionSkeleton />
  if (customerError || !customer) return <ErrorState onRetry={() => refetch()} />

  const predictions: Prediction[] = []

  predictions.push(
    negotiation
      ? {
          key: 'negotiation',
          label: 'امتیاز موفقیت مذاکره',
          value: `${formatNumber(negotiation.negotiationScore)}٪`,
          percent: negotiation.negotiationScore,
          tone: opportunityTone(negotiation.negotiationScore / 100),
          caption: negotiation.recommendation,
        }
      : {
          key: 'negotiation',
          label: 'امتیاز موفقیت مذاکره',
          value: '—',
          percent: null,
          tone: 'neutral',
          caption: 'پروفایل مذاکره برای این مشتری موجود نیست.',
        },
  )

  predictions.push(
    churn
      ? {
          key: 'churn',
          label: 'پیش‌بینی ریزش',
          value: formatPct(churn.churnProbability),
          percent: churn.churnProbability * 100,
          tone: riskTone(churn.churnProbability),
          caption:
            churn.churnPrediction === 1
              ? `سطح ریسک ${churn.riskLevel} — مدل این مشتری را در مسیر ریزش می‌بیند.`
              : `سطح ریسک ${churn.riskLevel} — مدل ماندگاری این مشتری را محتمل‌تر می‌داند.`,
        }
      : {
          key: 'churn',
          label: 'پیش‌بینی ریزش',
          value: '—',
          percent: null,
          tone: 'neutral',
          caption: 'فیچر مدل ریزش برای این مشتری موجود نیست.',
        },
  )

  predictions.push(
    offer?.best
      ? {
          key: 'offer',
          label: 'بهترین آفر پیشنهادی',
          value: formatPct(offer.best.acceptProbability),
          percent: offer.best.acceptProbability * 100,
          tone: opportunityTone(offer.best.acceptProbability),
          caption: `احتمال پذیرش ${offer.best.offerType} با تخفیف ${formatPct(offer.best.discountPct)} و اعتبار ${formatNumber(offer.best.validityDays)} روز.`,
        }
      : {
          key: 'offer',
          label: 'بهترین آفر پیشنهادی',
          value: '—',
          percent: null,
          tone: 'neutral',
          caption: 'پیشنهاد آفری برای این مشتری محاسبه نشده است.',
        },
  )

  const recency = resolveRecencyDays(customer)
  const daysUntil = customer.daysUntilExpectedNextOrder
  const interval = customer.typicalOrderInterval

  if (daysUntil != null && interval > 0) {
    const overdue = daysUntil < 0
    const days = Math.round(Math.abs(daysUntil))
    predictions.push({
      key: 'reorder',
      label: 'سفارش مجدد پیش‌بینی‌شده',
      value: `${formatNumber(days)} روز`,
      percent: Math.min(100, (days / interval) * 100),
      tone: overdue ? (days > interval ? 'critical' : 'warning') : 'positive',
      caption: overdue
        ? `از موعد گذشته — فاصله معمول سفارش این مشتری ${formatNumber(interval)} روز است.`
        : `تا موعد معمول سفارش — فاصله معمول این مشتری ${formatNumber(interval)} روز است.`,
    })
  } else if (recency != null) {
    predictions.push({
      key: 'reorder',
      label: 'سفارش مجدد پیش‌بینی‌شده',
      value: `${formatNumber(Math.round(recency))} روز`,
      percent: null,
      tone: 'neutral',
      caption: 'از آخرین سفارش — الگوی سفارش این مشتری قابل محاسبه نیست.',
    })
  } else {
    predictions.push({
      key: 'reorder',
      label: 'سفارش مجدد پیش‌بینی‌شده',
      value: '—',
      percent: null,
      tone: 'neutral',
      caption: 'الگوی سفارش این مشتری قابل محاسبه نیست.',
    })
  }

  const hasDetails = Boolean(negotiation || churn?.snapshotDate)

  return (
    <Card className="gap-0 py-0">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <h2 className="font-heading text-base font-semibold text-card-foreground">
          پیش‌بینی‌های کلیدی
        </h2>
        <span className="text-xs text-muted-foreground">
          خروجی مدل‌ها روی اسنپ‌شات{' '}
          {churn?.snapshotDate ?? negotiation?.snapshotDate ?? '—'}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-px border-y bg-border sm:grid-cols-2 xl:grid-cols-4">
        {predictions.map((prediction) => (
          <PredictionCell key={prediction.key} prediction={prediction} />
        ))}
      </div>

      {hasDetails && (
        <CardContent className="py-3">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 text-start text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setShowDetails((prev) => !prev)}
            aria-expanded={showDetails}
          >
            <span>جزئیات مدل</span>
            {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showDetails && (
            <div className="mt-3 space-y-3">
              {negotiation && (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                  {PILLAR_ORDER.map((key) => {
                    const pillar = negotiation.pillars[key]
                    if (!pillar) return null
                    return (
                      <div key={key}>
                        <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                          <span className="font-medium text-card-foreground">
                            {PILLAR_LABELS[key]}
                          </span>
                          <span className="tabular-nums text-muted-foreground">
                            {(pillar.score * 100).toFixed(0)}٪ ·{' '}
                            {CONFIDENCE_LABELS[pillar.confidence] ?? pillar.confidence}
                          </span>
                        </div>
                        <Progress
                          value={pillar.score * 100}
                          className={cn('h-1.5', pillarBarClass(pillar.score))}
                        />
                        {pillar.note ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {pillar.note}
                          </p>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              )}

              {negotiation && negotiation.keyDrivers.length > 0 && (
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {negotiation.keyDrivers.map((driver) => (
                    <li key={driver}>{driver}</li>
                  ))}
                </ul>
              )}

              {negotiation && negotiation.warnings.length > 0 && (
                <ul className="space-y-1 text-xs text-amber-700">
                  {negotiation.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
