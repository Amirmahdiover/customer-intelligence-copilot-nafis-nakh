import { ArrowRight } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { ActivityTimeline } from '@/components/crm/customer360/ActivityTimeline'
import { BehaviorPanel } from '@/components/crm/customer360/BehaviorPanel'
import { CommandHeader } from '@/components/crm/customer360/CommandHeader'
import { CrmSection } from '@/components/crm/customer360/CrmSection'
import { CustomerAIAction } from '@/components/crm/customer360/CustomerAIAction'
import { CustomerHealthPanel } from '@/components/crm/customer360/CustomerHealthPanel'
import { FinancialSection } from '@/components/crm/customer360/FinancialSection'
import { InsightCard } from '@/components/crm/customer360/InsightCard'
import { NextBestActionPanel } from '@/components/crm/customer360/NextBestActionPanel'
import { RiskOverview } from '@/components/crm/customer360/RiskOverview'
import { SalesIntelligence } from '@/components/crm/customer360/SalesIntelligence'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function Customer360() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  if (!id) {
    return <p>شناسه مشتری نامعتبر است.</p>
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-5 pt-14 lg:px-6 lg:pt-5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mb-2.5 h-auto px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
        onClick={() => navigate('/crm')}
      >
        <ArrowRight />
        بازگشت به لیست
      </Button>

      <div className="space-y-3">
        <div className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
          <CommandHeader customerId={id} />
          <div className="flex flex-col gap-3">
            <NextBestActionPanel customerId={id} />
            <CustomerAIAction customerId={id} />
          </div>
        </div>

        <SalesIntelligence customerId={id} />

        <div className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-2">
          <CustomerHealthPanel customerId={id} />
          <ActivityTimeline customerId={id} compact />
        </div>
      </div>

      <Tabs defaultValue="risk" className="mt-6">
        <TabsList>
          <TabsTrigger value="risk">ریسک و مالی</TabsTrigger>
          <TabsTrigger value="activity">فعالیت</TabsTrigger>
          <TabsTrigger value="behavior">رفتار و محصولات</TabsTrigger>
          <TabsTrigger value="insights">بینش‌ها</TabsTrigger>
        </TabsList>

        <TabsContent value="risk">
          <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-[360px_1fr]">
            <RiskOverview customerId={id} />
            <FinancialSection customerId={id} />
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <div className="space-y-3">
            <ActivityTimeline customerId={id} />
            <CrmSection customerId={id} />
          </div>
        </TabsContent>

        <TabsContent value="behavior">
          <BehaviorPanel customerId={id} />
        </TabsContent>

        <TabsContent value="insights">
          <InsightCard customerId={id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
