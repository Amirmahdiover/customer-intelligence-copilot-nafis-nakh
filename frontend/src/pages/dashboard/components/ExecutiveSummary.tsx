import { ClipboardList } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatNumber } from '@/lib/formatters'
import type { DashboardMetric, ExecutiveSummaryResponse } from '../types/dashboard.types'
import { toPersianDashboardText } from '../persian'

interface ExecutiveSummaryProps {
  summary: ExecutiveSummaryResponse
  metrics: DashboardMetric[]
}

export function ExecutiveSummary({ summary, metrics }: ExecutiveSummaryProps) {
  const metric = (key: DashboardMetric['key']) => metrics.find((item) => item.key === key)?.value ?? 0
  const activeCustomers = metric('active_customers')
  const atRiskCustomers = metric('customers_at_risk')
  const revenueAtRisk = metric('revenue_at_risk')
  const growthOpportunities = metric('growth_opportunities')

  return (
    <section className="mb-6" aria-labelledby="executive-summary-heading">
      <Card className="border-violet-200 bg-violet-50/40 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="text-violet-700" size={20} />
            <CardTitle id="executive-summary-heading">جمع‌بندی مدیریتی</CardTitle>
          </div>
          <p className="max-w-4xl text-base font-semibold leading-7 text-card-foreground">{toPersianDashboardText(summary.headline)}</p>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          <div>
            <h3 className="mb-2 text-sm font-bold text-card-foreground">چه اتفاقی افتاده است؟</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>{formatNumber(activeCustomers)} مشتری فعال در سبد فروش قرار دارند.</p>
              <p>{formatNumber(atRiskCustomers)} مشتری نیازمند توجه و پیگیری هستند.</p>
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-bold text-card-foreground">چرا برای فروش مهم است؟</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>ارزش فروش نیازمند حفاظت {formatBusinessValue(revenueAtRisk)} است.</p>
              <p>{formatNumber(growthOpportunities)} مشتری فعال ظرفیت قابل‌توجهی برای توسعه فروش دارند.</p>
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-bold text-card-foreground">فروش چه کاری انجام دهد؟</h3>
            <ul className="list-disc space-y-2 pr-5 text-sm text-muted-foreground">
              {summary.important_focus_areas.map((area) => <li key={area}>{toPersianDashboardText(area)}</li>)}
            </ul>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

function formatBusinessValue(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} میلیارد`
  if (value >= 1_000_000) return `${Math.round(value / 1_000_000).toLocaleString('fa-IR')} میلیون`
  return value.toLocaleString('fa-IR')
}
