import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { SignalDot, type SignalTone } from '@/components/crm/customer360/MetricRow'
import { Card, CardContent } from '@/components/ui/card'
import {
  useCustomer,
  useCustomerChurn,
  useCustomerNegotiationScore,
} from '@/hooks/crm/useCrmQueries'
import {
  buildHealthVerdict,
  buildRiskReasons,
  resolveRecencyDays,
  type HealthLevel,
} from '@/lib/customerNarrative'
import { formatNumber, formatRelativeDate } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface CustomerHealthPanelProps {
  customerId: string
}

const LEVEL_TONE: Record<HealthLevel, SignalTone> = {
  critical: 'critical',
  warning: 'caution',
  healthy: 'positive',
}

const LEVEL_TEXT: Record<HealthLevel, string> = {
  critical: 'text-red-700',
  warning: 'text-amber-700',
  healthy: 'text-emerald-700',
}

const LEVEL_SURFACE: Record<HealthLevel, string> = {
  critical: 'bg-red-50/70',
  warning: 'bg-amber-50/70',
  healthy: 'bg-emerald-50/70',
}

export function CustomerHealthPanel({ customerId }: CustomerHealthPanelProps) {
  const [showReasons, setShowReasons] = useState(false)
  const { data: customer, isLoading, isError, refetch } = useCustomer(customerId)
  const { data: churn } = useCustomerChurn(customerId)
  const { data: negotiation } = useCustomerNegotiationScore(customerId)

  if (isLoading) return <SectionSkeleton />
  if (isError || !customer) return <ErrorState onRetry={() => refetch()} />

  const verdict = buildHealthVerdict(customer, churn)
  const reasons = buildRiskReasons(customer, churn, negotiation)
  const recency = resolveRecencyDays(customer)

  const facts = [
    {
      label: 'آخرین خرید',
      value: customer.lastOrderDate ? formatRelativeDate(customer.lastOrderDate) : '—',
    },
    {
      label: 'فاصله از خرید',
      value: recency != null ? `${formatNumber(recency)} روز` : '—',
    },
    { label: 'تعداد سفارش', value: formatNumber(customer.orderCount) },
  ]

  return (
    <Card className="h-full [--card-spacing:--spacing(3.5)]">
      <CardContent className="flex h-full flex-col gap-3">
        <div
          className={cn(
            'flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg px-3 py-2.5',
            LEVEL_SURFACE[verdict.level],
          )}
        >
          <span className="flex items-center gap-2">
            <SignalDot tone={LEVEL_TONE[verdict.level]} className="size-2.5" />
            <span className={cn('text-xl font-bold', LEVEL_TEXT[verdict.level])}>
              {verdict.label}
            </span>
          </span>
          <span className="text-sm font-medium tabular-nums text-card-foreground">
            {verdict.headline}
          </span>
        </div>

        <dl className="grid grid-cols-3 gap-3">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className="text-xs text-muted-foreground">{fact.label}</dt>
              <dd className="mt-0.5 text-sm font-semibold tabular-nums text-card-foreground">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-auto">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-start text-sm font-medium transition-colors hover:bg-muted"
            onClick={() => setShowReasons((prev) => !prev)}
            aria-expanded={showReasons}
          >
            <span>چرا سیستم این ارزیابی را داده است؟</span>
            {showReasons ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showReasons && (
            <ul className="mt-2 space-y-1.5 rounded-md bg-muted/50 px-3 py-2.5 text-sm leading-relaxed text-card-foreground">
              {reasons.map((reason) => (
                <li key={reason} className="flex gap-2">
                  <span aria-hidden className="text-muted-foreground">
                    ·
                  </span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
