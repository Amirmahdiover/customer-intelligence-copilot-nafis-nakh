import { Mail, Phone, Plus, Send } from 'lucide-react'
import { useToast } from '@/components/crm/shared/Toast'
import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { Button } from '@/components/ui/button'
import { useCustomerBestOffer } from '@/hooks/crm/useCrmQueries'

interface CustomerSidebarProps {
  customerId: string
}

export function CustomerSidebar({ customerId }: CustomerSidebarProps) {
  const { showToast } = useToast()
  const { data: offer, isLoading, isError, refetch } = useCustomerBestOffer(customerId)

  const opportunities = offer
    ? [offer.best, ...offer.alternatives.slice(0, 2)].filter(Boolean)
    : []

  const actions = [
    { icon: Phone, label: 'تماس', toast: 'تماس با مشتری ثبت شد.' },
    { icon: Mail, label: 'ایمیل', toast: 'پیش‌نویس ایمیل آماده شد.' },
    { icon: Plus, label: 'وظیفه جدید', toast: 'وظیفه جدید ایجاد شد.' },
    { icon: Send, label: 'ارسال پیشنهاد', toast: 'ارسال پیشنهاد ثبت شد.' },
  ] as const

  return (
    <aside className="flex flex-col gap-6">
      <section className="rounded-md bg-neutral-50 p-4">
        <h4 className="mb-3 text-sm font-semibold">اقدامات فوری</h4>
        {actions.map((action) => (
          <Button
            key={action.label}
            type="button"
            variant="outline"
            className="mb-2 w-full justify-start bg-white text-sm"
            onClick={() => showToast(action.toast)}
          >
            <action.icon />
            {action.label}
          </Button>
        ))}
      </section>

      <section className="rounded-md bg-neutral-50 p-4">
        <h4 className="mb-3 text-sm font-semibold">فرصت‌های فروش</h4>
        {isLoading ? (
          <SectionSkeleton />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : opportunities.length === 0 ? (
          <p className="text-xs text-muted-foreground">فرصتی ثبت نشده است.</p>
        ) : (
          <ul className="space-y-2">
            {opportunities.map((item, index) => (
              <li
                key={`${item.offerType}-${index}`}
                className="rounded border border-border bg-white px-2.5 py-2 text-xs leading-relaxed"
              >
                <p className="font-medium text-card-foreground">
                  آفر {item.offerType}
                </p>
                <p className="mt-0.5 text-muted-foreground">{item.offerReason}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  )
}
