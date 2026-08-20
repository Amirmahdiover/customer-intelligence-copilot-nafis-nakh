import { CrmHeader } from '@/components/crm/dashboard/CrmHeader'
import { OverviewKpi } from '@/components/crm/dashboard/OverviewKpi'
import { GrowthOpportunity } from '@/components/crm/dashboard/GrowthOpportunity'
import { ImprovingCustomers } from '@/components/crm/dashboard/ImprovingCustomers'

export function CrmDashboard() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 pt-14 lg:px-8 lg:pt-6">
      <CrmHeader />
      <OverviewKpi />
      <GrowthOpportunity />
      <ImprovingCustomers />
    </div>
  )
}
