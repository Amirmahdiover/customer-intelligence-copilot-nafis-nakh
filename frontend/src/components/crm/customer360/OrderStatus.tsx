import { AlertTriangle } from 'lucide-react'
import { OrderTimeline } from '@/components/crm/customer360/OrderTimeline'
import { OrderSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { EmptyState } from '@/components/crm/shared/EmptyState'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { StatusBadge } from '@/components/crm/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
      <Card>
        <CardHeader>
          <CardTitle>سفارش فعلی</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="بدون سفارش فعال"
            description="این مشتری در حال حاضر سفارش فعالی ندارد."
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>سفارش فعلی</CardTitle>
        {activeOrder.delayDays && activeOrder.delayDays > 0 && (
          <Badge variant="destructive" className="gap-1.5">
            <AlertTriangle size={14} />
            {activeOrder.delayDays} روز تأخیر
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div>
            <span className="mb-0.5 block text-xs text-muted-foreground">
              شماره سفارش
            </span>
            <span className="text-sm font-semibold text-card-foreground">
              {activeOrder.orderNumber}
            </span>
          </div>
          <div>
            <span className="mb-0.5 block text-xs text-muted-foreground">محصول</span>
            <span className="text-sm font-semibold text-card-foreground">
              {activeOrder.product}
            </span>
          </div>
          <div>
            <span className="mb-0.5 block text-xs text-muted-foreground">مقدار</span>
            <span className="text-sm font-semibold text-card-foreground">
              {activeOrder.quantity.toLocaleString('fa-IR')} {activeOrder.quantityUnit}
            </span>
          </div>
          <div>
            <span className="mb-0.5 block text-xs text-muted-foreground">وضعیت</span>
            <StatusBadge
              label={ORDER_STATUS_LABELS[activeOrder.status]}
              variantKey={
                activeOrder.status === 'delayed'
                  ? 'overdue'
                  : activeOrder.status === 'in-production'
                    ? 'pending'
                    : 'healthy'
              }
            />
          </div>
          <div>
            <span className="mb-0.5 block text-xs text-muted-foreground">
              تاریخ ثبت
            </span>
            <span className="text-sm font-semibold text-card-foreground">
              {formatDate(activeOrder.createdDate)}
            </span>
          </div>
          <div>
            <span className="mb-0.5 block text-xs text-muted-foreground">
              تاریخ تعهد
            </span>
            <span className="text-sm font-semibold text-card-foreground">
              {formatDate(activeOrder.promisedDate)}
            </span>
          </div>
        </div>

        <OrderTimeline currentStep={activeOrder.currentStep} timeline={activeOrder.timeline} />
      </CardContent>
    </Card>
  )
}
