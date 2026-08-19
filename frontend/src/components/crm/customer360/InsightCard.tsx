import { AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { StatusBadge } from '@/components/crm/shared/StatusBadge'
import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { EmptyState } from '@/components/crm/shared/EmptyState'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { useCustomerInsights } from '@/hooks/crm/useCrmQueries'
import { INSIGHT_SEVERITY_LABELS } from '@/lib/constants'
import type { InsightSeverity } from '@/types/crm'

interface InsightCardProps {
  customerId: string
}

const SEVERITY_ICONS: Record<InsightSeverity, typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertCircle,
}

export function InsightCard({ customerId }: InsightCardProps) {
  const { data: insights, isLoading, isError, refetch } =
    useCustomerInsights(customerId)

  if (isLoading) return <SectionSkeleton />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  if (!insights || insights.length === 0) {
    return (
      <section className="card">
        <h2 className="section-title">بینش‌ها</h2>
        <EmptyState title="بینش جدیدی وجود ندارد" />
      </section>
    )
  }

  return (
    <section className="card">
      <h2 className="section-title">بینش‌ها</h2>
      <div className="insights-list">
        {insights.map((insight) => {
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
