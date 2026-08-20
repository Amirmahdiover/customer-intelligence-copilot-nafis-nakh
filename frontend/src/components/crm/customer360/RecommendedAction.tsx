import { Zap } from 'lucide-react'
import { StatusBadge } from '@/components/crm/shared/StatusBadge'
import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { EmptyState } from '@/components/crm/shared/EmptyState'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { useToast } from '@/components/crm/shared/Toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
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
      <Card className="mb-5">
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

  return (
    <Card className="mb-5">
      <CardHeader>
        <CardTitle>اقدام پیشنهادی</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-primary/20 bg-accent p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Zap size={20} className="text-primary" />
            <h3 className="text-base font-bold text-card-foreground">
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
          <p className="mb-4 text-sm leading-relaxed">
            <strong>دلیل:</strong> {primaryAction.reason}
          </p>
          <Button
            type="button"
            size="lg"
            onClick={() =>
              showToast(`${ACTION_TYPE_LABELS[primaryAction.type]} — اقدام ثبت شد.`)
            }
          >
            انجام اقدام
          </Button>
        </div>

        {actions.length > 1 && (
          <div className="mt-4">
            <Separator className="mb-4" />
            <h4 className="mb-2 text-sm text-muted-foreground">سایر اقدامات</h4>
            <ul className="m-0 list-none p-0">
              {actions
                .filter((a) => a.id !== primaryAction.id)
                .map((action) => (
                  <li key={action.id}>
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto px-0 py-1.5"
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
