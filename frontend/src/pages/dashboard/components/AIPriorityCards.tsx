import { Link } from 'react-router-dom'
import { ArrowUpLeft, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/formatters'
import type { DashboardPriorityCustomer } from '../types/dashboard.types'
import { toPersianDashboardText, toPersianStatus } from '../persian'

interface AIPriorityCardsProps {
  customers: DashboardPriorityCustomer[]
}

const STATUS_CLASS: Record<DashboardPriorityCustomer['status'], string> = {
  risk: 'border-transparent bg-rose-50 text-rose-700',
  opportunity: 'border-transparent bg-emerald-50 text-emerald-700',
  attention: 'border-transparent bg-amber-50 text-amber-700',
}

export function AIPriorityCards({ customers }: AIPriorityCardsProps) {
  return (
    <section className="mb-6" aria-labelledby="priority-actions-heading">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 id="priority-actions-heading" className="text-lg font-bold text-card-foreground">
            اقدام‌های اولویت‌دار
          </h2>
          <p className="text-sm text-muted-foreground">نشانه‌های قابل مشاهده، تفسیر مدیریتی و اقدام پیشنهادی.</p>
        </div>
        <Sparkles className="text-violet-600" size={22} />
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {customers.slice(0, 3).map((customer) => (
          <Card key={customer.customer_id} className="border-t-4 border-t-violet-500 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{customer.customer_id}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    ارزش کسب‌وکار: {formatCurrency(customer.business_value)}
                  </p>
                </div>
                <Badge variant="outline" className={STATUS_CLASS[customer.status]}>
                  {toPersianStatus(customer.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="font-semibold text-card-foreground">سیگنال اصلی</span>
                <p className="mt-1 text-muted-foreground">{toPersianDashboardText(customer.main_signal ?? customer.signals[0]?.interpretation ?? customer.interpretation)}</p>
              </div>
              <div>
                <span className="font-semibold text-card-foreground">تفسیر</span>
                <p className="mt-1 text-muted-foreground">{toPersianDashboardText(customer.interpretation)}</p>
              </div>
              <div className="rounded-md bg-violet-50 p-2.5 text-violet-950">
                <span className="font-semibold">اقدام پیشنهادی: </span>
                {toPersianDashboardText(customer.recommended_action)}
              </div>
              <Link
                to={`/crm/customers/${customer.customer_id}`}
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                مشاهده نمای ۳۶۰ مشتری <ArrowUpLeft size={15} />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
