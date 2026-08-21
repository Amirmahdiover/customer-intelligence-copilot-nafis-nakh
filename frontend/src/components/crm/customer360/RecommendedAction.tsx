import { Zap } from 'lucide-react'
import { StatusBadge } from '@/components/crm/shared/StatusBadge'
import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { EmptyState } from '@/components/crm/shared/EmptyState'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { useToast } from '@/components/crm/shared/Toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
      <Card className="h-full">
        <CardHeader>
          <CardTitle>اقدام پیشنهادی</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState title="اقدام پیشنهادی وجود ندارد" />
        </CardContent>
      </Card>
    )
  }

  const primaryAction = actions.find((a) => a.priority === 'high') ?? actions[0]
  const otherActions = actions.filter((a) => a.id !== primaryAction.id)

  return (
    <Card className="h-full border-primary/25 bg-accent/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap size={18} className="text-primary" />
          اقدام پیشنهادی
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xl font-bold leading-snug text-card-foreground">
            {primaryAction.title}
          </h3>
          <StatusBadge
            label={`اولویت: ${ACTION_PRIORITY_LABELS[primaryAction.priority]}`}
            variantKey={
              primaryAction.priority === 'high'
                ? 'high'
                : primaryAction.priority === 'medium'
                  ? 'medium'
                  : 'low'
            }
          />
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <strong className="text-card-foreground">دلیل: </strong>
          {primaryAction.reason}
        </p>
        <Button
          type="button"
          size="lg"
          className="w-fit"
          onClick={() =>
            showToast(`${ACTION_TYPE_LABELS[primaryAction.type]} — اقدام ثبت شد.`)
          }
        >
          انجام اقدام
        </Button>

        {otherActions.length > 0 && (
          <div>
            <h4 className="mb-1.5 text-xs font-medium text-muted-foreground">
              سایر اقدامات
            </h4>
            <ul className="m-0 flex flex-col gap-1 p-0">
              {otherActions.map((action) => (
                <li key={action.id}>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto px-0 py-0.5"
                    onClick={() =>
                      showToast(`${ACTION_TYPE_LABELS[action.type]} — اقدام ثبت شد.`)
                    }
                  >
                    {ACTION_TYPE_LABELS[action.type]}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
