import { Gem, Scale, ShieldAlert, TrendingUp, User, type LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatNumber } from '@/lib/formatters'
import type { StrategicMatrixQuadrantKey, StrategicMatrixResponse } from '../types/dashboard.types'

interface PriorityPortfolioViewProps {
  matrix: StrategicMatrixResponse
}

const QUADRANT_ORDER: StrategicMatrixQuadrantKey[] = [
  'golden_loyal',
  'growth_potential',
  'high_risk_moneymaker',
  'marginal',
]

const QUADRANT_STYLE: Record<
  StrategicMatrixQuadrantKey,
  { cell: string; circle: string; icon: LucideIcon }
> = {
  golden_loyal: {
    cell: 'bg-teal-50/90',
    circle: 'from-teal-400 to-teal-600 shadow-teal-700/20',
    icon: Gem,
  },
  growth_potential: {
    cell: 'bg-amber-50/90',
    circle: 'from-amber-400 to-orange-500 shadow-orange-700/20',
    icon: TrendingUp,
  },
  high_risk_moneymaker: {
    cell: 'bg-rose-50/90',
    circle: 'from-rose-400 to-red-500 shadow-rose-800/20',
    icon: ShieldAlert,
  },
  marginal: {
    cell: 'bg-slate-100/90',
    circle: 'from-slate-400 to-slate-500 shadow-slate-700/20',
    icon: User,
  },
}

export function PriorityPortfolioView({ matrix }: PriorityPortfolioViewProps) {
  return (
    <section className="h-full" aria-labelledby="portfolio-view-heading">
      <Card className="h-full bg-black text-white shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle id="portfolio-view-heading">نقشه ریسک و فرصت</CardTitle>
          <div className="mt-1 flex flex-wrap items-start justify-between gap-2">
            <p className="text-sm font-medium text-white">
              ماتریس استراتژیک مشتریان: ارزش اقتصادی × سلامت رابطه
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] text-white">
              <Scale size={13} aria-hidden="true" />
              {matrix.weighting_note}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative pr-8 pb-8 pt-1">
            <span className="absolute right-0 top-2 text-[10px] text-white/70">زیاد</span>
            <span className="absolute right-0 top-1/2 max-h-[12rem] -translate-y-1/2 text-[10px] leading-none text-white/70 [writing-mode:vertical-rl]">
              سلامت رابطه و خوش‌قولی
            </span>
            <span className="absolute right-0 bottom-10 text-[10px] text-white/70">کم</span>

            <div className="relative min-h-[22rem] overflow-hidden rounded-lg border border-white/15">
              <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 border-l border-white/15" />
              <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 border-t border-white/15" />
              <div dir="rtl" className="grid min-h-[22rem] grid-cols-2">
                {QUADRANT_ORDER.map((key) => {
                  const quadrant = matrix.quadrants.find((item) => item.key === key)
                  if (!quadrant) return null
                  const style = QUADRANT_STYLE[key]
                  const Icon = style.icon
                  return (
                    <article key={key} className={`flex items-center justify-center p-3 ${style.cell}`}>
                      <div
                        className={`flex aspect-square w-[min(100%,11rem)] flex-col items-center justify-center rounded-full bg-gradient-to-b px-3 text-center text-white shadow-md ${style.circle}`}
                      >
                        <Icon className="mb-1 size-5 shrink-0" aria-hidden="true" />
                        <h3 className="text-[11px] font-bold leading-snug">{quadrant.label}</h3>
                        <p className="mt-1 text-sm font-extrabold tabular-nums">
                          {formatNumber(quadrant.count)} شرکت
                        </p>
                        <p className="mt-1 text-[10px] leading-snug text-white/90">{quadrant.action}</p>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end pr-8" dir="ltr">
              <span className="text-[10px] text-white/70">کم</span>
              <span className="min-w-0 flex-1 pb-px text-center text-[10px] text-white/70">
                ارزش اقتصادی (فروش و سود)
              </span>
              <span className="text-[10px] text-white/70">زیاد</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
