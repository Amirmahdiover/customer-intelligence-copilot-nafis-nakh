import { AlertTriangle } from 'lucide-react'
import { KpiSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { useCustomer } from '@/hooks/crm/useCrmQueries'
import { formatCurrency } from '@/lib/formatters'

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
    <section className="card">
      <h2 className="section-title">وضعیت مالی</h2>

      {hasOverdue && payment.overdueDays && (
        <div className="overdue-alert">
          <AlertTriangle size={16} />
          {payment.overdueDays} روز معوق
        </div>
      )}

      <div className="payment-grid">
        <div className="payment-item">
          <span className="payment-item__label">کل درآمد</span>
          <span className="payment-item__value">
            {formatCurrency(payment.totalRevenue)}
          </span>
        </div>
        <div className="payment-item payment-item--success">
          <span className="payment-item__label">پرداخت‌شده</span>
          <span className="payment-item__value">
            {formatCurrency(payment.paid)}
          </span>
        </div>
        <div className="payment-item payment-item--warning">
          <span className="payment-item__label">در انتظار</span>
          <span className="payment-item__value">
            {formatCurrency(payment.pending)}
          </span>
        </div>
        <div className="payment-item payment-item--danger">
          <span className="payment-item__label">معوق</span>
          <span className="payment-item__value">
            {formatCurrency(payment.overdue)}
          </span>
        </div>
      </div>

      {!hasOverdue && payment.overdue === 0 && payment.pending === 0 && (
        <p className="payment-clear">بدهی معوق ندارد.</p>
      )}
    </section>
  )
}
