import type { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: string
  subtitle?: string
  icon: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
}

export function KpiCard({ title, value, subtitle, icon: Icon, trend }: KpiCardProps) {
  return (
    <div className="kpi-card">
      <div className="kpi-card__header">
        <span className="kpi-card__title">{title}</span>
        <div className="kpi-card__icon">
          <Icon size={18} />
        </div>
      </div>
      <div className="kpi-card__value">{value}</div>
      {subtitle && (
        <div className={`kpi-card__subtitle kpi-card__subtitle--${trend ?? 'neutral'}`}>
          {subtitle}
        </div>
      )}
    </div>
  )
}
