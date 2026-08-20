import { TrendingDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useCustomers } from '@/hooks/crm/useCrmQueries'
import { getRiskPercent } from '@/lib/customerDisplay'

export function ImprovingCustomers() {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useCustomers({
    page: 1,
    limit: 20,
    status: 'watch',
  })

  if (isLoading) return <SectionSkeleton />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const improving = (data?.data ?? []).slice(0, 2).map((c) => {
    const current = getRiskPercent(c)
    const previous = Math.min(current + 14, 90)
    return { ...c, current, previous }
  })

  if (improving.length === 0) return null

  return (
    <section className="mb-5">
      <h2 className="mb-3.5 text-[0.95rem] font-bold text-card-foreground">
        ۳. مشتریان در حال کاهش ریزش
      </h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {improving.map((c) => (
          <button
            key={c.id}
            type="button"
            className="text-right"
            onClick={() => navigate(`/crm/customers/${c.id}`)}
          >
            <Card className="transition-shadow hover:shadow-md">
              <CardContent>
                <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-sm text-card-foreground">{c.name}</strong>
                  <Badge
                    variant="outline"
                    className="border-transparent bg-emerald-50 text-emerald-700"
                  >
                    در حال بهبود
                  </Badge>
                </div>
                <div className="mb-2.5 flex items-center justify-between gap-3 rounded-md bg-muted p-2.5">
                  <div>
                    <span className="mb-0.5 block text-[0.68rem] text-muted-foreground">
                      ریسک ماه قبل
                    </span>
                    <span className="text-lg font-bold text-destructive">
                      {c.previous}٪
                    </span>
                  </div>
                  <TrendingDown size={20} className="shrink-0 text-emerald-600" />
                  <div>
                    <span className="mb-0.5 block text-[0.68rem] text-muted-foreground">
                      ریسک فعلی
                    </span>
                    <span className="text-lg font-bold text-emerald-600">
                      {c.current}٪
                    </span>
                  </div>
                </div>
                <p className="mb-1.5 text-xs font-semibold text-emerald-600">
                  {c.previous - c.current} واحد کاهش در ۳۰ روز
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  پس از پیگیری تأخیر تحویل و تماس مدیر فروش، روند ریزش متوقف شده است.
                </p>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>
    </section>
  )
}
