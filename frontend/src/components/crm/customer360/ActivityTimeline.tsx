import { ErrorState } from '@/components/crm/shared/ErrorState'
import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { SignalDot, type SignalTone } from '@/components/crm/customer360/MetricRow'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  useCustomer,
  useCustomerActions,
  useCustomerCrmInteractions,
  useCustomerFinancial,
} from '@/hooks/crm/useCrmQueries'
import { buildTimeline, type TimelineTone } from '@/lib/customerNarrative'
import { formatDate, formatRelativeDate } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface ActivityTimelineProps {
  customerId: string
  /** Overview shows only the most recent events; the Activity tab shows all. */
  compact?: boolean
}

const COMPACT_LIMIT = 4

const TONE_MAP: Record<TimelineTone, SignalTone> = {
  positive: 'positive',
  warning: 'caution',
  critical: 'critical',
  neutral: 'neutral',
  future: 'neutral',
}

export function ActivityTimeline({ customerId, compact }: ActivityTimelineProps) {
  const { data: customer, isLoading, isError, refetch } = useCustomer(customerId)
  const { data: interactions } = useCustomerCrmInteractions(customerId, true)
  const { data: financial } = useCustomerFinancial(customerId)
  const { data: actions } = useCustomerActions(customerId)

  if (isLoading) return <SectionSkeleton />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const allEvents = buildTimeline({ customer, interactions, financial, actions })
  const events = compact ? allEvents.slice(0, COMPACT_LIMIT) : allEvents
  const hiddenCount = allEvents.length - events.length

  return (
    <Card className="h-full [--card-spacing:--spacing(3.5)]">
      <CardHeader>
        <CardTitle>{compact ? 'آخرین فعالیت‌ها' : 'تاریخچه فعالیت'}</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">رویداد ثبت‌شده‌ای وجود ندارد.</p>
        ) : (
          <ol className="space-y-0">
            {events.map((event, index) => {
              const isLast = index === events.length - 1
              return (
                <li key={event.id} className="grid grid-cols-[auto_1fr] gap-x-3">
                  <div className="flex flex-col items-center pt-1.5">
                    <SignalDot
                      tone={TONE_MAP[event.tone]}
                      className={cn(
                        event.tone === 'future' &&
                          'bg-transparent ring-1 ring-muted-foreground/50',
                      )}
                    />
                    {!isLast && <span className="w-px flex-1 bg-border" />}
                  </div>
                  <div className={cn('min-w-0', isLast ? 'pb-0' : 'pb-4')}>
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-sm font-medium text-card-foreground">
                        {event.title}
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {event.tone === 'future'
                          ? formatDate(event.date)
                          : formatRelativeDate(event.date)}
                      </span>
                    </div>
                    {event.detail ? (
                      <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                        {event.detail}
                      </p>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ol>
        )}

        {hiddenCount > 0 && (
          <p className="mt-3 border-t pt-2.5 text-xs text-muted-foreground">
            {hiddenCount.toLocaleString('fa-IR')} رویداد دیگر در تب «فعالیت»
          </p>
        )}
      </CardContent>
    </Card>
  )
}
