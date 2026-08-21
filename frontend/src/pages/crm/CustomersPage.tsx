import { useState } from 'react'
import { SearchFilters } from '@/components/crm/dashboard/SearchFilters'
import { CustomerTable } from '@/components/crm/dashboard/CustomerTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import type { CustomerFilters } from '@/types/crm'

export function CustomersPage() {
  // No sortField: the list stays in its shuffled order so active and inactive
  // customers are mixed until the user narrows it down with a filter.
  const [filters, setFilters] = useState<CustomerFilters>({
    page: 1,
    limit: 10,
  })

  const debouncedSearch = useDebouncedValue(filters.search ?? '', 300)
  const queryFilters: CustomerFilters = {
    ...filters,
    search: debouncedSearch || undefined,
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 pt-14 lg:px-8 lg:pt-6">
      <header className="mb-5">
        <h1 className="text-[1.35rem] font-bold text-card-foreground">مشتریان</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          فهرست مشتریان، فیلتر و جستجو — snapshot 2022-06-30
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-[0.95rem]">فهرست مشتریان</CardTitle>
          <Separator className="mt-3" />
        </CardHeader>
        <CardContent>
          <SearchFilters filters={filters} onChange={setFilters} />
          <CustomerTable filters={queryFilters} onFiltersChange={setFilters} />
        </CardContent>
      </Card>
    </div>
  )
}
