import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useCustomer } from '@/hooks/crm/useCrmQueries'

interface ProductMixProps {
  customerId: string
}

export function ProductMix({ customerId }: ProductMixProps) {
  const { data: customer, isLoading, isError, refetch } = useCustomer(customerId)

  if (isLoading) return <SectionSkeleton />
  if (isError || !customer) {
    return <ErrorState onRetry={() => refetch()} />
  }

  return (
    <Card className="mb-5">
      <CardHeader>
        <CardTitle>محصولات محبوب</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3.5">
        {customer.favoriteProducts.map((product) => (
          <div key={product.name}>
            <div className="mb-1 flex justify-between text-sm">
              <span>{product.name}</span>
              <span>{product.percentage}٪</span>
            </div>
            <Progress value={product.percentage} />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
