import { AlertTriangle } from 'lucide-react'
import { OrderTimeline } from '@/components/crm/customer360/OrderTimeline'
import { OrderSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { EmptyState } from '@/components/crm/shared/EmptyState'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { StatusBadge } from '@/components/crm/shared/StatusBadge'
import { useCustomerOrders } from '@/hooks/crm/useCrmQueries'
import { ORDER_STATUS_LABELS } from '@/lib/constants'
import { formatDate } from '@/lib/formatters'

interface OrderStatusProps {
  customerId: string
}

export function OrderStatusSection({ customerId }: OrderStatusProps) {
  const { data: orders, isLoading, isError, refetch } =
    useCustomerOrders(customerId)

  if (isLoading) return <OrderSkeleton />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const activeOrder = orders?.find((o) => o.isActive)

  if (!activeOrder) {
    return (
      <section className="card">
        <h2 className="section-title">سفارش فعلی</h2>
        <EmptyState
          title="بدون سفارش فعال"
          description="این مشتری در حال حاضر سفارش فعالی ندارد."
        />
      </section>
    )
  }

  return (
    <section className="card order-card">
      <div className="order-card__header">
        <h2 className="section-title">سفارش فعلی</h2>
        {activeOrder.delayDays && activeOrder.delayDays > 0 && (
          <div className="order-delay-badge">
            <AlertTriangle size={16} />
            {activeOrder.delayDays} روز تأخیر
          </div>
        )}
      </div>

      <div className="order-card__grid">
        <div>
          <span className="order-label">شماره سفارش</span>
          <span className="order-value">{activeOrder.orderNumber}</span>
        </div>
        <div>
          <span className="order-label">محصول</span>
          <span className="order-value">{activeOrder.product}</span>
        </div>
        <div>
          <span className="order-label">مقدار</span>
          <span className="order-value">
            {activeOrder.quantity.toLocaleString('fa-IR')} {activeOrder.quantityUnit}
          </span>
        </div>
        <div>
          <span className="order-label">وضعیت</span>
          <StatusBadge
            label={ORDER_STATUS_LABELS[activeOrder.status]}
            variantKey={
              activeOrder.status === 'delayed' ? 'overdue' : activeOrder.status === 'in-production' ? 'pending' : 'healthy'
            }
          />
        </div>
        <div>
          <span className="order-label">تاریخ ثبت</span>
          <span className="order-value">{formatDate(activeOrder.createdDate)}</span>
        </div>
        <div>
          <span className="order-label">تاریخ تعهد</span>
          <span className="order-value">{formatDate(activeOrder.promisedDate)}</span>
        </div>
      </div>

      <OrderTimeline currentStep={activeOrder.currentStep} timeline={activeOrder.timeline} />
    </section>
  )
}
