import { AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { StatusBadge } from '@/components/crm/shared/StatusBadge'
import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { useGlobalInsights } from '@/hooks/crm/useCrmQueries'
import { INSIGHT_SEVERITY_LABELS } from '@/lib/constants'
import type { InsightSeverity } from '@/types/crm'

const SEVERITY_ICONS: Record<
  InsightSeverity,
  typeof Info
> = {
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
    <section className="card insights-panel">
      <h2 className="section-title">بینش‌های مهم</h2>
      <div className="insights-list">
        {data.map((insight) => {
          const Icon = SEVERITY_ICONS[insight.severity]
          return (
            <div key={insight.id} className="insight-item">
              <div className="insight-item__header">
                <Icon size={18} className={`insight-icon insight-icon--${insight.severity}`} />
                <span className="insight-item__title">{insight.title}</span>
                <StatusBadge
                  label={INSIGHT_SEVERITY_LABELS[insight.severity]}
                  variantKey={insight.severity}
                />
              </div>
              <p className="insight-item__message">{insight.message}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
