import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DashboardDecisionCategory, DashboardPriorityCustomer } from '../types/dashboard.types'

interface PriorityPortfolioViewProps { customers: DashboardPriorityCustomer[] }

const CATEGORY_STYLE: Record<DashboardDecisionCategory, string> = {
  customer_recovery: 'bg-rose-500', growth_opportunity: 'bg-emerald-500', sales_opportunity: 'bg-amber-500',
}
const CATEGORY_LABELS: Record<DashboardDecisionCategory, string> = {
  customer_recovery: 'حفظ مشتری', growth_opportunity: 'فرصت رشد', sales_opportunity: 'فرصت فروش',
}

export function PriorityPortfolioView({ customers }: PriorityPortfolioViewProps) {
  const selected = [
    ...customers.filter((customer) => customer.decision_category === 'customer_recovery').slice(0, 2),
    ...customers.filter((customer) => customer.decision_category === 'growth_opportunity').slice(0, 2),
    ...customers.filter((customer) => customer.decision_category === 'sales_opportunity').slice(0, 2),
  ]
  const maxRisk = Math.max(1, ...selected.map((customer) => customer.risk_score ?? 0))
  const maxValue = Math.max(1, ...selected.map((customer) => customer.business_value))

  return (
    <section className="h-full" aria-labelledby="portfolio-view-heading">
      <Card className="h-full shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle id="portfolio-view-heading">نقشه ریسک و فرصت</CardTitle>
          <p className="text-sm text-muted-foreground">بالا یعنی نیاز بیشتر به توجه؛ سمت راست یعنی ظرفیت رشد بیشتر.</p>
        </CardHeader>
        <CardContent>
          <div className="mb-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {Object.entries(CATEGORY_LABELS).map(([category, label]) => <span key={category}><i className={`ml-1 inline-block size-2 rounded-full ${CATEGORY_STYLE[category as DashboardDecisionCategory]}`} />{label}</span>)}
          </div>
          <div className="relative h-56 rounded-lg border bg-gradient-to-tr from-rose-50 via-background to-emerald-50">
            <div className="absolute inset-y-0 left-1/2 border-l border-dashed border-muted-foreground/30" />
            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-muted-foreground/30" />
            <span className="absolute bottom-2 left-3 text-[11px] text-muted-foreground">رشد کمتر</span>
            <span className="absolute bottom-2 right-3 text-[11px] text-muted-foreground">رشد بیشتر</span>
            <span className="absolute right-3 top-2 text-[11px] text-muted-foreground">نیاز بیشتر به توجه</span>
            {selected.map((customer) => {
              const category = customer.decision_category ?? 'customer_recovery'
              const left = Math.min(96, Math.max(4, customer.opportunity_score))
              const bottom = Math.min(90, Math.max(10, ((customer.risk_score ?? 0) / maxRisk) * 78 + 10))
              const size = Math.round(10 + Math.min(14, Math.sqrt(customer.business_value / maxValue) * 14))
              return (
                <span key={customer.customer_id} className="group absolute" style={{ left: `${left}%`, bottom: `${bottom}%` }}>
                  <button type="button" aria-label={`${customer.customer_id}: ${CATEGORY_LABELS[category]}`} className={`block rounded-full opacity-90 ring-2 ring-white transition-transform hover:scale-125 focus:scale-125 focus:outline-none ${CATEGORY_STYLE[category]}`} style={{ width: size, height: size }} />
                  <span className="pointer-events-none absolute bottom-full right-0 z-10 mb-2 hidden w-max rounded-md bg-foreground px-2 py-1 text-xs text-background shadow group-hover:block group-focus-within:block">{customer.customer_id} · {CATEGORY_LABELS[category]}</span>
                </span>
              )
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">برای دیدن شناسه مشتری و نوع تصمیم، نشانگر را روی هر نقطه نگه دارید.</p>
        </CardContent>
      </Card>
    </section>
  )
}
