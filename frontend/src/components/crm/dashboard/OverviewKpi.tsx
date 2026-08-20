import { Users, AlertTriangle, TrendingDown, PieChart } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { KpiSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { useCrmOverview, useCustomers } from '@/hooks/crm/useCrmQueries'
import { formatNumber } from '@/lib/formatters'
import { cn } from '@/lib/utils'

export function OverviewKpi() {
  const { data, isLoading, isError, refetch } = useCrmOverview()
  const { data: customers } = useCustomers({ page: 1, limit: 100 })

  if (isLoading) return <KpiSkeleton />
  if (isError || !data) {
    return <ErrorState onRetry={() => refetch()} />
  }

  const improvingCount =
    customers?.data.filter((c) => c.status === 'watch').length ?? 0

  const totalRev = customers?.data.reduce((s, c) => s + c.totalRevenue, 0) ?? 1
  const topRev = Math.max(...(customers?.data.map((c) => c.totalRevenue) ?? [0]))
  const portfolioDependency = Math.round((topRev / totalRev) * 100)

  const cards = [
    {
      title: 'مشتریان فعال',
      value: formatNumber(data.activeCustomers),
      icon: Users,
      tone: 'neutral' as const,
    },
    {
      title: 'مشتریان پرریسک',
      value: formatNumber(data.atRiskCustomers),
      icon: AlertTriangle,
      tone: 'danger' as const,
    },
    {
      title: 'در حال کاهش ریزش',
      value: formatNumber(improvingCount),
      icon: TrendingDown,
      tone: 'success' as const,
    },
    {
      title: 'وابستگی پرتفوی به یک مشتری',
      value: `${portfolioDependency}٪`,
      icon: PieChart,
      tone: portfolioDependency > 30 ? ('danger' as const) : ('neutral' as const),
    },
  ]

  return (
    <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title} className="py-4">
            <CardContent className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Icon size={18} />
              </div>
              <div>
                <span className="mb-0.5 block text-xs text-muted-foreground">
                  {card.title}
                </span>
                <span
                  className={cn(
                    'text-[1.35rem] font-bold text-card-foreground',
                    card.tone === 'danger' && 'text-destructive',
                    card.tone === 'success' && 'text-emerald-600',
                  )}
                >
                  {card.value}
                </span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
