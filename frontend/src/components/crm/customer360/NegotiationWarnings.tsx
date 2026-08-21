import { AlertTriangle } from 'lucide-react'
import { useCustomer, useCustomerFinancial, useCustomerNegotiationScore } from '@/hooks/crm/useCrmQueries'
import { buildPaymentPattern } from '@/lib/customerEconomicValue'

interface NegotiationWarningsProps {
  customerId: string
}

export function NegotiationWarnings({ customerId }: NegotiationWarningsProps) {
  const { data: customer } = useCustomer(customerId)
  const { data: negotiation } = useCustomerNegotiationScore(customerId)
  const { data: financial } = useCustomerFinancial(customerId)

  if (!customer) return null

  const payment = buildPaymentPattern(customer, financial)
  const showControl =
    payment.kind === 'check-risky' ||
    customer.paymentStatus === 'overdue' ||
    (financial?.hasReturnedCheck ?? false) ||
    (negotiation?.pillars.collection.score ?? 1) < 0.45

  const warnings = negotiation?.warnings ?? []
  if (!showControl && warnings.length === 0) return null

  return (
    <div className="rounded border-r-4 border-amber-400 bg-yellow-50 p-4">
      <div className="flex items-start gap-2 text-sm leading-relaxed text-amber-950">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
        <div className="space-y-1">
          {showControl ? (
            <p>نکته: ریسک است. قبل از هر فروش، وضعیت اعتبار مشتری بازبینی شود.</p>
          ) : null}
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      </div>
    </div>
  )
}
