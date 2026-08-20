import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  title: string
  value: string
  subtitle?: string
  icon: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
}

export function KpiCard({ title, value, subtitle, icon: Icon, trend }: KpiCardProps) {
  return (
    <Card className="py-4">
      <CardContent>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{title}</span>
          <div className="flex size-8 items-center justify-center rounded-md bg-accent text-primary">
            <Icon size={18} />
          </div>
        </div>
        <div className="text-2xl font-bold text-card-foreground">{value}</div>
        {subtitle && (
          <div
            className={cn(
              'mt-1 text-xs text-muted-foreground',
              trend === 'up' && 'text-emerald-600',
              trend === 'down' && 'text-destructive',
            )}
          >
            {subtitle}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
