import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { MetricRow, type SignalTone } from '@/components/crm/customer360/MetricRow'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCustomer } from '@/hooks/crm/useCrmQueries'
import { RISK_LABELS } from '@/lib/constants'
import type { RiskLevel } from '@/types/crm'

interface RiskOverviewProps {
  customerId: string
}

const RISK_TONE: Record<RiskLevel, SignalTone> = {
  low: 'positive',
  medium: 'caution',
  high: 'critical',
}

const REVIEWED_FACTORS: Record<string, string[]> = {
  'ریسک مالی': ['پرداخت معوق', 'تأخیر پرداخت', 'بدهی', 'چک برگشتی'],
  'ریسک رابطه': ['شکایات', 'مشکلات کیفیت', 'تأخیر تحویل', 'رضایت مشتری'],
  'ریسک تجاری': ['کاهش درآمد', 'کاهش فرکانس', 'عدم سفارش مجدد'],
}

export function RiskOverview({ customerId }: RiskOverviewProps) {
  const [showFactors, setShowFactors] = useState(false)
  const { data: customer, isLoading, isError, refetch } = useCustomer(customerId)

  if (isLoading) return <SectionSkeleton />
  if (isError || !customer) return <ErrorState onRetry={() => refetch()} />

  const { risk } = customer
  const rows: Array<{ label: string; level: RiskLevel }> = [
    { label: 'ریسک مالی', level: risk.financial },
    { label: 'ریسک رابطه', level: risk.relationship },
    { label: 'ریسک تجاری', level: risk.commercial },
    { label: 'ریسک کلی', level: risk.overall },
  ]

  return (
    <Card className="h-full [--card-spacing:--spacing(4)]">
      <CardHeader>
        <CardTitle>نمای ریسک</CardTitle>
      </CardHeader>
      <CardContent>
        <div>
          {rows.map((row) => (
            <MetricRow
              key={row.label}
              label={row.label}
              value={RISK_LABELS[row.level]}
              tone={RISK_TONE[row.level]}
              className={row.label === 'ریسک کلی' ? 'font-medium' : undefined}
            />
          ))}
        </div>

        <div className="mt-3 border-t pt-2.5">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 text-start text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setShowFactors((prev) => !prev)}
            aria-expanded={showFactors}
          >
            <span>عوامل بررسی‌شده</span>
            {showFactors ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showFactors && (
            <dl className="mt-2.5 space-y-2 text-xs">
              {Object.entries(REVIEWED_FACTORS).map(([group, factors]) => (
                <div key={group}>
                  <dt className="font-medium text-card-foreground">{group}</dt>
                  <dd className="mt-0.5 text-muted-foreground">
                    {factors.join(' · ')}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
