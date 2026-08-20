import { AlertTriangle, Banknote, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import type { DashboardMetric } from '../types/dashboard.types'

interface KPICardsProps {
  metrics: DashboardMetric[]
}

const SALES_MANAGER_METRICS: DashboardMetric['key'][] = [
  'customers_at_risk',
  'revenue_at_risk',
  'growth_opportunities',
]

const CARD_META = {
  customers_at_risk: { icon: AlertTriangle, tone: 'bg-rose-50 text-rose-700', label: 'مشتریان در آستانه ریزش', meaning: 'نیازمند پیگیری حفظ مشتری' },
  revenue_at_risk: { icon: Banknote, tone: 'bg-amber-50 text-amber-700', label: 'درآمد در خطر', meaning: 'فروش سالانه مشتریان پرریسک' },
  growth_opportunities: { icon: TrendingUp, tone: 'bg-emerald-50 text-emerald-700', label: 'فرصت رشد', meaning: 'حساب‌های آماده توسعه فروش' },
} satisfies Partial<Record<DashboardMetric['key'], { icon: typeof AlertTriangle; tone: string; label: string; meaning: string }>>

export function KPICards({ metrics }: KPICardsProps) {
  const selectedMetrics = SALES_MANAGER_METRICS.flatMap((key) => {
    const metric = metrics.find((item) => item.key === key)
    return metric ? [metric] : []
  })

  return (
    <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="شاخص‌های فروش">
      {selectedMetrics.map((metric) => {
        const meta = CARD_META[metric.key]
        if (!meta) return null
        const Icon = meta.icon
        const value = metric.key === 'revenue_at_risk' ? formatBusinessValue(metric.value) : formatNumber(metric.value)
        return (
          <Card key={metric.key} className="border-muted/80 py-2.5 shadow-sm">
            <CardContent className="flex items-center gap-3">
              <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${meta.tone}`}><Icon size={19} /></div>
              <div className="min-w-0">
                <span className="block text-xs text-muted-foreground">{meta.label}</span>
                <strong className="mt-0.5 block text-2xl leading-none text-card-foreground">{value}</strong>
                <span className="mt-1 block text-[11px] text-muted-foreground">{meta.meaning}</span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </section>
  )
}

function formatBusinessValue(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} میلیارد`
  if (value >= 1_000_000) return `${Math.round(value / 1_000_000).toLocaleString('fa-IR')} میلیون`
  return formatCurrency(value)
}
