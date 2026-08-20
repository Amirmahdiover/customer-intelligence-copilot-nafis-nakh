import { Badge } from '@/components/ui/badge'
import { VALUE_TIER_BADGE_CLASS, VALUE_TIER_LABELS } from '@/lib/constants'
import type { ValueTier } from '@/types/crm'
import { cn } from '@/lib/utils'

interface ValueTierBadgeProps {
  score?: number | null
  tier?: ValueTier | null
  className?: string
}

export function ValueTierBadge({ score, tier, className }: ValueTierBadgeProps) {
  if (tier == null && score == null) return null

  const label = [
    score != null ? String(score) : null,
    tier ? VALUE_TIER_LABELS[tier] : null,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Badge
      variant="outline"
      className={cn(
        'mt-1 font-semibold',
        tier ? VALUE_TIER_BADGE_CLASS[tier] : 'bg-muted text-muted-foreground',
        className,
      )}
    >
      {label}
    </Badge>
  )
}
