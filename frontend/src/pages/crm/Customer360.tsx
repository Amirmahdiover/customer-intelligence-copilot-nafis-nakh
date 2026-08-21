import { ArrowRight } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { CommandHeader } from '@/components/crm/customer360/CommandHeader'
import { CustomerDeepDive } from '@/components/crm/customer360/CustomerDeepDive'
import { CustomerHealthPanel } from '@/components/crm/customer360/CustomerHealthPanel'
import { CustomerSidebar } from '@/components/crm/customer360/CustomerSidebar'
import { EconomicValueCard } from '@/components/crm/customer360/EconomicValueCard'
import { NextBestActionPanel } from '@/components/crm/customer360/NextBestActionPanel'
import { RiskOverview } from '@/components/crm/customer360/RiskOverview'
import { RiskSignalCard } from '@/components/crm/customer360/RiskSignalCard'
import { SalesIntelligence } from '@/components/crm/customer360/SalesIntelligence'
import { Button } from '@/components/ui/button'

export function Customer360() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  if (!id) {
    return <p>شناسه مشتری نامعتبر است.</p>
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-5 pt-14 lg:px-6 lg:pt-5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mb-0 h-auto px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
        onClick={() => navigate('/crm/customers')}
      >
        <ArrowRight />
        مشتریان / {id}
      </Button>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
        <div className="min-w-0 space-y-4">
          <CommandHeader customerId={id} />

          <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2">
            <CustomerHealthPanel customerId={id} />
            <RiskSignalCard customerId={id} />
          </div>

          <EconomicValueCard customerId={id} />

          <SalesIntelligence customerId={id} />

          <RiskOverview customerId={id} />

          <NextBestActionPanel customerId={id} />
          <CustomerDeepDive customerId={id} />
        </div>

        <CustomerSidebar customerId={id} />
      </div>
    </div>
  )
}
