import { AlertTriangle } from 'lucide-react'
import { KpiSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCustomer } from '@/hooks/crm/useCrmQueries'
import { formatCurrency } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface PaymentStatusProps {
  customerId: string
}

export function PaymentStatusSection({ customerId }: PaymentStatusProps) {
  const { data: customer, isLoading, isError, refetch } = useCustomer(customerId)

  if (isLoading) return <KpiSkeleton />
  if (isError || !customer) {
    return <ErrorState onRetry={() => refetch()} />
  }

  const { payment } = customer
  const hasOverdue = payment.overdue > 0

  return (
    <Card className="mb-5">
      <CardHeader>
        <CardTitle>وضعیت مالی</CardTitle>
      </CardHeader>
      <CardContent>
        {hasOverdue && payment.overdueDays && (
          <Badge variant="destructive" className="mb-4 gap-1.5">
            <AlertTriangle size={14} />
            {payment.overdueDays} روز معوق
          </Badge>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-md border bg-muted/50 p-3.5">
            <span className="mb-1 block text-xs text-muted-foreground">کل درآمد</span>
            <span className="text-lg font-bold text-card-foreground">
              {formatCurrency(payment.totalRevenue)}
            </span>
          </div>
          <div className="rounded-md border bg-muted/50 p-3.5">
            <span className="mb-1 block text-xs text-muted-foreground">پرداخت‌شده</span>
            <span className="text-lg font-bold text-emerald-600">
              {formatCurrency(payment.paid)}
            </span>
          </div>
          <div className="rounded-md border bg-muted/50 p-3.5">
            <span className="mb-1 block text-xs text-muted-foreground">در انتظار</span>
            <span className="text-lg font-bold text-amber-600">
              {formatCurrency(payment.pending)}
            </span>
          </div>
          <div className="rounded-md border bg-muted/50 p-3.5">
            <span className="mb-1 block text-xs text-muted-foreground">معوق</span>
            <span
              className={cn(
                'text-lg font-bold',
                hasOverdue ? 'text-destructive' : 'text-card-foreground',
              )}
            >
              {formatCurrency(payment.overdue)}
            </span>
          </div>
        </div>

        {!hasOverdue && payment.overdue === 0 && payment.pending === 0 && (
          <p className="mt-3 text-sm text-emerald-600">بدهی معوق ندارد.</p>
        )}
      </CardContent>
    </Card>
  )
}
