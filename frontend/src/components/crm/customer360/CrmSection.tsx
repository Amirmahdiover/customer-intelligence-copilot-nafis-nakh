import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { StatusBadge } from '@/components/crm/shared/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  useCustomerCrm,
  useCustomerCrmInteractions,
} from '@/hooks/crm/useCrmQueries'
import { formatDate } from '@/lib/formatters'

interface CrmSectionProps {
  customerId: string
}

function urgencyVariant(
  urgency: string | null,
): 'healthy' | 'medium' | 'high' | 'pending' {
  if (urgency === 'فوری') return 'high'
  if (urgency === 'مهم') return 'medium'
  if (urgency === 'عادی') return 'healthy'
  return 'pending'
}

export function CrmSection({ customerId }: CrmSectionProps) {
  const [expanded, setExpanded] = useState(false)
  const {
    data: latest,
    isLoading,
    isError,
    refetch,
  } = useCustomerCrm(customerId)
  const {
    data: interactions,
    isLoading: listLoading,
    isError: listError,
    refetch: refetchList,
  } = useCustomerCrmInteractions(customerId, expanded)

  if (isLoading) return <SectionSkeleton />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const nextAction = latest?.nextAction
  const hasCrm = Boolean(nextAction || latest?.summaryText)

  return (
    <Card className="mb-5">
      <CardHeader>
        <CardTitle>CRM</CardTitle>
      </CardHeader>
      <CardContent>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-md border border-primary/15 bg-accent/60 p-5 text-right transition-colors hover:bg-accent"
          onClick={() => setExpanded((prev) => !prev)}
        >
          <div>
            <span className="mb-1 block text-sm text-muted-foreground">
              اقدام بعدی
            </span>
            <strong className="text-2xl font-bold leading-snug text-card-foreground">
              {nextAction ?? 'اقدامی ثبت نشده'}
            </strong>
          </div>
          {expanded ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
        </button>

        {expanded && (
          <div className="mt-4 space-y-4">
            {!hasCrm && (
              <p className="text-sm text-muted-foreground">
                برای این مشتری تعامل CRM ثبت نشده است.
              </p>
            )}

            {hasCrm && latest && (
              <div className="rounded-md border bg-muted/40 p-4 text-sm leading-relaxed">
                <div className="mb-3">
                  <span className="mb-1 block text-xs text-muted-foreground">
                    خلاصه تعامل
                  </span>
                  <p className="text-card-foreground">
                    {latest.summaryText ?? '—'}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <span className="mb-1 block text-xs text-muted-foreground">
                      تاریخ آپدیت
                    </span>
                    <span className="font-medium">
                      {latest.updatedAt ? formatDate(latest.updatedAt) : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="mb-1 block text-xs text-muted-foreground">
                      نوع تعامل
                    </span>
                    <span className="font-medium">
                      {latest.interactionType ?? '—'}
                    </span>
                  </div>
                  <div>
                    <span className="mb-1 block text-xs text-muted-foreground">
                      فوریت
                    </span>
                    {latest.urgency ? (
                      <StatusBadge
                        label={latest.urgency}
                        variantKey={urgencyVariant(latest.urgency)}
                      />
                    ) : (
                      <span className="font-medium">—</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {listLoading && <SectionSkeleton />}
            {listError && <ErrorState onRetry={() => refetchList()} />}
            {!listLoading &&
              !listError &&
              interactions &&
              interactions.length > 1 && (
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-muted-foreground">
                    سایر تعاملات ({interactions.length})
                  </h4>
                  <div className="flex flex-col gap-2">
                    {interactions.slice(1).map((item, index) => (
                      <div
                        key={`${item.updatedAt}-${index}`}
                        className="rounded-md border bg-card p-3 text-sm"
                      >
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <strong>{item.nextAction ?? '—'}</strong>
                          {item.urgency && (
                            <StatusBadge
                              label={item.urgency}
                              variantKey={urgencyVariant(item.urgency)}
                            />
                          )}
                          <span className="text-xs text-muted-foreground">
                            {item.updatedAt ? formatDate(item.updatedAt) : '—'}
                          </span>
                        </div>
                        <p className="text-muted-foreground">
                          {item.interactionType ?? '—'}
                          {item.summaryText ? ` · ${item.summaryText}` : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
