import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency } from '@/lib/formatters'
import type { DashboardDecisionCategory, DashboardPriorityCustomer } from '../types/dashboard.types'
import { toPersianDashboardText } from '../persian'

interface PriorityCustomerTableProps {
  customers: DashboardPriorityCustomer[]
  onSelectCustomer: (customer: DashboardPriorityCustomer) => void
}

const CATEGORY_LABELS: Record<DashboardDecisionCategory, string> = {
  customer_recovery: 'حفظ مشتری', growth_opportunity: 'فرصت رشد', sales_opportunity: 'فرصت فروش',
}
const HIGH_RISK_LEVELS = new Set(['High', 'Critical'])

export function PriorityCustomerTable({ customers, onSelectCustomer }: PriorityCustomerTableProps) {
  return (
    <section className="mb-6" aria-labelledby="priority-customers-heading">
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle id="priority-customers-heading">فهرست اولویت و فرصت مشتریان</CardTitle>
          <p className="text-sm text-muted-foreground">نمای آماده برای جلسه روزانه تیم فروش.</p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead>مشتری</TableHead><TableHead>Segment</TableHead><TableHead>احتمال ریزش</TableHead><TableHead>درآمد در خطر</TableHead><TableHead>فرصت رشد</TableHead><TableHead>فوریت</TableHead><TableHead>اقدام پیشنهادی</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => {
                const category = customer.decision_category ?? 'customer_recovery'
                const revenueAtRisk = HIGH_RISK_LEVELS.has(customer.risk_level ?? '') ? formatCurrency(customer.annual_sales_trailing_12m) : '—'
                return (
                  <TableRow key={customer.customer_id}>
                    <TableCell className="font-semibold"><button type="button" onClick={() => onSelectCustomer(customer)} className="text-primary hover:underline">{customer.customer_id}</button></TableCell>
                    <TableCell><Badge variant="outline">{customer.customer_status ? toPersianDashboardText(customer.customer_status) : CATEGORY_LABELS[category]}</Badge></TableCell>
                    <TableCell>{customer.risk_score == null ? '—' : `${Math.round(customer.risk_score)}٪`}</TableCell>
                    <TableCell>{revenueAtRisk}</TableCell>
                    <TableCell>{customer.opportunity_score}٪</TableCell>
                    <TableCell>{toPersianDashboardText(customer.crm_urgency ?? 'عادی')}</TableCell>
                    <TableCell className="max-w-80 whitespace-normal">{toPersianDashboardText(customer.recommended_action)}</TableCell>
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
