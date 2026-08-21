import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpLeft, Clock3 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/formatters'
import type { DashboardDecisionCategory, DashboardPriorityCustomer } from '../types/dashboard.types'
import { toPersianDashboardText } from '../persian'
import { getDashboardAIExplanation } from '../services/dashboard.service'

interface DecisionAreasProps {
  priorities: DashboardPriorityCustomer[]
  onSelectCustomer: (customer: DashboardPriorityCustomer) => void
}

const CATEGORY_LABELS: Record<DashboardDecisionCategory, string> = {
  customer_recovery: 'حفظ مشتری', growth_opportunity: 'فرصت رشد', sales_opportunity: 'فرصت فروش',
}
const CATEGORY_TONES: Record<DashboardDecisionCategory, string> = {
  customer_recovery: 'border-r-rose-500 bg-rose-50/40', growth_opportunity: 'border-r-emerald-500 bg-emerald-50/40', sales_opportunity: 'border-r-amber-500 bg-amber-50/40',
}
const HIGH_RISK_LEVELS = new Set(['High', 'Critical'])

export function DecisionAreas({ priorities, onSelectCustomer }: DecisionAreasProps) {
  const selected = priorities.slice(0, 6)
  return (
    <section className="h-full" aria-labelledby="decision-board-heading">
      <Card className="h-full shadow-sm">
        <CardHeader className="flex-row items-center justify-between gap-3 pb-3">
          <div>
            <CardTitle id="decision-board-heading">اقدام‌های اولویت‌دار فروش</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">فهرست کوتاه برای اقدام امروز تیم فروش.</p>
          </div>
          <Badge variant="outline" className="shrink-0">{selected.length} مورد</Badge>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {selected.map((customer) => <PriorityRow key={customer.customer_id} customer={customer} onSelectCustomer={onSelectCustomer} />)}
          <Link to="/crm/customers" className="inline-flex items-center gap-1 pt-1 text-sm font-semibold text-primary hover:underline">مشاهده همه مشتریان <ArrowUpLeft size={14} /></Link>
        </CardContent>
      </Card>
    </section>
  )
}

function PriorityRow({ customer, onSelectCustomer }: { customer: DashboardPriorityCustomer; onSelectCustomer: (customer: DashboardPriorityCustomer) => void }) {
  const aiExplanation = useQuery({
    queryKey: ['dashboard', 'ai-explanation', customer.customer_id],
    queryFn: () => getDashboardAIExplanation(customer.customer_id),
    staleTime: 15 * 60 * 1000,
    retry: 0,
  })
  const category = customer.decision_category ?? 'customer_recovery'
  const revenueAtRisk = HIGH_RISK_LEVELS.has(customer.risk_level ?? '') ? formatCurrency(customer.annual_sales_trailing_12m) : '—'
  const mainSignal = customer.main_signal ?? customer.decision_evidence[0] ?? customer.interpretation
  const whyTag = aiExplanation.data?.source === 'openai'
    ? aiExplanation.data.why_tag
    : null
  const actionTag = aiExplanation.data?.source === 'openai'
    ? aiExplanation.data.action_tag
    : null
  return (
    <article className={`rounded-lg border border-r-4 p-3 ${CATEGORY_TONES[category]}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onSelectCustomer(customer)} className="font-bold text-card-foreground hover:text-primary hover:underline">{customer.customer_id}</button>
          <Badge variant="outline" className="bg-background/70">{CATEGORY_LABELS[category]}</Badge>
        </div>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock3 size={13} />{toPersianDashboardText(customer.crm_urgency ?? 'عادی')}</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground"><span className="font-semibold text-card-foreground">سیگنال اصلی: </span>{toPersianDashboardText(mainSignal)}</p>
      <div className="mt-2 flex items-center gap-2 text-sm"><span className="font-semibold text-card-foreground">چرایی:</span><Badge variant="secondary">{aiExplanation.isLoading ? 'در حال تحلیل' : whyTag ?? 'AI در دسترس نیست'}</Badge></div>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs sm:grid-cols-4">
        <Fact label="احتمال ریزش" value={customer.risk_score == null ? '—' : `${Math.round(customer.risk_score)}٪`} />
        <Fact label="درآمد در خطر" value={revenueAtRisk} />
        <Fact label="فرصت رشد" value={`${customer.opportunity_score}٪`} />
        <Fact label="فوریت" value={toPersianDashboardText(customer.crm_urgency ?? 'عادی')} />
      </div>
      <div className="mt-2 flex items-center gap-2 border-t border-border/70 pt-2 text-sm"><span className="font-semibold">اقدام AI:</span><Badge variant="secondary">{aiExplanation.isLoading ? 'در حال تهیه' : actionTag ?? 'AI در دسترس نیست'}</Badge></div>
    </article>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return <p className="min-w-0 text-muted-foreground"><span className="block text-[11px]">{label}</span><span className="font-semibold text-card-foreground">{value}</span></p>
}
