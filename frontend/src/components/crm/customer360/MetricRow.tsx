import { cn } from '@/lib/utils'

export type SignalTone = 'critical' | 'warning' | 'caution' | 'positive' | 'neutral'

const DOT_CLASS: Record<SignalTone, string> = {
  critical: 'bg-red-500',
  warning: 'bg-orange-500',
  caution: 'bg-amber-500',
  positive: 'bg-emerald-500',
  neutral: 'bg-muted-foreground/40',
}

const VALUE_CLASS: Record<SignalTone, string> = {
  critical: 'text-red-700',
  warning: 'text-orange-700',
  caution: 'text-amber-700',
  positive: 'text-emerald-700',
  neutral: 'text-card-foreground',
}

export function SignalDot({
  tone,
  className,
}: {
  tone: SignalTone
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn('size-2 shrink-0 rounded-full', DOT_CLASS[tone], className)}
    />
  )
}

interface MetricRowProps {
  label: string
  value: string
  tone?: SignalTone
  hint?: string
  /** `lg` is used for the priority prediction panel in the overview. */
  size?: 'default' | 'lg'
  className?: string
}

/**
 * The single-line replacement for one-number cards. Rows stack inside a shared
 * container instead of each metric owning its own card.
 */
export function MetricRow({
  label,
  value,
  tone = 'neutral',
  hint,
  size = 'default',
  className,
}: MetricRowProps) {
  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-3 border-b border-border/60 last:border-b-0',
        size === 'lg' ? 'py-2.5' : 'py-2',
        className,
      )}
    >
      <div className="min-w-0">
        <span
          className={cn(
            size === 'lg'
              ? 'text-sm font-medium text-card-foreground'
              : 'text-sm text-muted-foreground',
          )}
        >
          {label}
        </span>
        {hint ? (
          <span className="mt-0.5 block text-xs text-muted-foreground/80">{hint}</span>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={cn(
            'font-semibold tabular-nums',
            size === 'lg' ? 'text-base' : 'text-sm',
            VALUE_CLASS[tone],
          )}
        >
          {value}
        </span>
        <SignalDot tone={tone} className="translate-y-px" />
      </div>
    </div>
  )
}
