import {
  Users,
  UserCheck,
  AlertTriangle,
  DollarSign,
  CreditCard,
} from 'lucide-react'
import { KpiCard } from '@/components/crm/shared/KpiCard'
import { KpiSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { useCrmOverview } from '@/hooks/crm/useCrmQueries'
import { formatCurrency, formatNumber } from '@/lib/formatters'

export function OverviewKpi() {
  const { data, isLoading, isError, refetch } = useCrmOverview()

  if (isLoading) return <KpiSkeleton />
  if (isError || !data) {
    return <ErrorState onRetry={() => refetch()} />
  }

  return (
    <div className="kpi-grid">
      <KpiCard
        title="کل مشتریان"
        value={formatNumber(data.totalCustomers)}
        subtitle={`+${formatNumber(data.newCustomersThisMonth)} این ماه`}
        icon={Users}
        trend="up"
      />
      <KpiCard
        title="مشتریان فعال"
        value={formatNumber(data.activeCustomers)}
        icon={UserCheck}
      />
      <KpiCard
        title="در معرض ریسک"
        value={formatNumber(data.atRiskCustomers)}
        icon={AlertTriangle}
        trend="down"
      />
      <KpiCard
        title="کل درآمد"
        value={formatCurrency(data.totalRevenue)}
        icon={DollarSign}
      />
      <KpiCard
        title="پرداخت‌های معوق"
        value={formatCurrency(data.outstandingPayments)}
        icon={CreditCard}
        trend="down"
      />
    </div>
  )
}
