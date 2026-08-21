import { Badge } from '@/components/ui/badge'
import { useQueries } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency } from '@/lib/formatters'
import type { DashboardDecisionCategory, DashboardPriorityCustomer } from '../types/dashboard.types'
import { toPersianDashboardText, describeOpportunityScore } from '../persian'
import { getDashboardAIExplanation } from '../services/dashboard.service'

interface PriorityCustomerTableProps {
  customers: DashboardPriorityCustomer[]
  onSelectCustomer: (customer: DashboardPriorityCustomer) => void
}

const CATEGORY_LABELS: Record<DashboardDecisionCategory, string> = {
  customer_recovery: 'حفظ و بازیابی مشتری',
  growth_opportunity: 'فرصت رشد حساب و سهم سبد',
  sales_opportunity: 'پیگیری فرصت فروش نزدیک‌مدت',
}
const HIGH_RISK_LEVELS = new Set(['High', 'Critical'])

export function PriorityCustomerTable({ customers, onSelectCustomer }: PriorityCustomerTableProps) {
  const aiExplanations = useQueries({
    queries: customers.map((customer) => ({
      queryKey: ['dashboard', 'ai-explanation', customer.customer_id],
      queryFn: () => getDashboardAIExplanation(customer.customer_id),
      staleTime: 15 * 60 * 1000,
      retry: 0,
    })),
  })

  return (
    <section className="mb-6" aria-labelledby="priority-customers-heading">
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle id="priority-customers-heading">فهرست اولویت و فرصت مشتریان</CardTitle>
          <p className="text-sm text-muted-foreground">نمای آماده برای جلسه روزانه تیم فروش.</p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[1400px]">
            <TableHeader>
              <TableRow>
                <TableHead>مشتری</TableHead><TableHead>تصمیم</TableHead><TableHead>سیگنال اصلی</TableHead><TableHead>چرا مهم است</TableHead><TableHead>احتمال ریزش</TableHead><TableHead>درآمد در خطر</TableHead><TableHead>فرصت رشد</TableHead><TableHead>فوریت</TableHead><TableHead>اقدام پیشنهادی AI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer, index) => {
                const category = customer.decision_category ?? 'customer_recovery'
                const revenueAtRisk = HIGH_RISK_LEVELS.has(customer.risk_level ?? '') ? formatCurrency(customer.annual_sales_trailing_12m) : '—'
                const aiExplanation = aiExplanations[index]
                const aiData = aiExplanation.data
                const mainSignal = customer.main_signal ?? customer.decision_evidence[0] ?? customer.interpretation
                return (
                  <TableRow key={customer.customer_id}>
                    <TableCell className="font-semibold"><button type="button" onClick={() => onSelectCustomer(customer)} className="text-primary hover:underline">{customer.customer_id}</button></TableCell>
                    <TableCell><Badge variant="outline">{CATEGORY_LABELS[category]}</Badge></TableCell>
                    <TableCell className="max-w-64 whitespace-normal text-muted-foreground">{toPersianDashboardText(mainSignal)}</TableCell>
                    <TableCell className="max-w-64 whitespace-normal text-sm leading-6">
                      {aiExplanation.isLoading
                        ? 'در حال تحلیل…'
                        : toPersianDashboardText(
                            aiData?.why_it_matters ?? customer.decision_reason ?? customer.interpretation,
                          )}
                    </TableCell>
                    <TableCell>{customer.risk_score == null ? '—' : `${Math.round(customer.risk_score)}٪`}</TableCell>
                    <TableCell>{revenueAtRisk}</TableCell>
                    <TableCell className="max-w-56 whitespace-normal text-xs leading-5">{describeOpportunityScore(customer.opportunity_score)}</TableCell>
                    <TableCell>{toPersianDashboardText(customer.crm_urgency ?? 'عادی')}</TableCell>
                    <TableCell className="max-w-72 whitespace-normal text-sm leading-6">
                      {aiExplanation.isLoading
                        ? 'در حال تهیه…'
                        : toPersianDashboardText(
                            aiData?.recommended_action ?? customer.recommended_action,
                          )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  )
}
