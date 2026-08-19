import { useState } from 'react'
import { CrmHeader } from '@/components/crm/dashboard/CrmHeader'
import { OverviewKpi } from '@/components/crm/dashboard/OverviewKpi'
import { SearchFilters } from '@/components/crm/dashboard/SearchFilters'
import { CustomerTable } from '@/components/crm/dashboard/CustomerTable'
import { ImportantInsights } from '@/components/crm/dashboard/ImportantInsights'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import type { CustomerFilters } from '@/types/crm'

export function CrmDashboard() {
  const [filters, setFilters] = useState<CustomerFilters>({
    page: 1,
    limit: 10,
    sortField: 'name',
    sortDirection: 'asc',
  })

  const debouncedSearch = useDebouncedValue(filters.search ?? '', 300)
  const queryFilters: CustomerFilters = {
    ...filters,
    search: debouncedSearch || undefined,
  }

  return (
    <div className="crm-page">
      <CrmHeader />
      <OverviewKpi />
      <SearchFilters filters={filters} onChange={setFilters} />
      <section className="card">
        <h2 className="section-title">لیست مشتریان</h2>
        <CustomerTable filters={queryFilters} onFiltersChange={setFilters} />
      </section>
      <ImportantInsights />
    </div>
  )
}
