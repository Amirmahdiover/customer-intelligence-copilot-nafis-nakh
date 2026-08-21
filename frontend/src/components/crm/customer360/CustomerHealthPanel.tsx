import { HeartPulse } from 'lucide-react'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { SignalDot, type SignalTone } from '@/components/crm/customer360/MetricRow'
import { Card, CardContent } from '@/components/ui/card'
import {
  useCustomer,
  useCustomerChurn,
  useCustomerComplaints,
  useCustomerFinancial,
  useCustomerNegotiationScore,
} from '@/hooks/crm/useCrmQueries'
import {
  buildHealthVerdict,
  resolveRecencyDays,
  type HealthLevel,
} from '@/lib/customerNarrative'
import { formatNumber } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface CustomerHealthPanelProps {
  customerId: string
}

const LEVEL_TEXT: Record<HealthLevel, string> = {
  critical: 'text-red-400',
  warning: 'text-amber-400',
  healthy: 'text-emerald-400',
}

const LEVEL_STROKE: Record<HealthLevel, string> = {
  critical: '#DC2626',
  warning: '#D97706',
  healthy: '#10B981',
}

function HealthGauge({
  value,
  level,
}: {
  value: number
  level: HealthLevel
}) {
  const clamped = Math.max(0, Math.min(100, value))
  const radius = 52
  const circumference = Math.PI * radius
  const dash = (clamped / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="84" viewBox="0 0 140 84" aria-hidden>
        <path
          d="M 18 74 A 52 52 0 0 1 122 74"
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M 18 74 A 52 52 0 0 1 122 74"
          fill="none"
          stroke={LEVEL_STROKE[level]}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
      </svg>
      <p className={cn('-mt-8 text-3xl font-bold tabular-nums', LEVEL_TEXT[level])}>
        {formatNumber(Math.round(clamped))}
        <span className="ms-1 text-sm font-medium text-white/70">از ۱۰۰</span>
      </p>
    </div>
  )
}

export function CustomerHealthPanel({ customerId }: CustomerHealthPanelProps) {
  const { data: customer, isLoading, isError, refetch } = useCustomer(customerId)
  const { data: churn } = useCustomerChurn(customerId)
  const { data: negotiation } = useCustomerNegotiationScore(customerId)
  const { data: complaints } = useCustomerComplaints(customerId)
  const { data: financial } = useCustomerFinancial(customerId)

  if (isLoading) return <SectionSkeleton />
  if (isError || !customer) return <ErrorState onRetry={() => refetch()} />

  const verdict = buildHealthVerdict(customer, churn)
  const recency = resolveRecencyDays(customer)
  const score = negotiation?.negotiationScore ?? 0
  const resolvedComplaints =
    complaints?.filter((c) => {
      const status = c.complaint_status.toLowerCase()
      return (
        status.includes('resolved') ||
        status.includes('حل') ||
        status.includes('بسته') ||
        status.includes('closed')
      )
    }).length ?? 0
  const totalComplaints = complaints?.length ?? 0
  const openComplaints = Math.max(0, totalComplaints - resolvedComplaints)

  const paymentTone: SignalTone =
    (customer.avgPaymentDelayDays ?? 0) > 30
      ? 'critical'
      : (customer.avgPaymentDelayDays ?? 0) > 14
        ? 'caution'
        : 'positive'
  const complaintTone: SignalTone =
    openComplaints > 0 ? 'warning' : totalComplaints > 0 ? 'caution' : 'positive'
  const interactionTone: SignalTone =
    recency != null && customer.typicalOrderInterval > 0 && recency > customer.typicalOrderInterval
      ? 'caution'
      : 'positive'

  const details = [
    {
      label: `تعداد شکایات: ${formatNumber(totalComplaints)} (${formatNumber(resolvedComplaints)} حل‌شده، ${formatNumber(openComplaints)} باز)`,
      tone: complaintTone,
    },
    {
      label:
        customer.avgPaymentDelayDays != null
          ? `میانگین تأخیر پرداخت: ${formatNumber(Math.round(customer.avgPaymentDelayDays))} روز`
          : 'میانگین تأخیر پرداخت: —',
      tone: paymentTone,
    },
    {
      label: `چک برگشتی: ${formatNumber(financial?.returnedCheckCount ?? 0)}`,
      tone: (financial?.returnedCheckCount ?? 0) > 0 ? ('critical' as const) : ('positive' as const),
    },
  ]

  return (
    <Card className="h-full gap-0 border-white/15 bg-black py-0 text-white shadow-none ring-1 ring-white/10 [--card-spacing:--spacing(4)]">
      <CardContent className="flex h-full flex-col gap-3 px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <HeartPulse size={16} className="text-red-500" aria-hidden />
            سلامت رابطه
          </h2>
        </div>

        <HealthGauge value={score} level={verdict.level} />
        <p className="text-center text-xs text-white/70">{verdict.headline}</p>

        <div className="flex flex-col gap-2">
          <div className={`rounded px-3 py-2 text-xs text-white ${paymentTone === 'positive' ? 'bg-green-500/25' : 'bg-amber-500/25'}`}>
            خوش‌قولی پرداخت
          </div>
          <div className={`rounded px-3 py-2 text-xs text-white ${interactionTone === 'positive' ? 'bg-green-500/25' : 'bg-yellow-500/25'}`}>
            {interactionTone === 'positive' ? 'تعاملات منظم' : 'تعاملات کم'}
          </div>
          <div className={`rounded px-3 py-2 text-xs text-white ${complaintTone === 'positive' ? 'bg-green-500/25' : 'bg-red-500/25'}`}>
            شکایات: {complaintTone === 'positive' ? 'ندارد' : openComplaints > 0 ? 'متوسط' : 'کم'}
          </div>
        </div>

        <ul className="mt-auto space-y-2">
          {details.map((item) => (
            <li key={item.label} className="flex items-start gap-2 text-xs">
              <SignalDot tone={item.tone} className="mt-1" />
              <span className="text-white/80">{item.label}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
