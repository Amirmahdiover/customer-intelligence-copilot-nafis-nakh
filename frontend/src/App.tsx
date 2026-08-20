import { Navigate, Route, Routes } from 'react-router-dom'
import { CrmLayout } from '@/components/crm/layout/CrmLayout'
import { CrmDashboard } from '@/pages/crm/CrmDashboard'
import { CustomersPage } from '@/pages/crm/CustomersPage'
import { OrdersPage } from '@/pages/crm/OrdersPage'
import { ComplaintsPage } from '@/pages/crm/ComplaintsPage'
import { CompetitorsPage } from '@/pages/crm/CompetitorsPage'
import { Customer360 } from '@/pages/crm/Customer360'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/crm" replace />} />
      <Route element={<CrmLayout />}>
        <Route path="/crm" element={<CrmDashboard />} />
        <Route path="/crm/customers" element={<CustomersPage />} />
        <Route path="/crm/customers/:id" element={<Customer360 />} />
        <Route path="/crm/orders" element={<OrdersPage />} />
        <Route path="/crm/complaints" element={<ComplaintsPage />} />
        <Route path="/crm/competitors" element={<CompetitorsPage />} />
      </Route>
    </Routes>
  )
}
