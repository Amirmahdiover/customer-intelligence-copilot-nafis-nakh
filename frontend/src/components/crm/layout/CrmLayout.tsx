import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Users, Menu, ShoppingCart, MessageSquareWarning, TrendingUp } from 'lucide-react'
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

function SidebarNav({ onNavigate, compact = false, onToggle }: { onNavigate?: () => void; compact?: boolean; onToggle?: () => void }) {
  return (
    <>
      <div className={cn('mb-6 flex items-center border-b pb-4', compact ? 'flex-col justify-center gap-2' : 'gap-3')}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">CI</span>
        {!compact && <span className="min-w-0 flex-1 whitespace-nowrap text-[0.95rem] font-bold text-card-foreground">کاپیلوت CRM</span>}
        {onToggle && (
          <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" onClick={onToggle} aria-label={compact ? 'باز کردن منو' : 'بستن منو'}>
            <Menu size={18} />
          </Button>
        )}
      </div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, end, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={compact ? label : undefined}
            onClick={onNavigate}
            className={({ isActive }) => cn(
              'flex items-center rounded-md py-2.5 text-sm transition-colors hover:bg-muted',
              compact ? 'justify-center px-2' : 'gap-3 px-3.5',
              isActive && 'bg-accent font-semibold text-primary',
            )}
          >
            <Icon size={18} />
            {!compact && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>
    </>
  )
}

export function CrmLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(true)

  return (
    <div className="flex min-h-screen">
      <Button type="button" variant="outline" size="icon" className="fixed top-4 left-4 z-50 lg:hidden" onClick={() => setMobileSidebarOpen(true)} aria-label="منو"><Menu /></Button>

      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="right" className="p-5">
          <SheetHeader className="sr-only"><SheetTitle>منو</SheetTitle></SheetHeader>
          <SidebarNav onNavigate={() => setMobileSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      <aside className={cn('fixed inset-y-0 right-0 z-40 hidden overflow-hidden border-l bg-card transition-[width,padding] duration-300 ease-in-out lg:block', desktopSidebarCollapsed ? 'w-16 p-2' : 'w-60 p-5')}>
        <SidebarNav compact={desktopSidebarCollapsed} onToggle={() => setDesktopSidebarCollapsed((collapsed) => !collapsed)} />
      </aside>

      <main className={cn('min-w-0 flex-1 transition-[margin-right] duration-300 ease-in-out', desktopSidebarCollapsed ? 'lg:mr-16' : 'lg:mr-60')}>
        <Outlet />
      </main>
    </div>
  )
}
