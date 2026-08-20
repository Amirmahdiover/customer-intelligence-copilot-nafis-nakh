import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DecisionAreas } from './components/DecisionAreas'
import { KPICards } from './components/KPICards'
import { PriorityCustomerTable } from './components/PriorityCustomerTable'
import { PriorityPortfolioView } from './components/PriorityPortfolioView'
import { PriorityCustomerDetail } from './components/PriorityCustomerDetail'
import { getDashboardOverview, getDashboardPriorities } from './services/dashboard.service'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { KpiSkeleton, SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import type { DashboardPriorityCustomer } from './types/dashboard.types'

export function Dashboard() {
  const [selectedCustomer, setSelectedCustomer] = useState<DashboardPriorityCustomer | null>(null)
  const overview = useQuery({ queryKey: ['dashboard', 'overview'], queryFn: getDashboardOverview })
  const priorities = useQuery({ queryKey: ['dashboard', 'priorities'], queryFn: () => getDashboardPriorities(100) })
  const isLoading = overview.isLoading || priorities.isLoading
  const hasError = overview.isError || priorities.isError
  const retry = () => {
    void overview.refetch()
    void priorities.refetch()
  }

  if (isLoading) {
    return <div className="mx-auto max-w-[1400px] px-4 py-5 pt-14 lg:px-7 lg:pt-5"><KpiSkeleton /><SectionSkeleton /><SectionSkeleton /></div>
  }

  if (hasError || !overview.data || !priorities.data) {
    return <ErrorState onRetry={retry} message="داده‌های داشبورد فروش بارگذاری نشد." />
  }

  return (
    <main dir="rtl" lang="fa" className="mx-auto max-w-[1400px] px-4 py-5 pt-14 text-right lg:px-7 lg:pt-5" aria-label="داشبورد فروش">
      <header className="mb-4 flex flex-col gap-2 rounded-xl border bg-card px-5 py-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold text-violet-700">CRM Copilot · مدیریت فروش</p>
          <h1 className="text-xl font-bold text-card-foreground">اولویت‌ها و فرصت‌های فروش</h1>
          <p className="mt-1 text-sm text-muted-foreground">تمرکز امروز: حفظ مشتریان در خطر و پیگیری فرصت‌های رشد.</p>
        </div>
        <p className="shrink-0 text-xs text-muted-foreground">تصویر داده‌ها: {overview.data.snapshot_date}</p>
      </header>

      <KPICards metrics={overview.data.metrics} />

      <section className="mb-6 grid items-stretch gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <DecisionAreas priorities={priorities.data} onSelectCustomer={setSelectedCustomer} />
        <PriorityPortfolioView customers={priorities.data} />
      </section>

      <PriorityCustomerTable customers={priorities.data.slice(0, 9)} onSelectCustomer={setSelectedCustomer} />
      <PriorityCustomerDetail customer={selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)} />
    </main>
  )
}
