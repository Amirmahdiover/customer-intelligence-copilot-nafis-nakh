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
  ValueTier,
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

export const VALUE_TIER_LABELS: Record<ValueTier, string> = {
  'شریک طلایی': 'شریک طلایی',
  'مشتری پایدار': 'مشتری پایدار',
  'مشتری پرچالش': 'مشتری پرچالش',
  'مشتری قرمز': 'مشتری قرمز',
}

export const VALUE_TIER_BADGE_CLASS: Record<ValueTier, string> = {
  'شریک طلایی': 'border-transparent bg-amber-100 text-amber-800',
  'مشتری پایدار': 'border-transparent bg-emerald-50 text-emerald-700',
  'مشتری پرچالش': 'border-transparent bg-amber-50 text-amber-800',
  'مشتری قرمز': 'border-transparent bg-red-50 text-red-700',
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
