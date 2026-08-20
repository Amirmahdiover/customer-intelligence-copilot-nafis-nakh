import { AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { StatusBadge } from '@/components/crm/shared/StatusBadge'
import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useGlobalInsights } from '@/hooks/crm/useCrmQueries'
import { INSIGHT_SEVERITY_LABELS } from '@/lib/constants'
import type { InsightSeverity } from '@/types/crm'
import { cn } from '@/lib/utils'

const SEVERITY_ICONS: Record<InsightSeverity, typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertCircle,
}

export function ImportantInsights() {
  const { data, isLoading, isError, refetch } = useGlobalInsights()

  if (isLoading) return <SectionSkeleton />
  if (isError) return <ErrorState onRetry={() => refetch()} />
  if (!data || data.length === 0) return null

  return (
    <Card className="mb-5">
      <CardHeader>
        <CardTitle>بینش‌های مهم</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {data.map((insight) => {
          const Icon = SEVERITY_ICONS[insight.severity]
          return (
            <div key={insight.id} className="rounded-md border bg-muted/50 p-3.5">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <Icon
                  size={18}
                  className={cn(
                    insight.severity === 'info' && 'text-sky-600',
                    insight.severity === 'warning' && 'text-amber-600',
                    insight.severity === 'critical' && 'text-destructive',
                  )}
                />
                <span className="text-sm font-semibold text-card-foreground">
                  {insight.title}
                </span>
                <StatusBadge
                  label={INSIGHT_SEVERITY_LABELS[insight.severity]}
                  variantKey={insight.severity}
                />
              </div>
              <p className="text-sm leading-relaxed">{insight.message}</p>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
