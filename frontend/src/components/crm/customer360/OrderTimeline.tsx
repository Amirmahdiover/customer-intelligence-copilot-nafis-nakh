import { ORDER_TIMELINE_LABELS } from '@/lib/constants'
import type { OrderTimelineStep } from '@/types/crm'
import { cn } from '@/lib/utils'

interface OrderTimelineProps {
  currentStep: OrderTimelineStep
  timeline: OrderTimelineStep[]
}

export function OrderTimeline({ currentStep, timeline }: OrderTimelineProps) {
  const currentIndex = timeline.indexOf(currentStep)

  return (
    <div className="relative flex justify-between pt-4">
      <div className="absolute top-[1.35rem] right-[5%] left-[5%] h-0.5 bg-border" />
      {timeline.map((step, index) => {
        const isCompleted = index < currentIndex
        const isCurrent = index === currentIndex

        return (
          <div
            key={step}
            className="relative z-10 flex flex-1 flex-col items-center gap-2"
          >
            <div
              className={cn(
                'size-3.5 rounded-full border-2 border-card bg-border',
                isCompleted && 'bg-emerald-600',
                isCurrent && 'bg-primary shadow-[0_0_0_3px_var(--accent)]',
              )}
            />
            <span
              className={cn(
                'text-center text-[0.7rem] text-muted-foreground',
                isCurrent && 'font-semibold text-primary',
              )}
            >
              {ORDER_TIMELINE_LABELS[step]}
            </span>
          </div>
        )
      })}
    </div>
  )
}
