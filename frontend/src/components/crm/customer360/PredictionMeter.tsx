import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

export type PredictionTone = 'danger' | 'warning' | 'success' | 'default'

interface PredictionMeterProps {
  value: number
  displayValue: string
  label: string
  modelLabel?: string
  caption?: string
  tone?: PredictionTone
  className?: string
}

const TONE_INDICATOR: Record<PredictionTone, string> = {
  danger: '[&_[data-slot=progress-indicator]]:bg-destructive',
  warning: '[&_[data-slot=progress-indicator]]:bg-amber-500',
  success: '[&_[data-slot=progress-indicator]]:bg-emerald-500',
  default: '[&_[data-slot=progress-indicator]]:bg-primary',
}

const TONE_VALUE: Record<PredictionTone, string> = {
  danger: 'text-destructive',
  warning: 'text-amber-700',
  success: 'text-emerald-700',
  default: 'text-card-foreground',
}

export function PredictionMeter({
  value,
  displayValue,
  label,
  modelLabel,
  caption,
  tone = 'default',
  className,
}: PredictionMeterProps) {
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-end justify-between gap-3">
        <span
          className={cn(
            'text-3xl font-bold leading-none tracking-tight',
            TONE_VALUE[tone],
          )}
        >
          {displayValue}
        </span>
        {modelLabel ? (
          <Badge variant="outline" className="mb-0.5 shrink-0 font-normal">
            {modelLabel}
          </Badge>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <Progress
        value={clamped}
        className={cn('h-2.5', TONE_INDICATOR[tone])}
      />
      {caption ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{caption}</p>
      ) : null}
    </div>
  )
}
