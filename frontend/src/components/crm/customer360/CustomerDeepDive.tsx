import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { BehaviorPanel } from '@/components/crm/customer360/BehaviorPanel'
import { CrmSection } from '@/components/crm/customer360/CrmSection'
import { InsightCard } from '@/components/crm/customer360/InsightCard'

interface CustomerDeepDiveProps {
  customerId: string
}

export function CustomerDeepDive({ customerId }: CustomerDeepDiveProps) {
  const [open, setOpen] = useState(false)

  return (
    <section className="rounded-lg border border-border bg-white">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-start text-sm font-semibold text-card-foreground"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <span>جزئیات تکمیلی</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open ? (
        <div className="space-y-3 border-t px-4 py-4">
          <CrmSection customerId={customerId} />
          <BehaviorPanel customerId={customerId} />
          <InsightCard customerId={customerId} />
        </div>
      ) : null}
    </section>
  )
}
