import { Zap } from 'lucide-react'
import { StatusBadge } from '@/components/crm/shared/StatusBadge'
import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { EmptyState } from '@/components/crm/shared/EmptyState'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { useToast } from '@/components/crm/shared/Toast'
import { useCustomerActions } from '@/hooks/crm/useCrmQueries'
import {
  ACTION_PRIORITY_LABELS,
  ACTION_TYPE_LABELS,
} from '@/lib/constants'

interface RecommendedActionProps {
  customerId: string
}

export function RecommendedAction({ customerId }: RecommendedActionProps) {
  const { showToast } = useToast()
  const { data: actions, isLoading, isError, refetch } =
    useCustomerActions(customerId)

  if (isLoading) return <SectionSkeleton />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  if (!actions || actions.length === 0) {
    return (
      <section className="card">
        <h2 className="section-title">اقدام پیشنهادی</h2>
        <EmptyState title="اقدام پیشنهادی وجود ندارد" />
      </section>
    )
  }

  const primaryAction = actions.find((a) => a.priority === 'high') ?? actions[0]

  return (
    <section className="card action-card">
      <h2 className="section-title">اقدام پیشنهادی</h2>

      <div className="action-card__primary">
        <div className="action-card__header">
          <Zap size={20} className="action-card__icon" />
          <h3>{primaryAction.title}</h3>
          <StatusBadge
            label={`اولویت: ${ACTION_PRIORITY_LABELS[primaryAction.priority]}`}
            variantKey={primaryAction.priority === 'high' ? 'high' : primaryAction.priority === 'medium' ? 'medium' : 'low'}
          />
        </div>
        <p className="action-card__reason">
          <strong>دلیل:</strong> {primaryAction.reason}
        </p>
        <button
          type="button"
          className="btn btn--primary btn--lg"
          onClick={() =>
            showToast(`${ACTION_TYPE_LABELS[primaryAction.type]} — اقدام ثبت شد.`)
          }
        >
          انجام اقدام
        </button>
      </div>

      {actions.length > 1 && (
        <div className="action-card__others">
          <h4>سایر اقدامات</h4>
          <ul>
            {actions
              .filter((a) => a.id !== primaryAction.id)
              .map((action) => (
                <li key={action.id}>
                  <button
                    type="button"
                    className="action-link"
                    onClick={() =>
                      showToast(`${ACTION_TYPE_LABELS[action.type]} — اقدام ثبت شد.`)
                    }
                  >
                    {ACTION_TYPE_LABELS[action.type]}
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}
    </section>
  )
}
