import { ErrorState } from '@/components/crm/shared/ErrorState'
import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { useToast } from '@/components/crm/shared/Toast'
import { StatusBadge } from '@/components/crm/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  useCustomerActions,
  useCustomerAIAction,
  useCustomerCrm,
} from '@/hooks/crm/useCrmQueries'
import { ACTION_PRIORITY_LABELS, ACTION_TYPE_LABELS } from '@/lib/constants'

interface NextBestActionPanelProps {
  customerId: string
}

export function NextBestActionPanel({ customerId }: NextBestActionPanelProps) {
  const { showToast } = useToast()
  const {
    data: aiAction,
    isLoading: aiLoading,
    isError: aiError,
    refetch: refetchAi,
  } = useCustomerAIAction(customerId)
  const { data: actions } = useCustomerActions(customerId)
  const { data: crm } = useCustomerCrm(customerId)

  if (aiLoading) return <SectionSkeleton />

  const primary = actions?.find((item) => item.priority === 'high') ?? actions?.[0]
  const actionText = aiAction?.action ?? primary?.title ?? crm?.nextAction
  const reason = aiAction?.reason ?? primary?.reason
  const priority = aiAction?.priority ?? primary?.priority ?? 'medium'

  if (!actionText && aiError) {
    return <ErrorState message="پیشنهاد هوش مصنوعی بارگذاری نشد." onRetry={() => refetchAi()} />
  }

  if (!actionText) {
    return (
      <section className="rounded-lg border border-orange-300 bg-orange-50 p-6">
        <p className="text-sm text-muted-foreground">اقدام پیشنهادی برای این مشتری ثبت نشده است.</p>
      </section>
    )
  }

  return (
    <section className="rounded-lg border border-orange-300 bg-orange-50 p-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-800">
          <span aria-hidden>🤖</span>
          پیشنهاد هوش مصنوعی
        </span>
        {aiAction?.category_label ? (
          <StatusBadge label={aiAction.category_label} variantKey={priority} />
        ) : null}
        <StatusBadge
          label={`اولویت ${ACTION_PRIORITY_LABELS[priority]}`}
          variantKey={priority}
        />
      </div>

      <h2 className="text-lg font-semibold text-black">{actionText}</h2>

      {reason ? (
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">
          <span className="font-medium text-neutral-800">دلیل: </span>
          {reason}
        </p>
      ) : null}

      {primary ? (
        <p className="mt-3 text-sm text-neutral-800">
          <span className="font-medium">اقدام پیشنهادی: </span>
          {ACTION_TYPE_LABELS[primary.type]}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="bg-neutral-100 text-black"
          onClick={() => showToast('وظیفه جدید ایجاد شد.')}
        >
          ایجاد وظیفه
        </Button>
        <Button
          type="button"
          className="bg-black text-white hover:bg-neutral-800"
          onClick={() => showToast('تماس با مشتری ثبت شد.')}
        >
          شروع تماس
        </Button>
      </div>
    </section>
  )
}
