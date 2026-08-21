import { MoreHorizontal, Phone, Plus } from 'lucide-react'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { CustomerHeaderSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { StatusBadge } from '@/components/crm/shared/StatusBadge'
import { useToast } from '@/components/crm/shared/Toast'
import { ValueTierBadge } from '@/components/crm/shared/ValueTierBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useCustomer, useCustomerCrm } from '@/hooks/crm/useCrmQueries'
import { ACCOUNT_STATUS_LABELS, CUSTOMER_STATUS_LABELS } from '@/lib/constants'
import { formatCurrency, formatNumber, formatRelativeDate } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface CommandHeaderProps {
  customerId: string
}

export function CommandHeader({ customerId }: CommandHeaderProps) {
  const { showToast } = useToast()
  const { data: customer, isLoading, isError, refetch } = useCustomer(customerId)
  const { data: crm } = useCustomerCrm(customerId)

  if (isLoading) return <CustomerHeaderSkeleton />
  if (isError || !customer) {
    return <ErrorState message="مشتری یافت نشد." onRetry={() => refetch()} />
  }

  const lastInteraction = crm?.updatedAt ?? customer.lastActivityDate
  const profitMargin =
    customer.totalRevenue > 0
      ? Math.round((customer.totalProfit / customer.totalRevenue) * 100)
      : null
  const share = customer.walletSharePct

  const meta = [
    customer.email !== '—' ? customer.email : null,
    customer.phone !== '—' ? customer.phone : null,
    `آخرین تعامل: ${formatRelativeDate(lastInteraction)}`,
  ].filter(Boolean)

  return (
    <Card className="h-full gap-0 py-0">
      <CardContent className="flex h-full flex-col gap-3 px-4 py-3.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <h1
            className="text-xl leading-none font-bold tracking-tight text-card-foreground"
            dir="ltr"
          >
            {customer.code}
          </h1>
          {customer.accountStatus && (
            <StatusBadge
              label={ACCOUNT_STATUS_LABELS[customer.accountStatus]}
              variantKey={customer.accountStatus === 'فعال' ? 'healthy' : 'high-risk'}
            />
          )}
          <StatusBadge
            label={CUSTOMER_STATUS_LABELS[customer.status]}
            variantKey={customer.status}
          />
          <ValueTierBadge
            score={customer.valueScore}
            tier={customer.valueTier}
            className="mt-0"
          />
        </div>

        <p className="text-xs text-muted-foreground">{meta.join(' · ')}</p>

        <dl className="grid grid-cols-2 gap-3 border-t pt-3">
          <div>
            <dt className="text-xs text-muted-foreground">سهم از سبد</dt>
            <dd className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-lg font-semibold tabular-nums text-card-foreground">
                {share != null ? `${(share * 100).toFixed(1)}٪` : '—'}
              </span>
              {customer.walletShareAvgPct != null && (
                <span className="text-xs tabular-nums text-muted-foreground">
                  میانگین {(customer.walletShareAvgPct * 100).toFixed(1)}٪
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">سود مشتری</dt>
            <dd className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-lg font-semibold tabular-nums text-card-foreground">
                {formatCurrency(customer.totalProfit)}
              </span>
              {profitMargin != null && (
                <span
                  className={cn(
                    'text-xs tabular-nums',
                    profitMargin >= 15 ? 'text-emerald-700' : 'text-amber-700',
                  )}
                >
                  {formatNumber(profitMargin)}٪ حاشیه
                </span>
              )}
            </dd>
          </div>
        </dl>

        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
          <Button
            type="button"
            size="sm"
            onClick={() => showToast('تماس با مشتری ثبت شد.')}
          >
            <Phone />
            تماس
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => showToast('وظیفه جدید ایجاد شد.')}
          >
            <Plus />
            ایجاد وظیفه
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="اقدامات بیشتر"
          >
            <MoreHorizontal />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
