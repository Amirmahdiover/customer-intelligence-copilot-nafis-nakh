import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Users, Menu, X } from 'lucide-react'
import { useState } from 'react'

export function CrmLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="crm-layout">
      <button
        type="button"
        className="crm-mobile-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="منو"
      >
        {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {sidebarOpen && (
        <div
          className="crm-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`crm-sidebar ${sidebarOpen ? 'crm-sidebar--open' : ''}`}>
        <div className="crm-sidebar__brand">
          <span className="crm-sidebar__logo">CI</span>
          <span className="crm-sidebar__title">کاپیلوت CRM</span>
        </div>
        <nav className="crm-sidebar__nav">
          <NavLink
            to="/crm"
            end
            className={({ isActive }) =>
              `crm-sidebar__link ${isActive ? 'crm-sidebar__link--active' : ''}`
            }
            onClick={() => setSidebarOpen(false)}
          >
            <LayoutDashboard size={18} />
            <span>داشبورد CRM</span>
          </NavLink>
          <NavLink
            to="/crm"
            className="crm-sidebar__link"
            onClick={() => setSidebarOpen(false)}
          >
            <Users size={18} />
            <span>مشتریان</span>
          </NavLink>
        </nav>
      </aside>

      <main className="crm-main">
        <Outlet />
      </main>
    </div>
  )
}
