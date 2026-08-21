import { RefreshCw } from 'lucide-react'
import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { EmptyState } from '@/components/crm/shared/EmptyState'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PredictionMeter, type PredictionTone } from '@/components/crm/customer360/PredictionMeter'
import { useCustomer } from '@/hooks/crm/useCrmQueries'
import { SNAPSHOT_DATE } from '@/lib/constants'
import { daysSince } from '@/lib/formatters'

interface ReorderSignalProps {
  customerId: string
}

function roundDays(value: number): number {
  return Math.round(value)
}

export function ReorderSignal({ customerId }: ReorderSignalProps) {
  const { data: customer, isLoading, isError, refetch } = useCustomer(customerId)

  if (isLoading) return <SectionSkeleton />
  if (isError || !customer) {
    return <ErrorState onRetry={() => refetch()} />
  }

  const recencyDays =
    customer.recencyDays ??
    (customer.lastOrderDate ? daysSince(customer.lastOrderDate) : null)
  const daysUntil = customer.daysUntilExpectedNextOrder
  const interval = customer.typicalOrderInterval
  const canScorePattern = daysUntil != null && interval > 0
  const recency = recencyDays != null ? roundDays(recencyDays) : null

  if (!canScorePattern && recency == null) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw size={18} className="text-primary" />
            سفارش مجدد پیش‌بینی‌شده
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState title="الگوی سفارش تا اسنپ‌شات قابل محاسبه نیست" />
        </CardContent>
      </Card>
    )
  }

  const isOverdue = canScorePattern && daysUntil < 0
  const highlightedDays = canScorePattern
    ? roundDays(Math.abs(daysUntil))
    : (recency as number)
  const cyclePct =
    canScorePattern && recency != null
      ? Math.min(100, Math.max(0, (recency / interval) * 100))
      : recency != null && recency > 0
        ? Math.min(100, recency)
        : 0
  const tone: PredictionTone = !canScorePattern
    ? 'default'
    : isOverdue
      ? highlightedDays > interval
        ? 'danger'
        : 'warning'
      : 'success'

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw size={18} className="text-primary" />
          سفارش مجدد پیش‌بینی‌شده
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <PredictionMeter
          value={cyclePct}
          displayValue={`${highlightedDays} روز`}
          label={
            !canScorePattern
              ? 'از آخرین سفارش تا اسنپ‌شات'
              : isOverdue
                ? 'تأخیر نسبت به الگوی سفارش'
                : 'تا موعد معمول سفارش'
          }
          modelLabel="سیگنال سفارش مجدد"
          tone={tone}
          caption={
            !canScorePattern
              ? `فاصله معمول سفارش برای این مشتری تا اسنپ‌شات ${SNAPSHOT_DATE} قابل محاسبه نیست.`
              : isOverdue
                ? `نسبت به الگوی خود مشتری، تا اسنپ‌شات ${SNAPSHOT_DATE} از موعد گذشته است.`
                : `نسبت به الگوی خود مشتری، تا اسنپ‌شات ${SNAPSHOT_DATE} هنوز در بازه معمول است.`
          }
        />
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="mb-0.5 block text-xs text-muted-foreground">
              فاصله معمول
            </span>
            <span className="font-semibold text-card-foreground">
              {interval > 0 ? `${interval} روز` : '—'}
            </span>
          </div>
          <div>
            <span className="mb-0.5 block text-xs text-muted-foreground">
              آخرین سفارش
            </span>
            <span className="font-semibold text-card-foreground">
              {recency != null ? `${recency} روز پیش` : '—'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
