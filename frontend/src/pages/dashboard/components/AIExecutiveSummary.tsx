import { BrainCircuit } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DashboardAIExecutiveSummaryResponse } from '../types/dashboard.types'

interface AIExecutiveSummaryProps {
  summary: DashboardAIExecutiveSummaryResponse
}

export function AIExecutiveSummary({ summary }: AIExecutiveSummaryProps) {
  const sourceLabel = summary.source === 'openai' ? 'تحلیل هوشمند فروش' : 'جمع‌بندی داده‌های موجود'
  const sections = [
    { title: 'وضعیت فعلی فروش', value: summary.current_sales_status },
    { title: 'مهم‌ترین ریسک‌ها', value: summary.main_risks },
    { title: 'فرصت‌های قابل پیگیری', value: summary.followable_opportunities },
    { title: 'پیشنهاد اقدام', value: summary.recommended_action },
  ]

  return (
    <section className="mb-6" aria-labelledby="ai-executive-summary-heading">
      <Card className="border-violet-200 bg-gradient-to-l from-violet-50 to-white shadow-sm">
        <CardHeader className="flex-row items-center justify-between gap-3 pb-3">
          <div className="flex items-center gap-2">
            <BrainCircuit className="text-violet-700" size={20} aria-hidden="true" />
            <CardTitle id="ai-executive-summary-heading">{sourceLabel}</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground">برای تصمیم‌گیری تیم فروش</span>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {sections.map((section) => (
            <div key={section.title} className="rounded-lg border border-violet-100 bg-white/75 p-3">
              <h3 className="mb-1.5 text-sm font-bold text-card-foreground">{section.title}</h3>
              <p className="text-sm leading-6 text-muted-foreground">{section.value}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  )
}
