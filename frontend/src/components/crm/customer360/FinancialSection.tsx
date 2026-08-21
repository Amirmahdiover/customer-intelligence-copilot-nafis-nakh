import { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { StatusBadge } from '@/components/crm/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useCustomerFinancial,
  useCustomerNotDueInvoices,
  useCustomerReturnedChecks,
} from '@/hooks/crm/useCrmQueries'
import {
  CREDIT_STATUS_LABELS,
  FINANCIAL_COLUMN_LABELS,
  creditStatusVariant,
  formatCreditPercent,
} from '@/lib/financialDisplay'
import { daysSince, formatCurrency, formatDate, formatNumber } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface FinancialSectionProps {
  customerId: string
}

/** Days remaining until the due date, measured from the analytics snapshot. */
function daysUntilDue(dueDate: string): number {
  return -daysSince(dueDate)
}

function formatDayCount(days: number): string {
  if (days > 0) return `${formatNumber(days)} روز دیگر`
  if (days === 0) return 'امروز'
  return `${formatNumber(Math.abs(days))} روز گذشته`
}

function formatDaysUntilDue(dueDate: string | null): string {
  if (!dueDate) return '—'
  const days = daysUntilDue(dueDate)
  return Number.isNaN(days) ? '—' : formatDayCount(days)
}

export function FinancialSection({ customerId }: FinancialSectionProps) {
  const [showDetail, setShowDetail] = useState(false)
  const {
    data: financial,
    isLoading,
    isError,
    refetch,
  } = useCustomerFinancial(customerId)
  const {
    data: notDueInvoices,
    isLoading: notDueLoading,
    isError: notDueError,
    refetch: refetchNotDue,
  } = useCustomerNotDueInvoices(customerId, true)
  const {
    data: returnedChecks,
    isLoading: returnedLoading,
    isError: returnedError,
    refetch: refetchReturned,
  } = useCustomerReturnedChecks(customerId, showDetail)

  if (isLoading) return <SectionSkeleton />
  if (isError || !financial) {
    return <ErrorState onRetry={() => refetch()} />
  }

  const creditVariant = creditStatusVariant(financial.creditStatus)

  const upcomingDays = (notDueInvoices ?? [])
    .map((invoice) => (invoice.dueDate ? daysUntilDue(invoice.dueDate) : null))
    .filter((days): days is number => days != null && !Number.isNaN(days))
  const nearestDueDays = upcomingDays.length > 0 ? Math.min(...upcomingDays) : null

  const hasInvoices = financial.notDueInvoiceCount > 0
  const hasChecks = financial.returnedCheckCount > 0

  return (
    <Card className="[--card-spacing:--spacing(4)]">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>وضعیت مالی</CardTitle>
        <div className="flex flex-wrap gap-2">
          {financial.hasReturnedCheck && (
            <Badge variant="destructive" className="gap-1.5">
              <AlertTriangle size={14} />
              چک برگشتی
            </Badge>
          )}
          {(financial.creditStatus === 'critical' ||
            financial.creditStatus === 'over_limit') && (
            <StatusBadge
              label={CREDIT_STATUS_LABELS[financial.creditStatus]}
              variantKey={creditVariant}
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            className={cn(
              'rounded-md border bg-muted/50 p-3 text-start transition-colors hover:bg-muted/80',
              showDetail && 'ring-2 ring-primary/30',
              financial.hasReturnedCheck && 'border-destructive/30',
            )}
            onClick={() => setShowDetail((prev) => !prev)}
            aria-expanded={showDetail}
          >
            <span className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
              فاکتور و چک برگشتی
              {showDetail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
            <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-lg font-bold tabular-nums text-card-foreground">
                {formatNumber(financial.notDueInvoiceCount)} فاکتور
              </span>
              {hasChecks && (
                <span className="text-sm font-semibold tabular-nums text-destructive">
                  · {formatNumber(financial.returnedCheckCount)} چک برگشتی
                </span>
              )}
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {hasInvoices
                ? nearestDueDays != null
                  ? `نزدیک‌ترین سررسید: ${formatDayCount(nearestDueDays)}`
                  : 'تاریخ سررسید ثبت نشده است'
                : 'فاکتور سررسیدنرسیده‌ای وجود ندارد'}
              {financial.lastReturnedCheckDate && (
                <> · آخرین چک: {formatDate(financial.lastReturnedCheckDate)}</>
              )}
            </span>
          </button>

          <div className="rounded-md border bg-muted/50 p-3">
            <span className="mb-1 block text-xs text-muted-foreground">
              اعتبار مصرف‌شده
            </span>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="text-lg font-bold tabular-nums text-card-foreground">
                {formatCreditPercent(financial.creditUsedPercent)}
              </span>
              <StatusBadge
                label={CREDIT_STATUS_LABELS[financial.creditStatus]}
                variantKey={creditVariant}
              />
            </div>
            {financial.creditLimit != null && (
              <span className="block text-xs text-muted-foreground">
                سقف: {formatCurrency(financial.creditLimit)}
                {financial.creditRemaining != null && (
                  <> · باقی‌مانده: {formatCurrency(financial.creditRemaining)}</>
                )}
              </span>
            )}
          </div>

        </div>

        {showDetail && (
          <div className="mt-4 space-y-5">
            <div>
              <h4 className="mb-2 text-xs font-medium text-muted-foreground">
                فاکتورهای سررسیدنرسیده
              </h4>
              {notDueLoading && <SectionSkeleton />}
              {notDueError && <ErrorState onRetry={() => refetchNotDue()} />}
              {!notDueLoading && !notDueError && !hasInvoices && (
                <p className="text-sm text-muted-foreground">
                  فاکتور باز با سررسید آینده (نسبت به snapshot) وجود ندارد.
                </p>
              )}
              {!notDueLoading &&
                !notDueError &&
                notDueInvoices &&
                notDueInvoices.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{FINANCIAL_COLUMN_LABELS.invoice_id}</TableHead>
                        <TableHead>{FINANCIAL_COLUMN_LABELS.invoice_total}</TableHead>
                        <TableHead>
                          {FINANCIAL_COLUMN_LABELS.amount_collected}
                        </TableHead>
                        <TableHead>
                          {FINANCIAL_COLUMN_LABELS.outstanding_balance}
                        </TableHead>
                        <TableHead>{FINANCIAL_COLUMN_LABELS.due_date}</TableHead>
                        <TableHead>
                          {FINANCIAL_COLUMN_LABELS.days_until_due}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notDueInvoices.map((invoice) => {
                        const remaining = invoice.dueDate
                          ? daysUntilDue(invoice.dueDate)
                          : null
                        return (
                          <TableRow key={invoice.invoiceId ?? invoice.dueDate}>
                            <TableCell dir="ltr">{invoice.invoiceId ?? '—'}</TableCell>
                            <TableCell>{formatCurrency(invoice.invoiceTotal)}</TableCell>
                            <TableCell>
                              {formatCurrency(invoice.amountCollected)}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(invoice.outstandingBalance)}
                            </TableCell>
                            <TableCell>
                              {invoice.dueDate ? formatDate(invoice.dueDate) : '—'}
                            </TableCell>
                            <TableCell
                              className={cn(
                                'tabular-nums',
                                remaining != null && remaining < 0 && 'text-destructive',
                              )}
                            >
                              {formatDaysUntilDue(invoice.dueDate)}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
            </div>

            <div>
              <h4 className="mb-2 text-xs font-medium text-muted-foreground">
                چک‌های برگشتی
              </h4>
              {returnedLoading && <SectionSkeleton />}
              {returnedError && <ErrorState onRetry={() => refetchReturned()} />}
              {!returnedLoading && !returnedError && !hasChecks && (
                <p className="text-sm text-muted-foreground">
                  چک برگشتی برای این مشتری ثبت نشده است.
                </p>
              )}
              {!returnedLoading &&
                !returnedError &&
                returnedChecks &&
                returnedChecks.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{FINANCIAL_COLUMN_LABELS.check_date}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {returnedChecks.map((check, index) => (
                        <TableRow key={`${check.date}-${index}`}>
                          <TableCell>
                            {check.date ? formatDate(check.date) : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
