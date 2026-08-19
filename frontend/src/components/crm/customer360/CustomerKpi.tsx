import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  BarChart3,
  Clock,
} from 'lucide-react'
import { KpiCard } from '@/components/crm/shared/KpiCard'
import { KpiSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { useCustomer } from '@/hooks/crm/useCrmQueries'
import { formatCurrency, formatRelativeDate } from '@/lib/formatters'

interface CustomerKpiProps {
  customerId: string
}

export function CustomerKpi({ customerId }: CustomerKpiProps) {
  const { data: customer, isLoading, isError, refetch } = useCustomer(customerId)

  if (isLoading) return <KpiSkeleton />
  if (isError || !customer) {
    return <ErrorState onRetry={() => refetch()} />
  }

  const profitMargin = Math.round(
    (customer.totalProfit / customer.totalRevenue) * 100,
  )

  return (
    <div className="kpi-grid kpi-grid--customer">
      <KpiCard
        title="کل درآمد"
        value={formatCurrency(customer.totalRevenue)}
        icon={DollarSign}
      />
      <KpiCard
        title="سود مشتری"
        value={formatCurrency(customer.totalProfit)}
        subtitle={`${profitMargin}٪ حاشیه سود`}
        icon={TrendingUp}
        trend={profitMargin >= 15 ? 'up' : 'down'}
      />
      <KpiCard
        title="تعداد سفارش"
        value={String(customer.orderCount)}
        icon={ShoppingCart}
      />
      <KpiCard
        title="میانگین سفارش"
        value={formatCurrency(customer.averageOrderValue)}
        icon={BarChart3}
      />
      <KpiCard
        title="آخرین سفارش"
        value={formatRelativeDate(customer.lastOrderDate)}
        icon={Clock}
      />
    </div>
  )
}
