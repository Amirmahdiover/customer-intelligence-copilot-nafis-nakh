import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { ErrorState } from '@/components/crm/shared/ErrorState'
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
    <section className="card">
      <h2 className="section-title">محصولات محبوب</h2>
      <div className="product-mix">
        {customer.favoriteProducts.map((product) => (
          <div key={product.name} className="product-mix__item">
            <div className="product-mix__header">
              <span>{product.name}</span>
              <span>{product.percentage}٪</span>
            </div>
            <div className="product-mix__track">
              <div
                className="product-mix__fill"
                style={{ width: `${product.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
