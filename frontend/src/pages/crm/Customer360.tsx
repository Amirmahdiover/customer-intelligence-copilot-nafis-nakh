import { useParams } from 'react-router-dom'
import { CustomerHeader } from '@/components/crm/customer360/CustomerHeader'
import { CustomerKpi } from '@/components/crm/customer360/CustomerKpi'
import { OrderStatusSection } from '@/components/crm/customer360/OrderStatus'
import { PaymentStatusSection } from '@/components/crm/customer360/PaymentStatus'
import { ReorderSignal } from '@/components/crm/customer360/ReorderSignal'
import { CustomerBehavior } from '@/components/crm/customer360/CustomerBehavior'
import { ProductMix } from '@/components/crm/customer360/ProductMix'
import { Complaints } from '@/components/crm/customer360/Complaints'
import { CustomerRisk } from '@/components/crm/customer360/CustomerRisk'
import { InsightCard } from '@/components/crm/customer360/InsightCard'
import { RecommendedAction } from '@/components/crm/customer360/RecommendedAction'

export function Customer360() {
  const { id } = useParams<{ id: string }>()

  if (!id) {
    return <p>شناسه مشتری نامعتبر است.</p>
  }

  return (
    <div className="crm-page customer-360">
      <CustomerHeader customerId={id} />
      <CustomerKpi customerId={id} />

      <div className="customer-360__grid">
        <div className="customer-360__main">
          <OrderStatusSection customerId={id} />
          <PaymentStatusSection customerId={id} />
          <ReorderSignal customerId={id} />
          <CustomerBehavior customerId={id} />
          <ProductMix customerId={id} />
          <Complaints customerId={id} />
          <CustomerRisk customerId={id} />
        </div>
        <div className="customer-360__sidebar">
          <InsightCard customerId={id} />
          <RecommendedAction customerId={id} />
        </div>
      </div>
    </div>
  )
}
