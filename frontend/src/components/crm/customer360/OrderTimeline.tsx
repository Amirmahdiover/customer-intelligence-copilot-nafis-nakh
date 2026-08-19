import { ORDER_TIMELINE_LABELS } from '@/lib/constants'
import type { OrderTimelineStep } from '@/types/crm'

interface OrderTimelineProps {
  currentStep: OrderTimelineStep
  timeline: OrderTimelineStep[]
}

export function OrderTimeline({ currentStep, timeline }: OrderTimelineProps) {
  const currentIndex = timeline.indexOf(currentStep)

  return (
    <div className="order-timeline">
      {timeline.map((step, index) => {
        const isCompleted = index < currentIndex
        const isCurrent = index === currentIndex
        const isPending = index > currentIndex

        return (
          <div
            key={step}
            className={`order-timeline__step ${
              isCompleted
                ? 'order-timeline__step--completed'
                : isCurrent
                  ? 'order-timeline__step--current'
                  : isPending
                    ? 'order-timeline__step--pending'
                    : ''
            }`}
          >
            <div className="order-timeline__dot" />
            <span className="order-timeline__label">
              {ORDER_TIMELINE_LABELS[step]}
            </span>
          </div>
        )
      })}
    </div>
  )
}
