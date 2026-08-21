import { ErrorState } from '@/components/crm/shared/ErrorState'
import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useCustomer } from '@/hooks/crm/useCrmQueries'
import { resolveRecencyDays } from '@/lib/customerNarrative'
import { formatCurrency, formatNumber } from '@/lib/formatters'

interface BehaviorPanelProps {
  customerId: string
}

export function BehaviorPanel({ customerId }: BehaviorPanelProps) {
  const { data: customer, isLoading, isError, refetch } = useCustomer(customerId)

  if (isLoading) return <SectionSkeleton />
  if (isError || !customer) return <ErrorState onRetry={() => refetch()} />

  const recency = resolveRecencyDays(customer)
  const maxRevenue = Math.max(...customer.revenueTrend.map((r) => r.revenue), 1)

  const facts = [
    {
      label: 'فاصله معمول سفارش',
      value:
        customer.typicalOrderInterval > 0
          ? `${formatNumber(customer.typicalOrderInterval)} روز`
          : '—',
    },
    {
      label: 'فاصله فعلی',
      value: recency != null ? `${formatNumber(Math.round(recency))} روز` : '—',
    },
    { label: 'میانگین سفارش', value: formatCurrency(customer.averageOrderValue) },
  ]

  return (
    <Card className="[--card-spacing:--spacing(4)]">
      <CardHeader>
        <CardTitle>رفتار خرید و محصولات</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <dl className="grid grid-cols-3 gap-3">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="text-xs text-muted-foreground">{fact.label}</dt>
                <dd className="mt-0.5 text-sm font-semibold tabular-nums text-card-foreground">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>

          <h3 className="mt-5 mb-2 text-xs font-medium text-muted-foreground">
            روند درآمد
          </h3>
          {customer.revenueTrend.length === 0 ? (
            <p className="text-sm text-muted-foreground">داده روند درآمد موجود نیست.</p>
          ) : (
            <div className="flex h-24 items-end gap-2">
              {customer.revenueTrend.map((point) => (
                <div
                  key={point.month}
                  className="flex h-full flex-1 flex-col items-center"
                >
                  <div
                    className="mt-auto min-h-0.5 w-full max-w-8 rounded-t bg-primary/70"
                    style={{ height: `${(point.revenue / maxRevenue) * 100}%` }}
                  />
                  <span className="mt-1 text-[0.65rem] text-muted-foreground">
                    {point.month}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">
            ترکیب محصولات
          </h3>
          {customer.favoriteProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">محصولی ثبت نشده است.</p>
          ) : (
            <ul className="space-y-2.5">
              {customer.favoriteProducts.map((product) => (
                <li key={product.name}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-card-foreground">
                      {product.name}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatNumber(product.percentage)}٪
                    </span>
                  </div>
                  <Progress value={product.percentage} className="h-1.5" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
