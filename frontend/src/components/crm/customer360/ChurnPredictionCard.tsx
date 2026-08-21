import { TrendingDown } from 'lucide-react'
import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { EmptyState } from '@/components/crm/shared/EmptyState'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { StatusBadge } from '@/components/crm/shared/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PredictionMeter, type PredictionTone } from '@/components/crm/customer360/PredictionMeter'
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

function riskTone(level: ChurnRiskLevelFa): PredictionTone {
  if (level === 'بالا') return 'danger'
  if (level === 'متوسط') return 'warning'
  return 'success'
}

export function ChurnPredictionCard({ customerId }: ChurnPredictionCardProps) {
  const { data, isLoading, isError, refetch, error } = useCustomerChurn(customerId)

  if (isLoading) return <SectionSkeleton />

  if (isError) {
    const status = (error as { status?: number } | null)?.status
    if (status === 404) {
      return (
        <Card className="h-full">
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
      <Card className="h-full">
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
      <Card className="h-full">
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
  const tone = riskTone(data.riskLevel)

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown size={18} className="text-primary" />
          پیش‌بینی ریزش
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <PredictionMeter
          value={data.churnProbability * 100}
          displayValue={formatPct(data.churnProbability)}
          label="احتمال ریزش در ۹۰ روز"
          modelLabel="مدل ml_churn"
          tone={tone}
          caption={
            willChurn
              ? 'مدل این مشتری را در مسیر ریزش می‌بیند.'
              : 'مدل ماندگاری این مشتری را محتمل‌تر می‌داند.'
          }
        />
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            label={`ریسک: ${data.riskLevel}`}
            variantKey={riskVariant(data.riskLevel)}
          />
          <StatusBadge
            label={willChurn ? 'پیش‌بینی: ریزش' : 'پیش‌بینی: ماندگاری'}
            variantKey={willChurn ? 'high' : 'low'}
          />
        </div>
        {data.snapshotDate ? (
          <p className="text-xs text-muted-foreground">
            اسنپ‌شات فیچر: {data.snapshotDate}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
