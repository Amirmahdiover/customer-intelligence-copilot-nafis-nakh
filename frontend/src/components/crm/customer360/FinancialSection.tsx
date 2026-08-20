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
import { formatCurrency, formatDate, formatNumber } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface FinancialSectionProps {
  customerId: string
}

type DetailPanel = 'not-due' | 'returned' | null

export function FinancialSection({ customerId }: FinancialSectionProps) {
  const [detailPanel, setDetailPanel] = useState<DetailPanel>(null)
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
  } = useCustomerNotDueInvoices(customerId, detailPanel === 'not-due')
  const {
    data: returnedChecks,
    isLoading: returnedLoading,
    isError: returnedError,
    refetch: refetchReturned,
  } = useCustomerReturnedChecks(customerId, detailPanel === 'returned')

  if (isLoading) return <SectionSkeleton />
  if (isError || !financial) {
    return <ErrorState onRetry={() => refetch()} />
  }

  const togglePanel = (panel: DetailPanel) => {
    setDetailPanel((prev) => (prev === panel ? null : panel))
  }

  const hasOutstanding = financial.outstandingBalance > 0
  const creditVariant = creditStatusVariant(financial.creditStatus)

  return (
    <Card className="mb-5">
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-md border bg-muted/50 p-3.5">
            <span className="mb-1 block text-xs text-muted-foreground">
              مانده معوق
            </span>
            <span
              className={cn(
                'text-lg font-bold',
                hasOutstanding ? 'text-destructive' : 'text-emerald-600',
              )}
            >
              {formatCurrency(financial.outstandingBalance)}
            </span>
          </div>

          <button
            type="button"
            className={cn(
              'rounded-md border bg-muted/50 p-3.5 text-right transition-colors hover:bg-muted/80',
              detailPanel === 'not-due' && 'ring-2 ring-primary/30',
            )}
            onClick={() => togglePanel('not-due')}
          >
            <span className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              فاکتور سررسیدنرسیده
              {detailPanel === 'not-due' ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
            </span>
            <span className="text-lg font-bold text-card-foreground">
              {formatNumber(financial.notDueInvoiceCount)} فاکتور
            </span>
          </button>

          <button
            type="button"
            className={cn(
              'rounded-md border bg-muted/50 p-3.5 text-right transition-colors hover:bg-muted/80',
              detailPanel === 'returned' && 'ring-2 ring-primary/30',
              financial.hasReturnedCheck && 'border-destructive/30',
            )}
            onClick={() => togglePanel('returned')}
          >
            <span className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              چک برگشتی
              {detailPanel === 'returned' ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
            </span>
            <span
              className={cn(
                'text-lg font-bold',
                financial.hasReturnedCheck
                  ? 'text-destructive'
                  : 'text-card-foreground',
              )}
            >
              {formatNumber(financial.returnedCheckCount)} مورد
            </span>
            {financial.lastReturnedCheckDate && (
              <span className="mt-1 block text-xs text-muted-foreground">
                آخرین: {formatDate(financial.lastReturnedCheckDate)}
              </span>
            )}
          </button>

          <div className="rounded-md border bg-muted/50 p-3.5">
            <span className="mb-1 block text-xs text-muted-foreground">
              اعتبار مصرف‌شده
            </span>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="text-lg font-bold text-card-foreground">
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

          <div className="rounded-md border bg-muted/50 p-3.5">
            <span className="mb-1 block text-xs text-muted-foreground">
              هزینه واقعی تأخیر
            </span>
            <span className="text-lg font-bold text-amber-600">
              {formatCurrency(financial.delayCost)}
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              نرخ سالانه:{' '}
              {(financial.annualFinancingRate * 100).toLocaleString('fa-IR')}٪
            </span>
          </div>
        </div>

        {!hasOutstanding && !financial.hasReturnedCheck && (
          <p className="mt-3 text-sm text-emerald-600">بدهی معوق ثبت نشده است.</p>
        )}

        {detailPanel === 'not-due' && (
          <div className="mt-4">
            {notDueLoading && <SectionSkeleton />}
            {notDueError && <ErrorState onRetry={() => refetchNotDue()} />}
            {!notDueLoading && !notDueError && financial.notDueInvoiceCount === 0 && (
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
                      <TableHead>{FINANCIAL_COLUMN_LABELS.amount_collected}</TableHead>
                      <TableHead>{FINANCIAL_COLUMN_LABELS.outstanding_balance}</TableHead>
                      <TableHead>{FINANCIAL_COLUMN_LABELS.due_date}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notDueInvoices.map((invoice) => (
                      <TableRow key={invoice.invoiceId ?? invoice.dueDate}>
                        <TableCell dir="ltr">{invoice.invoiceId ?? '—'}</TableCell>
                        <TableCell>{formatCurrency(invoice.invoiceTotal)}</TableCell>
                        <TableCell>{formatCurrency(invoice.amountCollected)}</TableCell>
                        <TableCell>{formatCurrency(invoice.outstandingBalance)}</TableCell>
                        <TableCell>
                          {invoice.dueDate ? formatDate(invoice.dueDate) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
          </div>
        )}

        {detailPanel === 'returned' && (
          <div className="mt-4">
            {returnedLoading && <SectionSkeleton />}
            {returnedError && <ErrorState onRetry={() => refetchReturned()} />}
            {!returnedLoading &&
              !returnedError &&
              financial.returnedCheckCount === 0 && (
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
        )}
      </CardContent>
    </Card>
  )
}
