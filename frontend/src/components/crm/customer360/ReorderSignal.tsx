import { AlertTriangle } from 'lucide-react'
import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCustomer } from '@/hooks/crm/useCrmQueries'
import { daysSince } from '@/lib/formatters'
import { cn } from '@/lib/utils'

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
    <Card
      className={cn(
        'mb-5',
        isOverdue && 'border-amber-400 bg-amber-50/60',
      )}
    >
      <CardHeader>
        <CardTitle>سفارش مجدد پیش‌بینی‌شده</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <span className="mb-0.5 block text-xs text-muted-foreground">
              فاصله معمول
            </span>
            <span className="font-semibold text-card-foreground">
              {customer.typicalOrderInterval} روز
            </span>
          </div>
          <div>
            <span className="mb-0.5 block text-xs text-muted-foreground">
              آخرین سفارش
            </span>
            <span className="font-semibold text-card-foreground">
              {daysSinceOrder} روز پیش
            </span>
          </div>
          <div>
            <span className="mb-0.5 block text-xs text-muted-foreground">وضعیت</span>
            {isOverdue ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700">
                <AlertTriangle size={16} />
                {overdueDays} روز تأخیر در سفارش مجدد
              </span>
            ) : (
              <span className="text-sm font-semibold text-emerald-600">
                {customer.typicalOrderInterval - daysSinceOrder} روز تا سفارش بعدی
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
