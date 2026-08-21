import { AlertTriangle } from 'lucide-react'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { SignalDot, type SignalTone } from '@/components/crm/customer360/MetricRow'
import { Card, CardContent } from '@/components/ui/card'
import {
  useCustomer,
  useCustomerChurn,
  useCustomerNegotiationScore,
} from '@/hooks/crm/useCrmQueries'
import { resolveRecencyDays } from '@/lib/customerNarrative'
import { formatNumber } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface RiskSignalCardProps {
  customerId: string
}

function riskTone(fraction: number): SignalTone {
  if (fraction >= 0.7) return 'critical'
  if (fraction >= 0.4) return 'warning'
  return 'positive'
}

function opportunityTone(fraction: number): SignalTone {
  if (fraction >= 0.6) return 'positive'
  if (fraction >= 0.35) return 'caution'
  return 'critical'
}

const TONE_TEXT: Record<SignalTone, string> = {
  critical: 'text-red-700',
  warning: 'text-orange-700',
  caution: 'text-amber-700',
  positive: 'text-emerald-700',
  neutral: 'text-muted-foreground',
}

const TONE_ICON: Record<SignalTone, string> = {
  critical: 'bg-red-50 text-red-600',
  warning: 'bg-orange-50 text-orange-600',
  caution: 'bg-amber-50 text-amber-700',
  positive: 'bg-emerald-50 text-emerald-700',
  neutral: 'bg-muted text-muted-foreground',
}

const CONFIDENCE_LABELS: Record<string, string> = {
  high: 'بالا',
  medium: 'متوسط',
  low: 'پایین',
}

export function RiskSignalCard({ customerId }: RiskSignalCardProps) {
  const {
    data: customer,
    isLoading,
    isError,
    refetch,
  } = useCustomer(customerId)
  const { data: churn } = useCustomerChurn(customerId)
  const { data: negotiation } = useCustomerNegotiationScore(customerId)

  if (isLoading) return <SectionSkeleton />
  if (isError || !customer) return <ErrorState onRetry={() => refetch()} />

  const retention = negotiation?.pillars.retention
  const recency = resolveRecencyDays(customer)
  const heroFraction = retention?.score ?? 0
  const heroTone = retention ? opportunityTone(heroFraction) : 'neutral'
  const heroValue = retention
    ? `${Number((retention.score * 100).toFixed(1)).toLocaleString('fa-IR')}٪`
    : '—'

  const bullets: Array<{ label: string; value: string; tone: SignalTone }> = []
  if (retention) {
    bullets.push({
      label: 'اطمینان مدل',
      value: CONFIDENCE_LABELS[retention.confidence] ?? retention.confidence,
      tone: retention.confidence === 'high' ? 'positive' : 'caution',
    })
  }
  if (recency != null) {
    bullets.push({
      label: 'آخرین خرید',
      value: `${formatNumber(Math.round(recency))} روز پیش`,
      tone:
        customer.typicalOrderInterval > 0 && recency > customer.typicalOrderInterval
          ? 'critical'
          : 'neutral',
    })
  }
  if (churn) {
    bullets.push({
      label: 'احتمال ریزش',
      value: `${Number((churn.churnProbability * 100).toFixed(1)).toLocaleString('fa-IR')}٪`,
      tone: riskTone(churn.churnProbability),
    })
  }

  return (
    <Card className="h-full gap-0 border-border/50 bg-white py-0 shadow-none ring-1 ring-border/25 [--card-spacing:--spacing(4)]">
      <CardContent className="flex h-full flex-col gap-3 px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
            ریسک و احتمال
          </h2>
          <span
            className={cn(
              'flex size-8 items-center justify-center rounded-lg',
              TONE_ICON[heroTone],
            )}
          >
            <AlertTriangle size={16} aria-hidden />
          </span>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">احتمال حفظ مشتری</p>
          <p
            className={cn(
              'mt-1 text-[2rem] font-bold leading-none tracking-tight tabular-nums',
              TONE_TEXT[heroTone],
            )}
          >
            {heroValue}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {retention?.note ?? 'مدل حفظ مشتری برای این رکورد موجود نیست.'}
          </p>
        </div>

        <ul className="mt-auto space-y-2">
          {bullets.slice(0, 3).map((item) => (
            <li key={item.label} className="flex items-start gap-2 text-xs">
              <SignalDot tone={item.tone} className="mt-1" />
              <span className="text-muted-foreground">
                {item.label}:{' '}
                <span className="font-medium tabular-nums text-card-foreground">
                  {item.value}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
