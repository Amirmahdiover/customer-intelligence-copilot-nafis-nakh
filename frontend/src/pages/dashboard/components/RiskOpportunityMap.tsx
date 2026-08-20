import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/formatters'
import type { RiskOpportunityPoint } from '../types/dashboard.types'
import { toPersianStatus } from '../persian'

interface RiskOpportunityMapProps {
  points: RiskOpportunityPoint[]
}

const STATUS_COLOR: Record<RiskOpportunityPoint['status'], string> = {
  risk: 'bg-rose-500',
  opportunity: 'bg-emerald-500',
  attention: 'bg-amber-500',
}

export function RiskOpportunityMap({ points }: RiskOpportunityMapProps) {
  const meaningfulPoints = [
    ...topPoints(points, 'risk', 12, (point) => (point.risk_score ?? 0) * point.business_value),
    ...topPoints(points, 'opportunity', 12, (point) => point.opportunity_score * point.business_value),
    ...topPoints(points, 'attention', 8, (point) => point.opportunity_score * point.business_value),
  ]
  const maxRisk = Math.max(1, ...meaningfulPoints.map((point) => point.risk_score ?? 0))
  const maxValue = Math.max(1, ...meaningfulPoints.map((point) => point.business_value))

  return (
    <section className="mb-6" aria-labelledby="risk-opportunity-heading">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle id="risk-opportunity-heading">نمای ریسک و فرصت</CardTitle>
          <p className="text-sm text-muted-foreground">
            فقط مشتریان اثرگذار نمایش داده می‌شوند: محور افقی فرصت، محور عمودی ریسک و اندازه نقطه نشان‌دهنده ارزش کسب‌وکار است.
          </p>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span><i className="ml-1 inline-block size-2 rounded-full bg-rose-500" />ریسک</span>
            <span><i className="ml-1 inline-block size-2 rounded-full bg-emerald-500" />فرصت</span>
            <span><i className="ml-1 inline-block size-2 rounded-full bg-amber-500" />نیازمند پیگیری</span>
          </div>
          <div className="relative h-80 overflow-hidden rounded-lg border bg-gradient-to-tr from-rose-50 via-background to-emerald-50">
            <div className="absolute inset-y-0 left-1/2 border-l border-dashed border-muted-foreground/30" />
            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-muted-foreground/30" />
            <span className="absolute bottom-2 left-3 text-xs text-muted-foreground">فرصت کمتر</span>
            <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">فرصت بیشتر</span>
            <span className="absolute right-3 top-3 text-xs text-muted-foreground">ریسک بیشتر</span>
            <span className="absolute right-3 bottom-7 text-xs text-muted-foreground">ریسک کمتر</span>
            {meaningfulPoints.map((point) => {
              const left = Math.min(98, Math.max(2, point.opportunity_score))
              const bottom = Math.min(96, Math.max(4, ((point.risk_score ?? 0) / maxRisk) * 92 + 4))
              const size = Math.round(6 + Math.min(14, Math.sqrt(point.business_value / maxValue) * 14))
              return (
                <span
                  key={point.customer_id}
                  title={`${point.customer_id} · ارزش ${formatCurrency(point.business_value)}`}
                  aria-label={`${point.customer_id}: ${toPersianStatus(point.status)}`}
                  className={`absolute rounded-full opacity-75 ring-1 ring-white/80 ${STATUS_COLOR[point.status]}`}
                  style={{ left: `${left}%`, bottom: `${bottom}%`, width: size, height: size }}
                />
              )
            })}
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

function topPoints(
  points: RiskOpportunityPoint[],
  status: RiskOpportunityPoint['status'],
  limit: number,
  score: (point: RiskOpportunityPoint) => number,
) {
  return points
    .filter((point) => point.status === status)
    .sort((a, b) => score(b) - score(a))
    .slice(0, limit)
}
