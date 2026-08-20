import type { Customer, RiskLevel } from '@/types/crm'

export type ChurnTrend = 'rising' | 'stable' | 'falling'
export type PurchaseDispersion = 'balanced' | 'unbalanced'

export function getRiskPercent(customer: Customer): number {
  const base: Record<RiskLevel, number> = { low: 18, medium: 45, high: 72 }
  let pct = base[customer.risk.overall]
  if (customer.status === 'high-risk') pct = Math.max(pct, 65)
  if (customer.paymentStatus === 'overdue') pct += 8
  if (customer.orderCount > 0 && customer.typicalOrderInterval > 0) {
  const daysSince = Math.floor(
    (new Date('2026-08-19').getTime() - new Date(customer.lastOrderDate).getTime()) /
      86400000,
  )
    if (daysSince > customer.typicalOrderInterval * 1.5) pct += 10
  }
  return Math.min(pct, 95)
}

export function getRiskBarVariant(pct: number): 'success' | 'warning' | 'destructive' {
  if (pct >= 60) return 'destructive'
  if (pct >= 30) return 'warning'
  return 'success'
}

export function getBasketShare(customer: Customer): {
  percent: number
  label: string
} {
  const top = customer.favoriteProducts[0]
  if (!top) return { percent: 0, label: '—' }
  const concentrated = top.percentage >= 55
  return {
    percent: top.percentage,
    label: concentrated ? 'متمرکز — یک محصول' : 'متنوع',
  }
}

export function getPurchaseDispersion(customer: Customer): PurchaseDispersion {
  const top = customer.favoriteProducts[0]?.percentage ?? 0
  return top >= 55 ? 'unbalanced' : 'balanced'
}

export function getChurnTrend(customer: Customer): ChurnTrend {
  if (customer.status === 'high-risk') return 'rising'
  if (customer.status === 'healthy') return 'falling'
  const trend = customer.revenueTrend
  if (trend.length >= 2) {
    const last = trend[trend.length - 1]?.revenue ?? 0
    const prev = trend[trend.length - 2]?.revenue ?? 0
    if (last < prev * 0.85) return 'rising'
    if (last > prev * 1.1) return 'falling'
  }
  return 'stable'
}

export function getNextAction(customer: Customer): string {
  if (customer.status === 'high-risk') return 'تماس فوری مدیر فروش'
  if (customer.paymentStatus === 'overdue') return 'پیگیری پرداخت'
  if (customer.orderStatus === 'delayed') return 'بررسی علت کاهش سفارش'
  if (customer.status === 'watch') return 'پیگیری وضعیت سفارش'
  return 'حفظ روند فعلی'
}

export const CHURN_TREND_LABELS: Record<ChurnTrend, string> = {
  rising: 'رو به افزایش',
  stable: 'پایدار',
  falling: 'رو به کاهش',
}

export const DISPERSION_LABELS: Record<PurchaseDispersion, string> = {
  balanced: 'متعادل',
  unbalanced: 'نامتعادل',
}
