import { ErrorState } from '@/components/crm/shared/ErrorState'
import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { StatusBadge } from '@/components/crm/shared/StatusBadge'
import { useToast } from '@/components/crm/shared/Toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useCustomerActions, useCustomerCrm } from '@/hooks/crm/useCrmQueries'
import { ACTION_PRIORITY_LABELS, ACTION_TYPE_LABELS } from '@/lib/constants'

interface NextBestActionPanelProps {
  customerId: string
}

export function NextBestActionPanel({ customerId }: NextBestActionPanelProps) {
  const { showToast } = useToast()
  const { data: actions, isLoading, isError, refetch } = useCustomerActions(customerId)
  const { data: crm } = useCustomerCrm(customerId)

  if (isLoading) return <SectionSkeleton />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  if (!actions || actions.length === 0) {
    return (
      <Card className="h-full [--card-spacing:--spacing(4)]">
        <CardContent className="flex h-full flex-col justify-center gap-1">
          <span className="text-xs font-medium tracking-wide text-muted-foreground">
            اقدام بعدی
          </span>
          <p className="text-sm text-muted-foreground">
            اقدام پیشنهادی برای این مشتری ثبت نشده است.
          </p>
        </CardContent>
      </Card>
    )
  }

  const primary = actions.find((a) => a.priority === 'high') ?? actions[0]
  const others = actions.filter((a) => a.id !== primary.id)

  const evidence = [primary.reason]
  if (crm?.nextAction && crm.nextAction !== primary.title) {
    evidence.push(`اقدام ثبت‌شده در CRM: ${crm.nextAction}`)
  }

  return (
    <Card className="h-full border-s-2 border-s-primary bg-accent/30 [--card-spacing:--spacing(3.5)]">
      <CardContent className="flex h-full flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium tracking-wide text-muted-foreground">
            اقدام بعدی
          </span>
          <StatusBadge
            label={`اولویت ${ACTION_PRIORITY_LABELS[primary.priority]}`}
            variantKey={primary.priority}
          />
        </div>

        <h3 className="text-lg font-bold leading-snug text-card-foreground">
          {primary.title}
        </h3>

        <ul className="space-y-1 text-sm leading-relaxed text-muted-foreground">
          {evidence.map((item) => (
            <li key={item} className="flex gap-2">
              <span aria-hidden>·</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          <Button
            type="button"
            onClick={() =>
              showToast(`${ACTION_TYPE_LABELS[primary.type]} — اقدام ثبت شد.`)
            }
          >
            شروع اقدام
          </Button>
          {others.map((action) => (
            <Button
              key={action.id}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                showToast(`${ACTION_TYPE_LABELS[action.type]} — اقدام ثبت شد.`)
              }
            >
              {ACTION_TYPE_LABELS[action.type]}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
