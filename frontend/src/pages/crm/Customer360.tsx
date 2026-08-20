import { useParams } from 'react-router-dom'
import { CustomerHeader } from '@/components/crm/customer360/CustomerHeader'
import { CustomerKpi } from '@/components/crm/customer360/CustomerKpi'
import { OrderStatusSection } from '@/components/crm/customer360/OrderStatus'
import { FinancialSection } from '@/components/crm/customer360/FinancialSection'
import { ReorderSignal } from '@/components/crm/customer360/ReorderSignal'
import { CustomerBehavior } from '@/components/crm/customer360/CustomerBehavior'
import { ProductMix } from '@/components/crm/customer360/ProductMix'
import { Complaints } from '@/components/crm/customer360/Complaints'
import { CrmSection } from '@/components/crm/customer360/CrmSection'
import { CustomerRisk } from '@/components/crm/customer360/CustomerRisk'
import { InsightCard } from '@/components/crm/customer360/InsightCard'
import { RecommendedAction } from '@/components/crm/customer360/RecommendedAction'
import { BestOfferCard } from '@/components/crm/customer360/BestOfferCard'
import { ChurnPredictionCard } from '@/components/crm/customer360/ChurnPredictionCard'

export function Customer360() {
  const { id } = useParams<{ id: string }>()

  if (!id) {
    return <p>شناسه مشتری نامعتبر است.</p>
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 pt-14 lg:px-8 lg:pt-6">
      <CustomerHeader customerId={id} />
      <CustomerKpi customerId={id} />

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1fr_340px]">
        <div>
          <OrderStatusSection customerId={id} />
          <FinancialSection customerId={id} />
          <ReorderSignal customerId={id} />
          <CustomerBehavior customerId={id} />
          <ProductMix customerId={id} />
          <Complaints customerId={id} />
          <CrmSection customerId={id} />
          <CustomerRisk customerId={id} />
        </div>
        <div>
          <InsightCard customerId={id} />
          <RecommendedAction customerId={id} />
          <BestOfferCard customerId={id} />
          <ChurnPredictionCard customerId={id} />
        </div>
      </div>
    </div>
  )
}
