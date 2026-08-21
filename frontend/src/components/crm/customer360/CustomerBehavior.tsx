import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCustomer } from '@/hooks/crm/useCrmQueries'
import { daysSince } from '@/lib/formatters'

interface CustomerBehaviorProps {
  customerId: string
}

export function CustomerBehavior({ customerId }: CustomerBehaviorProps) {
  const { data: customer, isLoading, isError, refetch } = useCustomer(customerId)

  if (isLoading) return <SectionSkeleton />
  if (isError || !customer) {
    return <ErrorState onRetry={() => refetch()} />
  }

  const daysSinceOrder = Math.round(
    customer.recencyDays ?? daysSince(customer.lastOrderDate),
  )
  const maxRevenue = Math.max(...customer.revenueTrend.map((r) => r.revenue), 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle>رفتار خرید</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-2 grid grid-cols-2 gap-4">
          <div className="rounded-md bg-muted p-3">
            <span className="mb-0.5 block text-xs text-muted-foreground">
              فاصله معمول سفارش
            </span>
            <span className="text-base font-bold text-card-foreground">
              {customer.typicalOrderInterval > 0
                ? `${customer.typicalOrderInterval} روز`
                : '—'}
            </span>
          </div>
          <div className="rounded-md bg-muted p-3">
            <span className="mb-0.5 block text-xs text-muted-foreground">
              فاصله فعلی
            </span>
            <span className="text-base font-bold text-card-foreground">
              {daysSinceOrder} روز
            </span>
          </div>
        </div>

        <h3 className="mt-5 mb-3 text-sm font-semibold text-card-foreground">
          روند درآمد
        </h3>
        <div className="flex h-32 items-end gap-3 pt-2">
          {customer.revenueTrend.map((point) => (
            <div
              key={point.month}
              className="flex h-full flex-1 flex-col items-center"
            >
              <div
                className="mt-auto w-full max-w-10 min-h-1 rounded-t bg-primary/85"
                style={{ height: `${(point.revenue / maxRevenue) * 100}%` }}
              />
              <span className="mt-1.5 text-[0.65rem] text-muted-foreground">
                {point.month}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
