import { Sparkles } from 'lucide-react'
import { StatusBadge } from '@/components/crm/shared/StatusBadge'
import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCustomerAIAction } from '@/hooks/crm/useCrmQueries'
import { ACTION_PRIORITY_LABELS } from '@/lib/constants'

interface CustomerAIActionProps {
  customerId: string
}

/** Async, independently-loaded AI narration of the rule-based customer
 * baseline. Never changes the underlying decision — only explains it. */
export function CustomerAIAction({ customerId }: CustomerAIActionProps) {
  const { data, isLoading, isError, refetch } = useCustomerAIAction(customerId)

  if (isLoading) return <SectionSkeleton />
  if (isError) return <ErrorState onRetry={() => refetch()} />
  if (!data) return null

  const sourceLabel = data.source === 'openai' ? 'تحلیل هوشمند' : 'جمع‌بندی داده‌های موجود'

  return (
    <Card className="mb-5 border-violet-200 bg-violet-50/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-violet-800">
          <Sparkles size={16} aria-hidden="true" />
          اقدام پیشنهادی هوش مصنوعی
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <StatusBadge label={data.category_label} variantKey={data.priority} />
          <StatusBadge label={`اولویت: ${ACTION_PRIORITY_LABELS[data.priority]}`} variantKey={data.priority} />
        </div>
        <p className="text-sm font-medium text-card-foreground">{data.action}</p>
        <p className="mt-1.5 text-xs text-muted-foreground">
          <span className="font-semibold text-card-foreground">دلیل: </span>
          {data.reason}
        </p>
        <p className="mt-2.5 text-[11px] text-muted-foreground">{sourceLabel}</p>
      </CardContent>
    </Card>
  )
}
