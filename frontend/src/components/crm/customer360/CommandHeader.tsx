import { Copy } from 'lucide-react'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { CustomerHeaderSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { useToast } from '@/components/crm/shared/Toast'
import { Button } from '@/components/ui/button'
import {
  useCustomer,
  useCustomerNegotiationScore,
} from '@/hooks/crm/useCrmQueries'
import { cn } from '@/lib/utils'

interface CommandHeaderProps {
  customerId: string
}

function collectionRiskLabel(score: number): { text: string; className: string } {
  if (score < 0.45) {
    return {
      text: 'ریسک وصول: بالا',
      className: 'bg-orange-200 text-amber-700',
    }
  }
  if (score < 0.7) {
    return {
      text: 'ریسک وصول: متوسط',
      className: 'bg-amber-100 text-amber-800',
    }
  }
  return {
    text: 'ریسک وصول: پایین',
    className: 'bg-emerald-50 text-emerald-700',
  }
}

function healthTag(score: number): { text: string; className: string } {
  const rounded = Math.round(score)
  if (score < 45) {
    return {
      text: `سلامت رابطه: ${rounded.toLocaleString('fa-IR')} از ۱۰۰ در بحرانی`,
      className: 'bg-red-100 text-red-600',
    }
  }
  if (score < 70) {
    return {
      text: `سلامت رابطه: ${rounded.toLocaleString('fa-IR')} از ۱۰۰ متوسط`,
      className: 'bg-amber-100 text-amber-800',
    }
  }
  return {
    text: `سلامت رابطه: ${rounded.toLocaleString('fa-IR')} از ۱۰۰ سالم`,
    className: 'bg-emerald-50 text-emerald-700',
  }
}

export function CommandHeader({ customerId }: CommandHeaderProps) {
  const { showToast } = useToast()
  const { data: customer, isLoading, isError, refetch } = useCustomer(customerId)
  const { data: negotiation } = useCustomerNegotiationScore(customerId)

  if (isLoading) return <CustomerHeaderSkeleton />
  if (isError || !customer) {
    return <ErrorState message="مشتری یافت نشد." onRetry={() => refetch()} />
  }

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(customer.code)
      showToast('شناسه مشتری کپی شد.')
    } catch {
      showToast('کپی شناسه انجام نشد.')
    }
  }

  const collection = negotiation?.pillars.collection
  const collectionTag = collection ? collectionRiskLabel(collection.score) : null
  const health = negotiation ? healthTag(negotiation.negotiationScore) : null

  return (
    <header className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {customer.accountStatus ? (
          <span
            className={cn(
              'rounded px-3 py-1.5 text-xs font-medium',
              customer.accountStatus === 'فعال'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-neutral-100 text-neutral-500',
            )}
          >
            {customer.accountStatus}
          </span>
        ) : null}
        {health ? (
          <span className={cn('rounded px-3 py-1.5 text-xs font-medium', health.className)}>
            {health.text}
          </span>
        ) : null}
        {collectionTag ? (
          <span
            className={cn(
              'rounded px-3 py-1.5 text-xs font-medium',
              collectionTag.className,
            )}
          >
            {collectionTag.text}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <h1
          className="text-[32px] font-bold leading-none tracking-tight text-black"
          dir="ltr"
        >
          {customer.code}
        </h1>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="کپی شناسه"
          onClick={() => void copyId()}
        >
          <Copy size={14} />
        </Button>
        {customer.segment ? (
          <span className="rounded-md bg-neutral-100 px-3 py-1.5 text-sm font-semibold text-neutral-800">
            سگمنت {customer.segment}
          </span>
        ) : null}
      </div>
    </header>
  )
}
