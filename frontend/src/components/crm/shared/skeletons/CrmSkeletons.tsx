export function KpiSkeleton() {
  return (
    <div className="skeleton-grid skeleton-grid--5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="skeleton kpi-skeleton" />
      ))}
    </div>
  )
}

export function CustomerTableSkeleton() {
  return (
    <div className="skeleton-table">
      <div className="skeleton skeleton-table__header" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="skeleton skeleton-table__row" />
      ))}
    </div>
  )
}

export function CustomerHeaderSkeleton() {
  return (
    <div className="skeleton-customer-header">
      <div className="skeleton skeleton--circle" />
      <div className="skeleton-customer-header__text">
        <div className="skeleton skeleton--line-lg" />
        <div className="skeleton skeleton--line-sm" />
      </div>
    </div>
  )
}

export function OrderSkeleton() {
  return <div className="skeleton skeleton-order-card" />
}

export function SectionSkeleton() {
  return <div className="skeleton skeleton-section" />
}
