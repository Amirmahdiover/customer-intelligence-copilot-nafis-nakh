import { getStatusVariant, type StatusVariant } from '@/lib/constants'

interface StatusBadgeProps {
  label: string
  variantKey?: Parameters<typeof getStatusVariant>[0]
  variant?: StatusVariant
}

export function StatusBadge({ label, variantKey, variant }: StatusBadgeProps) {
  const resolvedVariant =
    variant ?? (variantKey ? getStatusVariant(variantKey) : 'info')

  return (
    <span className={`status-badge status-badge--${resolvedVariant}`}>
      {label}
    </span>
  )
}
