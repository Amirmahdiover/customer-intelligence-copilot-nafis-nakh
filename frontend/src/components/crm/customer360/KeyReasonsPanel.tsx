import { ErrorState } from '@/components/crm/shared/ErrorState'
import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  useCustomer,
  useCustomerChurn,
  useCustomerNegotiationScore,
} from '@/hooks/crm/useCrmQueries'
import { buildRiskReasons } from '@/lib/customerNarrative'

interface KeyReasonsPanelProps {
  customerId: string
}

export function KeyReasonsPanel({ customerId }: KeyReasonsPanelProps) {
  const { data: customer, isLoading, isError, refetch } = useCustomer(customerId)
  const { data: churn } = useCustomerChurn(customerId)
  const { data: negotiation } = useCustomerNegotiationScore(customerId)

  if (isLoading) return <SectionSkeleton />
  if (isError || !customer) return <ErrorState onRetry={() => refetch()} />

  const reasons =
    negotiation?.keyDrivers?.length
      ? negotiation.keyDrivers
      : buildRiskReasons(customer, churn, negotiation)

  return (
    <Card className="h-full gap-0 border-border/50 bg-white py-0 shadow-none ring-1 ring-border/25">
      <CardHeader className="px-4 pt-4 pb-2">
        <CardTitle className="text-sm">دلایل کلیدی و شروط معامله</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-4 pb-4">
        <ol className="space-y-2.5">
          {reasons.map((reason, index) => (
            <li key={reason} className="flex gap-2.5 text-sm leading-relaxed">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold tabular-nums text-muted-foreground">
                {(index + 1).toLocaleString('fa-IR')}
              </span>
              <span className="text-card-foreground">{reason}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
