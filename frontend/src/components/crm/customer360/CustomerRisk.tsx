import { StatusBadge } from '@/components/crm/shared/StatusBadge'
import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCustomer } from '@/hooks/crm/useCrmQueries'
import { RISK_LABELS } from '@/lib/constants'

interface CustomerRiskProps {
  customerId: string
}

const FINANCIAL_FACTORS = ['پرداخت معوق', 'تأخیر پرداخت', 'بدهی', 'چک برگشتی']
const RELATIONSHIP_FACTORS = ['شکایات', 'مشکلات کیفیت', 'تأخیر تحویل', 'رضایت مشتری']
const COMMERCIAL_FACTORS = ['کاهش درآمد', 'کاهش فرکانس', 'عدم سفارش مجدد']

export function CustomerRisk({ customerId }: CustomerRiskProps) {
  const { data: customer, isLoading, isError, refetch } = useCustomer(customerId)

  if (isLoading) return <SectionSkeleton />
  if (isError || !customer) {
    return <ErrorState onRetry={() => refetch()} />
  }

  const { risk } = customer

  return (
    <Card className="mb-5">
      <CardHeader>
        <CardTitle>تحلیل ریسک</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-md border bg-muted/50 p-3.5">
            <div className="mb-2 flex items-center justify-between text-sm font-semibold text-card-foreground">
              <span>ریسک مالی</span>
              <StatusBadge label={RISK_LABELS[risk.financial]} variantKey={risk.financial} />
            </div>
            <ul className="m-0 list-disc pr-4 text-xs text-muted-foreground">
              {FINANCIAL_FACTORS.map((f) => (
                <li key={f} className="py-0.5">{f}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-md border bg-muted/50 p-3.5">
            <div className="mb-2 flex items-center justify-between text-sm font-semibold text-card-foreground">
              <span>ریسک رابطه</span>
              <StatusBadge label={RISK_LABELS[risk.relationship]} variantKey={risk.relationship} />
            </div>
            <ul className="m-0 list-disc pr-4 text-xs text-muted-foreground">
              {RELATIONSHIP_FACTORS.map((f) => (
                <li key={f} className="py-0.5">{f}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-md border bg-muted/50 p-3.5">
            <div className="mb-2 flex items-center justify-between text-sm font-semibold text-card-foreground">
              <span>ریسک تجاری</span>
              <StatusBadge label={RISK_LABELS[risk.commercial]} variantKey={risk.commercial} />
            </div>
            <ul className="m-0 list-disc pr-4 text-xs text-muted-foreground">
              {COMMERCIAL_FACTORS.map((f) => (
                <li key={f} className="py-0.5">{f}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md border bg-muted/50 px-4 py-3.5 font-bold text-card-foreground">
          <span>ریسک کلی</span>
          <StatusBadge
            label={RISK_LABELS[risk.overall].toUpperCase()}
            variantKey={risk.overall}
          />
        </div>
      </CardContent>
    </Card>
  )
}
