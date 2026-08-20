import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useCustomers } from '@/hooks/crm/useCrmQueries'
import { formatCurrency } from '@/lib/formatters'

const PRODUCT_PENETRATION = [
  { name: 'محصول اصلی A', percent: 89 },
  { name: 'خدمات نصب', percent: 17 },
  { name: 'قطعات یدکی C', percent: 31 },
  { name: 'بسته‌بندی صنعتی B', percent: 22 },
]

export function GrowthOpportunity() {
  const { data, isLoading, isError, refetch } = useCustomers({
    page: 1,
    limit: 50,
    sortField: 'revenue',
    sortDirection: 'desc',
  })

  if (isLoading) return <SectionSkeleton />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const opportunities = (data?.data ?? [])
    .filter((c) => c.status !== 'high-risk')
    .slice(0, 4)
    .map((c, i) => ({
      id: c.id,
      name: c.name,
      potential: i < 2 ? 'high' : 'medium',
      note:
        i === 0
          ? 'پتانسیل افزایش سهم سبد — فقط یک محصول اصلی خریداری شده'
          : i === 1
            ? 'فرصت cross-sell — خدمات نصب پیشنهاد شود'
            : 'رشد تدریجی — افزایش فرکانس سفارش',
      revenue: c.totalRevenue,
    }))

  return (
    <section className="mb-5">
      <h2 className="mb-3.5 text-[0.95rem] font-bold text-card-foreground">
        ۲. تحلیل فرصت رشد
      </h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">فرصت از سمت مشتری</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3.5 flex gap-4 text-xs text-muted-foreground">
              <span className="rounded-full bg-muted px-2.5 py-1">
                {opportunities.length} مشتری
              </span>
              <span className="rounded-full bg-muted px-2.5 py-1">
                {PRODUCT_PENETRATION.length} محصول
              </span>
            </div>
            <div className="flex flex-col gap-2.5">
              {opportunities.map((item) => (
                <div
                  key={item.id}
                  className="rounded-md border bg-muted/50 p-3"
                >
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-sm text-card-foreground">
                      {item.name}
                    </strong>
                    <Badge
                      variant="outline"
                      className={
                        item.potential === 'high'
                          ? 'border-transparent bg-emerald-50 text-emerald-700'
                          : 'border-transparent bg-amber-50 text-amber-700'
                      }
                    >
                      {item.potential === 'high' ? 'پتانسیل بالا' : 'پتانسیل متوسط'}
                    </Badge>
                  </div>
                  <p className="mb-1 text-xs leading-relaxed">{item.note}</p>
                  <span className="text-[0.72rem] text-muted-foreground">
                    درآمد: {formatCurrency(item.revenue)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">فرصت از سمت محصول</CardTitle>
            <p className="text-xs text-muted-foreground">
              نفوذ در بازار — درصد مشتریان فعال
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {PRODUCT_PENETRATION.map((p) => (
              <div key={p.name}>
                <div className="mb-1 flex justify-between text-sm text-card-foreground">
                  <span>{p.name}</span>
                  <span>{p.percent}٪</span>
                </div>
                <Progress
                  value={p.percent}
                  className="[&_[data-slot=progress-indicator]]:bg-stone-500"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
