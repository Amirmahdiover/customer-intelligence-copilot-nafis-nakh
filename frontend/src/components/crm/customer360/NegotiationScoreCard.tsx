import { Handshake } from 'lucide-react'
import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { EmptyState } from '@/components/crm/shared/EmptyState'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { PredictionMeter, type PredictionTone } from '@/components/crm/customer360/PredictionMeter'
import { useCustomerNegotiationScore } from '@/hooks/crm/useCrmQueries'
import type { NegotiationPillarKey } from '@/types/crm'
import { cn } from '@/lib/utils'

interface NegotiationScoreCardProps {
  customerId: string
}

const PILLAR_LABELS: Record<NegotiationPillarKey, string> = {
  collection: 'سلامت وصول',
  retention: 'حفظ مشتری',
  loyalty: 'وفاداری',
  cash: 'نقدینگی',
}

const PILLAR_ORDER: NegotiationPillarKey[] = [
  'collection',
  'retention',
  'loyalty',
  'cash',
]

function scoreTone(score: number): PredictionTone {
  if (score >= 70) return 'success'
  if (score >= 45) return 'warning'
  return 'danger'
}

function pillarTone(score: number): string {
  if (score >= 0.7) return '[&_[data-slot=progress-indicator]]:bg-emerald-500'
  if (score >= 0.45) return '[&_[data-slot=progress-indicator]]:bg-amber-500'
  return '[&_[data-slot=progress-indicator]]:bg-destructive'
}

export function NegotiationScoreCard({ customerId }: NegotiationScoreCardProps) {
  const { data, isLoading, isError, refetch, error } =
    useCustomerNegotiationScore(customerId)

  if (isLoading) return <SectionSkeleton />

  if (isError) {
    const status = (error as { status?: number } | null)?.status
    if (status === 404) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>امتیاز موفقیت مذاکره</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState title="پروفایل مذاکره برای این مشتری موجود نیست" />
          </CardContent>
        </Card>
      )
    }
    return (
      <Card>
        <CardHeader>
          <CardTitle>امتیاز موفقیت مذاکره</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorState onRetry={() => refetch()} />
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>امتیاز موفقیت مذاکره</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState title="امتیاز مذاکره در دسترس نیست" />
        </CardContent>
      </Card>
    )
  }

  const tone = scoreTone(data.negotiationScore)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Handshake size={18} className="text-primary" />
          امتیاز موفقیت مذاکره
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,280px)_1fr]">
          <PredictionMeter
            value={data.negotiationScore}
            displayValue={`${data.negotiationScore.toLocaleString('fa-IR')}٪`}
            label="شانس موفقیت مذاکره"
            modelLabel="مدل negotiation_score"
            tone={tone}
            caption={data.recommendation}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PILLAR_ORDER.map((key) => {
              const pillar = data.pillars[key]
              return (
                <div key={key} className="rounded-md border bg-muted/40 p-3">
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                    <span className="font-semibold text-card-foreground">
                      {PILLAR_LABELS[key]}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {(pillar.score * 100).toFixed(0)}٪
                    </span>
                  </div>
                  <Progress
                    value={pillar.score * 100}
                    className={cn('h-2', pillarTone(pillar.score))}
                  />
                  {pillar.note ? (
                    <p className="mt-1.5 text-xs text-muted-foreground">{pillar.note}</p>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>

        {(data.keyDrivers.length > 0 || data.warnings.length > 0) && (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {data.keyDrivers.length > 0 && (
              <ul className="m-0 list-none space-y-1 p-0 text-sm text-card-foreground">
                {data.keyDrivers.map((driver) => (
                  <li key={driver}>{driver}</li>
                ))}
              </ul>
            )}
            {data.warnings.length > 0 && (
              <ul className="m-0 list-none space-y-1 p-0 text-sm text-amber-800">
                {data.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {data.snapshotDate ? (
          <p className="text-xs text-muted-foreground">
            اسنپ‌شات پروفایل مذاکره: {data.snapshotDate}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
