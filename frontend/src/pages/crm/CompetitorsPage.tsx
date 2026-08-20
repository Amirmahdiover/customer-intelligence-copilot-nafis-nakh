import { EmptyState } from '@/components/crm/shared/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function CompetitorsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 pt-14 lg:px-8 lg:pt-6">
      <header className="mb-5">
        <h1 className="text-[1.35rem] font-bold text-card-foreground">تحلیل رقبا</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          مقایسه عملکرد و سهم بازار — snapshot 2022-06-30
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-[0.95rem]">تحلیل رقابتی</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="به‌زودی"
            description="بخش تحلیل رقبا در حال توسعه است."
          />
        </CardContent>
      </Card>
    </div>
  )
}
