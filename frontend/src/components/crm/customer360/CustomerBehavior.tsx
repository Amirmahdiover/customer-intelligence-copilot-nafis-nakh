import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { useCustomer } from '@/hooks/crm/useCrmQueries'
import { formatCurrency } from '@/lib/formatters'

interface CustomerBehaviorProps {
  customerId: string
}

export function CustomerBehavior({ customerId }: CustomerBehaviorProps) {
  const { data: customer, isLoading, isError, refetch } = useCustomer(customerId)

  if (isLoading) return <SectionSkeleton />
  if (isError || !customer) {
    return <ErrorState onRetry={() => refetch()} />
  }

  const daysSinceOrder = Math.floor(
    (new Date('2026-08-19').getTime() - new Date(customer.lastOrderDate).getTime()) /
      (1000 * 60 * 60 * 24),
  )

  const maxRevenue = Math.max(...customer.revenueTrend.map((r) => r.revenue))

  return (
    <section className="card">
      <h2 className="section-title">رفتار خرید</h2>

      <div className="behavior-stats">
        <div className="behavior-stat">
          <span className="behavior-stat__label">تعداد سفارش</span>
          <span className="behavior-stat__value">{customer.orderCount}</span>
        </div>
        <div className="behavior-stat">
          <span className="behavior-stat__label">فاصله معمول سفارش</span>
          <span className="behavior-stat__value">{customer.typicalOrderInterval} روز</span>
        </div>
        <div className="behavior-stat">
          <span className="behavior-stat__label">فاصله فعلی</span>
          <span className="behavior-stat__value">{daysSinceOrder} روز</span>
        </div>
        <div className="behavior-stat">
          <span className="behavior-stat__label">میانگین سفارش</span>
          <span className="behavior-stat__value">
            {formatCurrency(customer.averageOrderValue)}
          </span>
        </div>
      </div>

      <h3 className="subsection-title">روند درآمد</h3>
      <div className="revenue-chart">
        {customer.revenueTrend.map((point) => (
          <div key={point.month} className="revenue-chart__bar-group">
            <div
              className="revenue-chart__bar"
              style={{ height: `${(point.revenue / maxRevenue) * 100}%` }}
            />
            <span className="revenue-chart__label">{point.month}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
