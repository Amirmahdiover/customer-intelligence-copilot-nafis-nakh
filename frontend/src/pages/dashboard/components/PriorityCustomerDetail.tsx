import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BrainCircuit, ExternalLink, ShieldAlert, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { getDashboardAIExplanation } from '../services/dashboard.service'
import type { DashboardDecisionCategory, DashboardPriorityCustomer } from '../types/dashboard.types'
import { toPersianDashboardText, toPersianRiskLevel, describeOpportunityScore } from '../persian'

interface PriorityCustomerDetailProps {
  customer: DashboardPriorityCustomer | null
  onOpenChange: (open: boolean) => void
}

const CATEGORY_LABELS: Record<DashboardDecisionCategory, string> = {
  customer_recovery: 'حفظ و بازیابی مشتری',
  growth_opportunity: 'فرصت رشد حساب و سهم سبد',
  sales_opportunity: 'پیگیری فرصت فروش نزدیک‌مدت',
}

export function PriorityCustomerDetail({ customer, onOpenChange }: PriorityCustomerDetailProps) {
  const insight = useQuery({
    queryKey: ['dashboard', 'ai-explanation', customer?.customer_id],
    queryFn: () => getDashboardAIExplanation(customer!.customer_id),
    enabled: Boolean(customer),
    staleTime: 15 * 60 * 1000,
    retry: 1,
  })

  if (!customer) return null

  const category = customer.decision_category ?? 'customer_recovery'
  const why = customer.decision_reason ?? customer.interpretation
  const evidence = customer.decision_evidence.length > 0
    ? customer.decision_evidence
    : customer.signals.map((signal) => signal.interpretation)
  const opportunityEvidence = evidence.filter((item) => /opportunity|revenue share|wallet|sales value|margin|lifetime|order|purchase/i.test(item))
  const deterministicInsight = {
    summary: toPersianDashboardText(why),
    whyItMatters: toPersianDashboardText(evidence[0] ?? customer.interpretation),
    recommendedAction: toPersianDashboardText(customer.recommended_action),
  }
  const aiInsight = insight.data
    ? {
        summary: aiInsightText(insight.data.summary),
        whyItMatters: aiInsightText(insight.data.why_it_matters),
        recommendedAction: aiInsightText(insight.data.recommended_action),
        fallback: insight.data.source === 'fallback',
      }
    : { ...deterministicInsight, fallback: true }

  return (
    <Sheet open={Boolean(customer)} onOpenChange={onOpenChange}>
      <SheetContent side="left" dir="rtl" className="w-full overflow-y-auto p-0 text-right sm:max-w-xl">
        <div className="p-6">
          <SheetHeader className="mb-5 space-y-2 text-right">
            <div className="flex items-center justify-between gap-3 pl-8">
              <Badge variant="outline">{CATEGORY_LABELS[category]}</Badge>
              <SheetTitle className="text-right text-xl">تصمیم فروش برای {customer.customer_id}</SheetTitle>
            </div>
            <p className="text-sm text-muted-foreground">جمع‌بندی تصمیم، شواهد و اقدام بعدی برای تیم فروش.</p>
          </SheetHeader>

          <section className="rounded-lg border border-border bg-muted/30 p-4">
            <h2 className="mb-2 font-bold">چرا این مشتری اکنون مهم است؟</h2>
            <p className="text-sm leading-6 text-muted-foreground">{toPersianDashboardText(why)}</p>
          </section>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <IndicatorGroup icon={<ShieldAlert size={18} />} title="نشانه‌های ریزش">
              <p><span>سطح ریسک: </span><strong>{toPersianRiskLevel(customer.risk_level)}</strong></p>
              <p><span>احتمال ریزش: </span><strong>{customer.risk_score == null ? '—' : `${Math.round(customer.risk_score)}٪`}</strong></p>
              {customer.signals.slice(0, 3).map((signal) => <p key={signal.name} className="leading-5 text-muted-foreground">{toPersianDashboardText(signal.interpretation)}</p>)}
            </IndicatorGroup>
            <IndicatorGroup icon={<TrendingUp size={18} />} title="نشانه‌های فرصت">
              <p><span>ظرفیت رشد: </span><strong>{describeOpportunityScore(customer.opportunity_score)}</strong></p>
              {(opportunityEvidence.length ? opportunityEvidence : evidence.slice(0, 2)).slice(0, 3).map((item) => <p key={item} className="leading-5 text-muted-foreground">{toPersianDashboardText(item)}</p>)}
            </IndicatorGroup>
          </div>

          <section className="mt-4 rounded-lg border border-violet-200 bg-violet-50/60 p-4" aria-labelledby="ai-insight-heading">
            <div className="mb-3 flex items-center gap-2 text-violet-800">
              <BrainCircuit size={19} aria-hidden="true" />
              <h2 id="ai-insight-heading" className="font-bold">تحلیل هوشمند</h2>
              {aiInsight.fallback && <span className="text-xs text-violet-700">بر پایه داده‌های موجود</span>}
            </div>
            {insight.isLoading ? (
              <p className="text-sm text-muted-foreground">در حال آماده‌سازی تحلیل…</p>
            ) : (
              <div className="space-y-3 text-sm">
                <InsightLine label="وضعیت فعلی" value={aiInsight.summary} />
                <InsightLine label="چرا مهم است" value={aiInsight.whyItMatters} />
                <div><h3 className="font-semibold text-card-foreground">شواهد</h3><ul className="mt-1 list-disc space-y-1 pr-5 text-muted-foreground">{evidence.slice(0, 3).map((item) => <li key={item}>{toPersianDashboardText(item)}</li>)}</ul></div>
                <InsightLine label="اقدام پیشنهادی" value={aiInsight.recommendedAction} emphasis />
              </div>
            )}
          </section>

          <Link to={`/crm/customers/${customer.customer_id}`} className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
            مشاهده Customer 360 <ExternalLink size={15} />
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function IndicatorGroup({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return <section className="rounded-lg border p-3 text-sm"><h2 className="mb-2 flex items-center gap-1.5 font-bold text-card-foreground">{icon}{title}</h2><div className="space-y-1.5">{children}</div></section>
}

function InsightLine({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return <div><h3 className="font-semibold text-card-foreground">{label}</h3><p className={`mt-0.5 leading-6 ${emphasis ? 'font-medium text-card-foreground' : 'text-muted-foreground'}`}>{value}</p></div>
}

function aiInsightText(value: string) {
  return toPersianDashboardText(value)
}
