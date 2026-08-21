import type { CreditStatus } from '@/types/crm'

export const CREDIT_STATUS_LABELS: Record<CreditStatus, string> = {
  safe: 'ایمن',
  warning: 'هشدار',
  critical: 'بحرانی',
  over_limit: 'فراتر از سقف',
  unknown: 'نامشخص',
}

export function creditStatusVariant(
  status: CreditStatus,
): 'healthy' | 'medium' | 'high' | 'high-risk' | 'pending' {
  switch (status) {
    case 'safe':
      return 'healthy'
    case 'warning':
      return 'medium'
    case 'critical':
      return 'high'
    case 'over_limit':
      return 'high-risk'
    default:
      return 'pending'
  }
}

export function formatCreditPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) return '—'
  return `${value.toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪`
}

export const FINANCIAL_COLUMN_LABELS = {
  invoice_id: 'شماره فاکتور',
  invoice_total: 'مبلغ کل',
  amount_collected: 'مبلغ وصول',
  outstanding_balance: 'مانده',
  due_date: 'تاریخ سررسید',
  days_until_due: 'مانده تا سررسید',
  check_date: 'تاریخ چک برگشتی',
} as const
