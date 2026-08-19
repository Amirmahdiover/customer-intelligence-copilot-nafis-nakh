import { AlertTriangle } from 'lucide-react'
import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { useCustomer } from '@/hooks/crm/useCrmQueries'
import { daysSince } from '@/lib/formatters'

interface ReorderSignalProps {
  customerId: string
}

export function ReorderSignal({ customerId }: ReorderSignalProps) {
  const { data: customer, isLoading, isError, refetch } = useCustomer(customerId)

  if (isLoading) return <SectionSkeleton />
  if (isError || !customer) {
    return <ErrorState onRetry={() => refetch()} />
  }

  const daysSinceOrder = daysSince(customer.lastOrderDate)
  const overdueDays = daysSinceOrder - customer.typicalOrderInterval
  const isOverdue = overdueDays > 0

  return (
    <section className={`card reorder-signal ${isOverdue ? 'reorder-signal--overdue' : ''}`}>
      <h2 className="section-title">سفارش مجدد پیش‌بینی‌شده</h2>
      <div className="reorder-signal__grid">
        <div>
          <span className="reorder-label">فاصله معمول</span>
          <span className="reorder-value">{customer.typicalOrderInterval} روز</span>
        </div>
        <div>
          <span className="reorder-label">آخرین سفارش</span>
          <span className="reorder-value">{daysSinceOrder} روز پیش</span>
        </div>
        <div>
          <span className="reorder-label">وضعیت</span>
          {isOverdue ? (
            <span className="reorder-overdue">
              <AlertTriangle size={16} />
              {overdueDays} روز تأخیر در سفارش مجدد
            </span>
          ) : (
            <span className="reorder-ok">
              {customer.typicalOrderInterval - daysSinceOrder} روز تا سفارش بعدی
            </span>
          )}
        </div>
      </div>
    </section>
  )
}
