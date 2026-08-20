import { AlertTriangle, TrendingDown } from 'lucide-react'
import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { EmptyState } from '@/components/crm/shared/EmptyState'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { StatusBadge } from '@/components/crm/shared/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCustomerChurn } from '@/hooks/crm/useCrmQueries'
import type { ChurnRiskLevelFa } from '@/types/crm'

interface ChurnPredictionCardProps {
  customerId: string
}

function formatPct(fraction: number): string {
  return `${(fraction * 100).toFixed(1)}٪`
}

function riskVariant(
  level: ChurnRiskLevelFa,
): 'high' | 'medium' | 'low' {
  if (level === 'بالا') return 'high'
  if (level === 'متوسط') return 'medium'
  return 'low'
}

export function ChurnPredictionCard({ customerId }: ChurnPredictionCardProps) {
  const { data, isLoading, isError, refetch, error } = useCustomerChurn(customerId)

  if (isLoading) return <SectionSkeleton />

  if (isError) {
    const status = (error as { status?: number } | null)?.status
    if (status === 404) {
      return (
        <Card className="mb-5">
          <CardHeader>
            <CardTitle>پیش‌بینی ریزش</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState title="برای این مشتری فیچر مدل ریزش موجود نیست" />
          </CardContent>
        </Card>
      )
    }
    return (
      <Card className="mb-5">
        <CardHeader>
          <CardTitle>پیش‌بینی ریزش</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorState onRetry={() => refetch()} />
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className="mb-5">
        <CardHeader>
          <CardTitle>پیش‌بینی ریزش</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState title="پیش‌بینی ریزش در دسترس نیست" />
        </CardContent>
      </Card>
    )
  }

  const willChurn = data.churnPrediction === 1

  return (
    <Card className="mb-5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown size={18} className="text-primary" />
          پیش‌بینی ریزش
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-primary/20 bg-accent p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <AlertTriangle size={18} className="text-primary" />
            <h3 className="text-base font-bold text-card-foreground">
              {willChurn ? 'احتمال ریزش بالا' : 'احتمال ماندگاری'}
            </h3>
            <StatusBadge
              label={`ریسک: ${data.riskLevel}`}
              variantKey={riskVariant(data.riskLevel)}
            />
          </div>
          <dl className="m-0 grid gap-1.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">احتمال ریزش (۹۰ روز)</dt>
              <dd className="m-0 font-medium text-card-foreground">
                {formatPct(data.churnProbability)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">پیش‌بینی مدل</dt>
              <dd className="m-0 text-card-foreground">
                {willChurn ? 'ریزش' : 'عدم ریزش'}
              </dd>
            </div>
            {data.snapshotDate ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">تاریخ اسنپ‌شات فیچر</dt>
                <dd className="m-0 text-card-foreground">{data.snapshotDate}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </CardContent>
    </Card>
  )
}
