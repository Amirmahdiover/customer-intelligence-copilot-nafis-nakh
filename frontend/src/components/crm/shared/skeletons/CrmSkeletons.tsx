import { Skeleton } from '@/components/ui/skeleton'

export function KpiSkeleton() {
  return (
    <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  )
}

export function CustomerTableSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10" />
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-14" />
      ))}
    </div>
  )
}

export function CustomerHeaderSkeleton() {
  return (
    <div className="flex gap-4 p-6">
      <Skeleton className="size-14 shrink-0 rounded-full" />
      <div>
        <Skeleton className="mb-2 h-6 w-52" />
        <Skeleton className="h-4 w-28" />
      </div>
    </div>
  )
}

export function OrderSkeleton() {
  return <Skeleton className="mb-5 h-52" />
}

export function SectionSkeleton() {
  return <Skeleton className="mb-5 h-32" />
}
