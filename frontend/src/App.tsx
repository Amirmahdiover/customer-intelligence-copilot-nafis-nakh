import { Navigate, Route, Routes } from 'react-router-dom'
import { CrmLayout } from '@/components/crm/layout/CrmLayout'
import { CrmDashboard } from '@/pages/crm/CrmDashboard'
import { Customer360 } from '@/pages/crm/Customer360'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/crm" replace />} />
      <Route element={<CrmLayout />}>
        <Route path="/crm" element={<CrmDashboard />} />
        <Route path="/crm/customers/:id" element={<Customer360 />} />
      </Route>
    </Routes>
  )
}
