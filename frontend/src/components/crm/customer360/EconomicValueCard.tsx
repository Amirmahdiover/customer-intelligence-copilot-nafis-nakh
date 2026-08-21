import { AlertTriangle } from 'lucide-react'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { FinancialSection } from '@/components/crm/customer360/FinancialSection'
import { Card, CardContent } from '@/components/ui/card'
import {
  useCustomer,
  useCustomerFinancial,
  useCustomerLiquidity,
  usePortfolioTrailing12mRevenue,
} from '@/hooks/crm/useCrmQueries'
import {
  buildEconomicValue,
  formatTomanCompact,
} from '@/lib/customerEconomicValue'
import { formatNumber } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface EconomicValueCardProps {
  customerId: string
}

const DEPENDENCY_TONE = {
  watch: 'border-amber-200 bg-amber-50/80 text-amber-950',
  high: 'border-amber-300 bg-amber-50 text-amber-950',
  critical: 'border-red-200 bg-red-50 text-red-800',
  'financial-risk': 'border-red-300 bg-red-50 text-red-900',
} as const

export function EconomicValueCard({ customerId }: EconomicValueCardProps) {
  const {
    data: customer,
    isLoading: customerLoading,
    isError: customerError,
    refetch,
  } = useCustomer(customerId)
  const { data: financial } = useCustomerFinancial(customerId)
  const { data: liquidity } = useCustomerLiquidity(customerId)
  const { data: portfolioTotal, isLoading: portfolioLoading } =
    usePortfolioTrailing12mRevenue()

  if (customerLoading || portfolioLoading) return <SectionSkeleton />
  if (customerError || !customer) {
    return (
      <ErrorState
        message="بارگذاری ارزش اقتصادی ناموفق بود."
        onRetry={() => refetch()}
      />
    )
  }

  const model = buildEconomicValue(customer, portfolioTotal, financial)
  const sharePct =
    model.companyRevenueSharePct != null
      ? (model.companyRevenueSharePct * 100).toFixed(1)
      : null
  const walletPct =
    model.walletSharePct != null
      ? Math.round(model.walletSharePct * 100)
      : null
  const liquidityRatioPct =
    liquidity?.liquidityRatio != null ? Math.round(liquidity.liquidityRatio * 100) : null
  const liquidityTone =
    liquidityRatioPct == null
      ? 'text-muted-foreground'
      : liquidityRatioPct > 60
        ? 'text-emerald-600'
        : liquidityRatioPct >= 30
          ? 'text-amber-600'
          : 'text-destructive'

  return (
    <Card className="h-full gap-0 border-border/50 bg-white py-0 shadow-none ring-1 ring-border/25">
      <CardContent className="flex flex-col gap-5 px-5 py-5">
        <h2 className="text-base font-semibold text-card-foreground">
          ارزش اقتصادی و وضعیت مالی مشتری
        </h2>

        <div>
          <p className="text-4xl font-bold leading-none tracking-tight tabular-nums text-teal-600">
            {sharePct != null
              ? `${Number(sharePct).toLocaleString('fa-IR')}٪`
              : '—'}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">سهم از درآمد شرکت</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {model.annualSalesT12m != null && model.annualSalesT12m > 0
              ? `${formatTomanCompact(model.annualSalesT12m)} از فروش خالص ۱۲ ماه گذشته`
              : 'فروش خالص ۱۲ ماه گذشته برای این مشتری ثبت نشده است'}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">سهم از سبد مشتری</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-card-foreground">
              {walletPct != null
                ? `${walletPct.toLocaleString('fa-IR')}٪`
                : '—'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              ظرفیت رشد:{' '}
              <span className="font-medium text-card-foreground">
                {model.growthCapacity ?? '—'}
              </span>
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">الگوی پرداخت</p>
            <p className="mt-1 text-2xl font-bold text-card-foreground">
              {model.payment.label}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {model.payment.caption}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
          <p className="text-xs text-muted-foreground">نقدینگی مشتری</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-card-foreground">
            {liquidity ? formatTomanCompact(liquidity.liquidityContribution) : '—'}
          </p>
          <p className={cn('mt-1 text-xs font-medium', liquidityTone)}>
            {liquidityRatioPct != null
              ? `نسبت نقدینگی: ${liquidityRatioPct.toLocaleString('fa-IR')}٪ از فروش (${liquidity?.period})`
              : 'داده‌ای برای محاسبه نسبت نقدینگی ثبت نشده است'}
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          امتیاز ارزش اقتصادی:{' '}
          <span className="font-semibold tabular-nums text-card-foreground">
            {formatNumber(model.economicScore)} از ۱۰۰
          </span>
        </p>

        {model.dependency ? (
          <div
            className={cn(
              'flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm leading-relaxed',
              DEPENDENCY_TONE[model.dependency.level],
            )}
          >
            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span>{model.dependency.message}</span>
          </div>
        ) : null}

        <div className="border-t border-border/60 pt-4">
          <FinancialSection customerId={customerId} embedded />
        </div>
      </CardContent>
    </Card>
  )
}
