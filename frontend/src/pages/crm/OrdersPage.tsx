import { EmptyState } from '@/components/crm/shared/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function OrdersPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 pt-14 lg:px-8 lg:pt-6">
      <header className="mb-5">
        <h1 className="text-[1.35rem] font-bold text-card-foreground">سفارش‌ها</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          نمای کلی سفارش‌های فعال و تاریخچه — snapshot 2022-06-30
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-[0.95rem]">فهرست سفارش‌ها</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="به‌زودی"
            description="نمای سفارش‌ها در حال توسعه است. فعلاً جزئیات سفارش هر مشتری در صفحه ۳۶۰ در دسترس است."
          />
        </CardContent>
      </Card>
    </div>
  )
}
