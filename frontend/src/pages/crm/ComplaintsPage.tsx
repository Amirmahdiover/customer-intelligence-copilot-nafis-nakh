import { EmptyState } from '@/components/crm/shared/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ComplaintsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 pt-14 lg:px-8 lg:pt-6">
      <header className="mb-5">
        <h1 className="text-[1.35rem] font-bold text-card-foreground">شکایت‌ها</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          پیگیری شکایت‌های باز و حل‌شده — snapshot 2022-06-30
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-[0.95rem]">فهرست شکایت‌ها</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="به‌زودی"
            description="نمای شکایت‌ها در حال توسعه است و به‌زودی در این صفحه در دسترس خواهد بود."
          />
        </CardContent>
      </Card>
    </div>
  )
}
