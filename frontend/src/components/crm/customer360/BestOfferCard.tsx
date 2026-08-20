import { Percent, Tag } from 'lucide-react'
import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { EmptyState } from '@/components/crm/shared/EmptyState'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useCustomerBestOffer } from '@/hooks/crm/useCrmQueries'
import type { BestOfferItem } from '@/types/crm'

interface BestOfferCardProps {
  customerId: string
}

function formatPct(fraction: number): string {
  return `${(fraction * 100).toFixed(1)}٪`
}

function OfferDetails({ offer, highlight }: { offer: BestOfferItem; highlight?: boolean }) {
  return (
    <div
      className={
        highlight
          ? 'rounded-md border border-primary/20 bg-accent p-4'
          : 'rounded-md border border-border p-3'
      }
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Tag size={highlight ? 18 : 16} className="text-primary" />
        <h3
          className={
            highlight
              ? 'text-base font-bold text-card-foreground'
              : 'text-sm font-semibold text-card-foreground'
          }
        >
          آفر {offer.offerType}
        </h3>
      </div>
      <dl className="m-0 grid gap-1.5 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">دلیل</dt>
          <dd className="m-0 text-end text-card-foreground">{offer.offerReason}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">تخفیف پیشنهادی</dt>
          <dd className="m-0 font-medium text-card-foreground">
            {formatPct(offer.discountPct)}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">احتمال قبول</dt>
          <dd className="m-0 font-medium text-card-foreground">
            {formatPct(offer.acceptProbability)}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">اعتبار آفر</dt>
          <dd className="m-0 text-card-foreground">{offer.validityDays} روز</dd>
        </div>
        {offer.productFamily ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">خانواده کالا</dt>
            <dd className="m-0 text-end text-card-foreground">{offer.productFamily}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  )
}

export function BestOfferCard({ customerId }: BestOfferCardProps) {
  const { data, isLoading, isError, refetch } = useCustomerBestOffer(customerId)

  if (isLoading) return <SectionSkeleton />
  if (isError) {
    return (
      <Card className="mb-5">
        <CardHeader>
          <CardTitle>بهترین آفر پیشنهادی</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorState onRetry={() => refetch()} />
        </CardContent>
      </Card>
    )
  }

  if (!data?.best) {
    return (
      <Card className="mb-5">
        <CardHeader>
          <CardTitle>بهترین آفر پیشنهادی</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState title="پیشنهاد آفر در دسترس نیست" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mb-5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent size={18} className="text-primary" />
          بهترین آفر پیشنهادی
        </CardTitle>
      </CardHeader>
      <CardContent>
        <OfferDetails offer={data.best} highlight />

        {data.alternatives.length > 0 && (
          <div className="mt-4">
            <Separator className="mb-4" />
            <h4 className="mb-2 text-sm text-muted-foreground">جایگزین‌ها</h4>
            <div className="flex flex-col gap-2">
              {data.alternatives.map((alt, idx) => (
                <OfferDetails
                  key={`${alt.offerType}-${alt.offerReason}-${alt.discountPct}-${idx}`}
                  offer={alt}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
