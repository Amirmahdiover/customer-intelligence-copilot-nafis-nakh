import { mockCustomers } from '@/data/crm/customers'
import { mockOrders } from '@/data/crm/orders'
import { mockComplaints } from '@/data/crm/complaints'
import { mockInsights } from '@/data/crm/insights'
import { mockActions } from '@/data/crm/actions'
import { simulateDelay } from '@/lib/formatters'
import type {
  Complaint,
  CrmOverview,
  Customer,
  CustomerFilters,
  Insight,
  Order,
  PaginatedResult,
  RecommendedAction,
  RiskLevel,
} from '@/types/crm'

const RISK_ORDER: Record<RiskLevel, number> = { low: 1, medium: 2, high: 3 }

function filterCustomers(filters: CustomerFilters): Customer[] {
  let result = [...mockCustomers]

  if (filters.search) {
    const q = filters.search.toLowerCase().trim()
    result = result.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email.toLowerCase().includes(q),
    )
  }

  if (filters.status && filters.status !== 'all') {
    result = result.filter((c) => c.status === filters.status)
  }

  if (filters.risk && filters.risk !== 'all') {
    result = result.filter((c) => c.risk.overall === filters.risk)
  }

  if (filters.paymentStatus && filters.paymentStatus !== 'all') {
    result = result.filter((c) => c.paymentStatus === filters.paymentStatus)
  }

  if (filters.orderStatus && filters.orderStatus !== 'all') {
    result = result.filter((c) => c.orderStatus === filters.orderStatus)
  }

  const sortField = filters.sortField ?? 'name'
  const sortDir = filters.sortDirection ?? 'asc'
  const dir = sortDir === 'asc' ? 1 : -1

  result.sort((a, b) => {
    switch (sortField) {
      case 'revenue':
        return (a.totalRevenue - b.totalRevenue) * dir
      case 'lastOrder':
        return (
          (new Date(a.lastOrderDate).getTime() -
            new Date(b.lastOrderDate).getTime()) *
          dir
        )
      case 'risk':
        return (
          (RISK_ORDER[a.risk.overall] - RISK_ORDER[b.risk.overall]) * dir
        )
      case 'name':
      default:
        return a.name.localeCompare(b.name, 'fa') * dir
    }
  })

  return result
}

export async function getCrmOverview(): Promise<CrmOverview> {
  await simulateDelay()
  return {
    totalCustomers: 248,
    newCustomersThisMonth: 12,
    activeCustomers: 186,
    atRiskCustomers: 24,
    totalRevenue: 12_800_000_000,
    outstandingPayments: 840_000_000,
  }
}

export async function getCustomers(
  filters: CustomerFilters = {},
): Promise<PaginatedResult<Customer>> {
  await simulateDelay()
  const page = filters.page ?? 1
  const limit = filters.limit ?? 10
  const filtered = filterCustomers(filters)
  const total = filtered.length
  const totalPages = Math.ceil(total / limit)
  const start = (page - 1) * limit
  const data = filtered.slice(start, start + limit)

  return { data, total, page, limit, totalPages }
}

export async function getCustomerById(id: string): Promise<Customer> {
  await simulateDelay()
  const customer = mockCustomers.find((c) => c.id === id)
  if (!customer) {
    throw new Error('مشتری یافت نشد')
  }
  return customer
}

export async function getCustomerOrders(id: string): Promise<Order[]> {
  await simulateDelay()
  return mockOrders.filter((o) => o.customerId === id)
}

export async function getCustomerComplaints(id: string): Promise<Complaint[]> {
  await simulateDelay()
  return mockComplaints.filter((c) => c.customerId === id)
}

export async function getCustomerInsights(id: string): Promise<Insight[]> {
  await simulateDelay()
  return mockInsights.filter((i) => i.customerId === id)
}

export async function getCustomerActions(
  id: string,
): Promise<RecommendedAction[]> {
  await simulateDelay()
  return mockActions.filter((a) => a.customerId === id)
}

export async function getGlobalInsights(): Promise<Insight[]> {
  await simulateDelay()
  return mockInsights.filter((i) => i.isGlobal)
}

export function getActiveOrder(customerId: string): Order | undefined {
  return mockOrders.find((o) => o.customerId === customerId && o.isActive)
}
