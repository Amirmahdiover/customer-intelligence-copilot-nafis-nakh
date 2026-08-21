import { Sparkles } from 'lucide-react'
import { StatusBadge } from '@/components/crm/shared/StatusBadge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCustomerAIAction } from '@/hooks/crm/useCrmQueries'
import { ACTION_PRIORITY_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface CustomerAIActionProps {
  customerId: string
  /** Render inside NextBestActionPanel instead of a standalone card. */
  variant?: 'card' | 'embedded'
}

function CustomerAIActionSkeleton({ embedded }: { embedded: boolean }) {
  if (embedded) {
    return (
      <div className="space-y-2 border-t border-violet-200/70 pt-3">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    )
  }

  return (
    <Card className="gap-0 py-0 [--card-spacing:--spacing(3.5)]">
      <CardContent className="py-3.5">
        <Skeleton className="mb-2 h-3.5 w-32" />
        <Skeleton className="mb-2 h-4 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </CardContent>
    </Card>
  )
}

function CustomerAIActionBody({
  categoryLabel,
  priority,
  action,
  reason,
  sourceLabel,
}: {
  categoryLabel: string
  priority: 'low' | 'medium' | 'high'
  action: string
  reason: string
  sourceLabel: string
}) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-800">
          <Sparkles size={14} aria-hidden="true" />
          تحلیل هوش مصنوعی
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge label={categoryLabel} variantKey={priority} />
          <StatusBadge
            label={`اولویت ${ACTION_PRIORITY_LABELS[priority]}`}
            variantKey={priority}
          />
        </div>
      </div>

      <p className="text-sm font-semibold leading-snug text-card-foreground">{action}</p>

      <p className="text-xs leading-relaxed text-muted-foreground">
        <span className="font-medium text-card-foreground">دلیل: </span>
        {reason}
      </p>

      <p className="text-[11px] text-violet-700/70">{sourceLabel}</p>
    </>
  )
}

/** Async, independently-loaded AI narration of the rule-based customer
 * baseline. Never changes the underlying decision — only explains it. */
export function CustomerAIAction({
  customerId,
  variant = 'card',
}: CustomerAIActionProps) {
  const { data, isLoading, isError, refetch } = useCustomerAIAction(customerId)
  const embedded = variant === 'embedded'

  if (isLoading) return <CustomerAIActionSkeleton embedded={embedded} />

  if (isError) {
    if (embedded) {
      return (
        <div className="mt-1 space-y-2 border-t border-violet-200/70 pt-3 text-center">
          <p className="text-xs text-destructive">تحلیل هوش مصنوعی بارگذاری نشد.</p>
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
            تلاش مجدد
          </Button>
        </div>
      )
    }

    return (
      <Card className="gap-0 py-0 [--card-spacing:--spacing(3.5)]">
        <CardContent className="space-y-3 py-3.5 text-center">
          <p className="text-sm text-destructive">تحلیل هوش مصنوعی بارگذاری نشد.</p>
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
            تلاش مجدد
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const sourceLabel =
    data.source === 'openai' ? 'تحلیل هوشمند' : 'جمع‌بندی داده‌های موجود'

  const body = (
    <CustomerAIActionBody
      categoryLabel={data.category_label}
      priority={data.priority}
      action={data.action}
      reason={data.reason}
      sourceLabel={sourceLabel}
    />
  )

  if (embedded) {
    return (
      <div
        className={cn(
          'mt-1 space-y-2 border-t border-violet-200/70 bg-violet-50/50 pt-3',
          '-mx-(--card-spacing) px-(--card-spacing) pb-0.5',
        )}
      >
        {body}
      </div>
    )
  }

  return (
    <Card className="gap-0 border-violet-200/80 bg-violet-50/40 py-0 [--card-spacing:--spacing(3.5)] ring-violet-200/50">
      <CardContent className="flex flex-col gap-2 py-3.5">{body}</CardContent>
    </Card>
  )
}
