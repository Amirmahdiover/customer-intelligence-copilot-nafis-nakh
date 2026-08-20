import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Menu,
  ShoppingCart,
  MessageSquareWarning,
  TrendingUp,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/crm', end: true, icon: LayoutDashboard, label: 'داشبورد' },
  { to: '/crm/customers', end: false, icon: Users, label: 'مشتریان' },
  { to: '/crm/orders', end: true, icon: ShoppingCart, label: 'سفارش‌ها' },
  { to: '/crm/complaints', end: true, icon: MessageSquareWarning, label: 'شکایت‌ها' },
  { to: '/crm/competitors', end: true, icon: TrendingUp, label: 'تحلیل رقبا' },
] as const

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className="mb-6 flex items-center gap-3 border-b pb-4">
        <span className="flex size-9 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
          CI
        </span>
        <span className="text-[0.95rem] font-bold text-card-foreground">کاپیلوت CRM</span>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, end, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3.5 py-2.5 text-sm transition-colors hover:bg-muted',
                isActive && 'bg-accent font-semibold text-primary',
              )
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  )
}

export function CrmLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setSidebarOpen(true)}
        aria-label="منو"
      >
        <Menu />
      </Button>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="right" className="p-5">
          <SheetHeader className="sr-only">
            <SheetTitle>منو</SheetTitle>
          </SheetHeader>
          <SidebarNav onNavigate={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      <aside className="fixed inset-y-0 right-0 z-40 hidden w-60 border-l bg-card p-5 lg:block">
        <SidebarNav />
      </aside>

      <main className="min-w-0 flex-1 lg:mr-60">
        <Outlet />
      </main>
    </div>
  )
}
