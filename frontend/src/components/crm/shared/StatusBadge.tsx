import { Badge } from '@/components/ui/badge'
import { getStatusVariant, type StatusVariant } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  label: string
  variantKey?: Parameters<typeof getStatusVariant>[0]
  variant?: StatusVariant
}

const variantClasses: Record<StatusVariant, string> = {
  success: 'border-transparent bg-emerald-50 text-emerald-700',
  warning: 'border-transparent bg-amber-50 text-amber-700',
  destructive: '',
  info: 'border-transparent bg-sky-50 text-sky-700',
}

export function StatusBadge({ label, variantKey, variant }: StatusBadgeProps) {
  const resolvedVariant =
    variant ?? (variantKey ? getStatusVariant(variantKey) : 'info')

  return (
    <Badge
      variant={resolvedVariant === 'destructive' ? 'destructive' : 'outline'}
      className={cn(variantClasses[resolvedVariant])}
    >
      {label}
    </Badge>
  )
}
