import { useState } from 'react'
import { ChevronDown, ChevronUp, Percent } from 'lucide-react'
import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { EmptyState } from '@/components/crm/shared/EmptyState'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PredictionMeter, type PredictionTone } from '@/components/crm/customer360/PredictionMeter'
import { useCustomerBestOffer } from '@/hooks/crm/useCrmQueries'
import type { BestOfferItem } from '@/types/crm'

interface BestOfferCardProps {
  customerId: string
}

function formatPct(fraction: number): string {
  return `${(fraction * 100).toFixed(1)}٪`
}

function acceptTone(probability: number): PredictionTone {
  if (probability >= 0.6) return 'success'
  if (probability >= 0.35) return 'warning'
  return 'default'
}

function OfferAlt({ offer }: { offer: BestOfferItem }) {
  return (
    <div className="rounded-md border border-border p-3 text-sm">
      <p className="mb-1 font-semibold text-card-foreground">آفر {offer.offerType}</p>
      <p className="text-muted-foreground">{offer.offerReason}</p>
      <dl className="mt-2 grid gap-1 text-xs">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">تخفیف</dt>
          <dd className="m-0 font-medium">{formatPct(offer.discountPct)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">احتمال قبول</dt>
          <dd className="m-0 font-medium">{formatPct(offer.acceptProbability)}</dd>
        </div>
      </dl>
    </div>
  )
}

export function BestOfferCard({ customerId }: BestOfferCardProps) {
  const [showAlts, setShowAlts] = useState(false)
  const { data, isLoading, isError, refetch } = useCustomerBestOffer(customerId)

  if (isLoading) return <SectionSkeleton />
  if (isError) {
    return (
      <Card className="h-full">
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
      <Card className="h-full">
        <CardHeader>
          <CardTitle>بهترین آفر پیشنهادی</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState title="پیشنهاد آفر در دسترس نیست" />
        </CardContent>
      </Card>
    )
  }

  const offer = data.best

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent size={18} className="text-primary" />
          بهترین آفر پیشنهادی
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <PredictionMeter
          value={offer.acceptProbability * 100}
          displayValue={formatPct(offer.acceptProbability)}
          label="احتمال قبول آفر"
          modelLabel="مدل ml_offer_accept"
          tone={acceptTone(offer.acceptProbability)}
          caption={offer.offerReason}
        />

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="mb-0.5 block text-xs text-muted-foreground">
              تخفیف پیشنهادی
            </span>
            <span className="text-lg font-bold text-card-foreground">
              {formatPct(offer.discountPct)}
            </span>
          </div>
          <div>
            <span className="mb-0.5 block text-xs text-muted-foreground">
              اعتبار آفر
            </span>
            <span className="font-semibold text-card-foreground">
              {offer.validityDays} روز
            </span>
          </div>
          <div className="col-span-2">
            <span className="mb-0.5 block text-xs text-muted-foreground">نوع آفر</span>
            <span className="font-semibold text-card-foreground">
              {offer.offerType}
              {offer.productFamily ? ` · ${offer.productFamily}` : ''}
            </span>
          </div>
        </div>

        {data.alternatives.length > 0 && (
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto px-0"
              onClick={() => setShowAlts((prev) => !prev)}
            >
              جایگزین‌ها ({data.alternatives.length})
              {showAlts ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </Button>
            {showAlts && (
              <div className="mt-2 flex flex-col gap-2">
                {data.alternatives.map((alt, idx) => (
                  <OfferAlt
                    key={`${alt.offerType}-${alt.offerReason}-${alt.discountPct}-${idx}`}
                    offer={alt}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
