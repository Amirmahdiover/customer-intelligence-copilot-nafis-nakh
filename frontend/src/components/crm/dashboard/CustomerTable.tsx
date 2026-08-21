import { useNavigate } from 'react-router-dom'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { CustomerTableSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { EmptyState } from '@/components/crm/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useCustomers } from '@/hooks/crm/useCrmQueries'
import {
  CHURN_TREND_LABELS,
  DISPERSION_LABELS,
  getBasketShare,
  getChurnTrend,
  getNextAction,
  getPurchaseDispersion,
} from '@/lib/customerDisplay'
import { formatCurrency, formatRelativeDate, getInitials } from '@/lib/formatters'
import { formatCustomerIdWithStatus } from '@/lib/customerInfo'
import { ACCOUNT_STATUS_LABELS, VALUE_TIER_LABELS } from '@/lib/constants'
import type { CustomerFilters, ValueTier } from '@/types/crm'
import { cn } from '@/lib/utils'
import { ValueTierBadge } from '@/components/crm/shared/ValueTierBadge'

const TIER_DOT_CLASS: Record<ValueTier, string> = {
  'شریک طلایی': 'bg-amber-500',
  'مشتری پایدار': 'bg-emerald-600',
  'مشتری پرچالش': 'bg-amber-500',
  'مشتری قرمز': 'bg-destructive',
}

interface CustomerTableProps {
  filters: CustomerFilters
  onFiltersChange: (filters: CustomerFilters) => void
}

export function CustomerTable({ filters, onFiltersChange }: CustomerTableProps) {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useCustomers(filters)

  if (isLoading) return <CustomerTableSkeleton />
  if (isError) return <ErrorState onRetry={() => refetch()} />
  if (!data || data.data.length === 0) {
    return (
      <EmptyState
        title="مشتری یافت نشد"
        description="فیلترها را تغییر دهید یا جستجوی دیگری انجام دهید."
      />
    )
  }

  return (
    <div className="mt-2">
      <div className="mb-3.5 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">گروه مشتری:</span>
        {(Object.keys(VALUE_TIER_LABELS) as ValueTier[]).map((tier) => (
          <span key={tier} className="inline-flex items-center gap-1.5">
            <span className={cn('size-2 rounded-full', TIER_DOT_CLASS[tier])} />
            {VALUE_TIER_LABELS[tier]}
          </span>
        ))}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>مشتری</TableHead>
            <TableHead>گروه مشتری</TableHead>
            <TableHead>سهم از سبد</TableHead>
            <TableHead>پراکندگی خرید</TableHead>
            <TableHead>آخرین سفارش</TableHead>
            <TableHead>LTV</TableHead>
            <TableHead>روند ریزش</TableHead>
            <TableHead>اقدام بعدی</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.data.map((customer) => {
            const basket = getBasketShare(customer)
            const dispersion = getPurchaseDispersion(customer)
            const churn = getChurnTrend(customer)
            const action = getNextAction(customer)

            const ChurnIcon =
              churn === 'rising'
                ? TrendingUp
                : churn === 'falling'
                  ? TrendingDown
                  : Minus

            return (
              <TableRow
                key={customer.id}
                className="cursor-pointer"
                onClick={() => navigate(`/crm/customers/${customer.id}`)}
              >
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar>
                      <AvatarFallback>{getInitials(customer.code)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold text-card-foreground" dir="ltr">
                        {formatCustomerIdWithStatus(customer.code, customer.accountStatus)}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {customer.accountStatus && (
                          <Badge
                            variant="outline"
                            className={
                              customer.accountStatus === 'فعال'
                                ? 'border-transparent bg-emerald-50 text-emerald-700'
                                : 'border-transparent bg-muted text-muted-foreground'
                            }
                          >
                            {ACCOUNT_STATUS_LABELS[customer.accountStatus]}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {customer.valueTier || customer.valueScore != null ? (
                    <ValueTierBadge
                      score={customer.valueScore}
                      tier={customer.valueTier}
                      className="mt-0"
                    />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="num">{basket.percent}٪</span>
                    {basket.label !== '—' && (
                      <span
                        className={cn(
                          'w-fit text-[0.68rem] text-muted-foreground',
                          basket.percent >= 55 &&
                            'rounded bg-amber-50 px-1.5 py-0.5 text-amber-800',
                        )}
                      >
                        {basket.label}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      dispersion === 'balanced'
                        ? 'border-transparent bg-emerald-50 text-emerald-700'
                        : 'border-transparent bg-amber-50 text-amber-700'
                    }
                  >
                    {DISPERSION_LABELS[dispersion]}
                  </Badge>
                </TableCell>
                <TableCell>{formatRelativeDate(customer.lastOrderDate)}</TableCell>
                <TableCell className="num">
                  {formatCurrency(customer.totalProfit)}
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 text-xs font-semibold',
                      churn === 'rising' && 'text-destructive',
                      churn === 'stable' && 'text-muted-foreground',
                      churn === 'falling' && 'text-emerald-600',
                    )}
                  >
                    <ChurnIcon size={14} />
                    {CHURN_TREND_LABELS[churn]}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs leading-snug text-card-foreground">
                    {action}
                  </span>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-4 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={data.page <= 1}
            onClick={() =>
              onFiltersChange({ ...filters, page: (filters.page ?? 1) - 1 })
            }
          >
            قبلی
          </Button>
          <span className="text-sm text-muted-foreground">
            صفحه {data.page} از {data.totalPages} ({data.total} مشتری)
          </span>
          <Button
            type="button"
            variant="outline"
            disabled={data.page >= data.totalPages}
            onClick={() =>
              onFiltersChange({ ...filters, page: (filters.page ?? 1) + 1 })
            }
          >
            بعدی
          </Button>
        </div>
      )}
    </div>
  )
}
