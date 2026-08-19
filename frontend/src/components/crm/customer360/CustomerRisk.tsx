import { StatusBadge } from '@/components/crm/shared/StatusBadge'
import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { ErrorState } from '@/components/crm/shared/ErrorState'
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
    <section className="card">
      <h2 className="section-title">تحلیل ریسک</h2>

      <div className="risk-categories">
        <div className="risk-category">
          <div className="risk-category__header">
            <span>ریسک مالی</span>
            <StatusBadge label={RISK_LABELS[risk.financial]} variantKey={risk.financial} />
          </div>
          <ul className="risk-factors">
            {FINANCIAL_FACTORS.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>

        <div className="risk-category">
          <div className="risk-category__header">
            <span>ریسک رابطه</span>
            <StatusBadge label={RISK_LABELS[risk.relationship]} variantKey={risk.relationship} />
          </div>
          <ul className="risk-factors">
            {RELATIONSHIP_FACTORS.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>

        <div className="risk-category">
          <div className="risk-category__header">
            <span>ریسک تجاری</span>
            <StatusBadge label={RISK_LABELS[risk.commercial]} variantKey={risk.commercial} />
          </div>
          <ul className="risk-factors">
            {COMMERCIAL_FACTORS.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="risk-overall">
        <span>ریسک کلی</span>
        <StatusBadge
          label={RISK_LABELS[risk.overall].toUpperCase()}
          variantKey={risk.overall}
        />
      </div>
    </section>
  )
}
