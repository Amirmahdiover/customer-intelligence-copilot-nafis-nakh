import type {
  ActionPriority,
  ActionType,
  ComplaintPriority,
  ComplaintStatus,
  CustomerStatus,
  InsightSeverity,
  OrderStatus,
  PaymentStatus,
  RiskLevel,
} from '@/types/crm'

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  healthy: 'سالم',
  watch: 'نیازمند توجه',
  'high-risk': 'ریسک بالا',
}

export const ACCOUNT_STATUS_LABELS: Record<'فعال' | 'غیرفعال', string> = {
  فعال: 'فعال',
  غیرفعال: 'غیرفعال',
}

export const RISK_LABELS: Record<RiskLevel, string> = {
  low: 'پایین',
  medium: 'متوسط',
  high: 'بالا',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: 'پرداخت‌شده',
  pending: 'در انتظار',
  overdue: 'معوق',
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  'no-active': 'بدون سفارش فعال',
  'in-production': 'در تولید',
  ready: 'آماده',
  delivered: 'تحویل‌شده',
  delayed: 'تأخیر',
}

export const INSIGHT_SEVERITY_LABELS: Record<InsightSeverity, string> = {
  info: 'اطلاع',
  warning: 'هشدار',
  critical: 'بحرانی',
}

export const ACTION_PRIORITY_LABELS: Record<ActionPriority, string> = {
  low: 'پایین',
  medium: 'متوسط',
  high: 'بالا',
}

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  'call-customer': 'تماس با مشتری',
  'follow-up-order': 'پیگیری سفارش',
  'contact-production': 'تماس با تولید',
  'review-pricing': 'بررسی قیمت‌گذاری',
  'follow-up-payment': 'پیگیری پرداخت',
  'create-opportunity': 'ایجاد فرصت فروش',
}

export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  open: 'باز',
  resolved: 'حل‌شده',
}

export const COMPLAINT_PRIORITY_LABELS: Record<ComplaintPriority, string> = {
  low: 'پایین',
  medium: 'متوسط',
  high: 'بالا',
}

export const ORDER_TIMELINE_LABELS: Record<string, string> = {
  created: 'ثبت سفارش',
  confirmed: 'تأیید',
  production: 'تولید',
  ready: 'آماده',
  delivered: 'تحویل',
  paid: 'پرداخت',
}

export const STATUS_VARIANTS = {
  healthy: 'success',
  watch: 'warning',
  'high-risk': 'destructive',
  paid: 'success',
  pending: 'warning',
  overdue: 'destructive',
  low: 'success',
  medium: 'warning',
  high: 'destructive',
  info: 'info',
  warning: 'warning',
  critical: 'destructive',
} as const

export type StatusVariant = (typeof STATUS_VARIANTS)[keyof typeof STATUS_VARIANTS]

export function getStatusVariant(
  key: keyof typeof STATUS_VARIANTS,
): StatusVariant {
  return STATUS_VARIANTS[key]
}
