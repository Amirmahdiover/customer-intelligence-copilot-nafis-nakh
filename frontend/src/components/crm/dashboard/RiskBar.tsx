import { getRiskBarVariant } from '@/lib/customerDisplay'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface RiskBarProps {
  percent: number
}

export function RiskBar({ percent }: RiskBarProps) {
  const variant = getRiskBarVariant(percent)

  return (
    <div className="min-w-[100px]">
      <span
        className={cn(
          'mb-1 block text-sm font-bold',
          variant === 'success' && 'text-emerald-600',
          variant === 'warning' && 'text-amber-600',
          variant === 'destructive' && 'text-destructive',
        )}
      >
        {percent}٪
      </span>
      <Progress
        value={percent}
        className={cn(
          variant === 'success' &&
            '[&_[data-slot=progress-indicator]]:bg-emerald-600',
          variant === 'warning' &&
            '[&_[data-slot=progress-indicator]]:bg-amber-500',
          variant === 'destructive' &&
            '[&_[data-slot=progress-indicator]]:bg-destructive',
        )}
      />
    </div>
  )
}
