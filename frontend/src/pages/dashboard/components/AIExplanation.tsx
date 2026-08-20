import { Sparkles } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getDashboardAIExplanation } from '../services/dashboard.service'

interface AIExplanationProps {
  customerId: string
}

/** A compact, independently resilient explanation for one existing decision. */
export function AIExplanation({ customerId }: AIExplanationProps) {
  const explanation = useQuery({
    queryKey: ['dashboard', 'ai-explanation', customerId],
    queryFn: () => getDashboardAIExplanation(customerId),
    staleTime: 15 * 60 * 1000,
    retry: 1,
  })

  if (explanation.isLoading) {
    return <p className="mt-2 text-xs text-muted-foreground">در حال آماده‌سازی تحلیل هوشمند…</p>
  }

  if (explanation.isError || !explanation.data) return null

  const sourceLabel = explanation.data.source === 'openai'
    ? 'تحلیل هوشمند'
    : 'جمع‌بندی داده‌های موجود'

  return (
    <section className="mt-3 rounded-md border border-violet-200 bg-violet-50/60 p-2.5 text-sm" aria-label={sourceLabel}>
      <div className="mb-1.5 flex items-center gap-1.5 font-semibold text-violet-800">
        <Sparkles size={15} aria-hidden="true" />
        {sourceLabel}
      </div>
      <p className="text-muted-foreground">{explanation.data.summary}</p>
      <p className="mt-1.5 text-muted-foreground"><span className="font-semibold text-card-foreground">چرا مهم است؟ </span>{explanation.data.why_it_matters}</p>
      <p className="mt-1.5 text-card-foreground"><span className="font-semibold">اقدام پیشنهادی: </span>{explanation.data.recommended_action}</p>
    </section>
  )
}
