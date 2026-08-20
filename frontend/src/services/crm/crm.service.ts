import { apiFetch } from '@/lib/api'
import {
  buildInsights,
  buildSyntheticOrder,
  mapAction,
  mapComplaint,
  mapProfileToCustomer,
  mapSummaryToCustomer,
} from '@/services/crm/api.mapper'
import type {
  ApiActionResponse,
  ApiComplaintsResponse,
  ApiCustomerListResponse,
  ApiCustomerProfile,
  ApiListParams,
  ApiRiskLevel,
  ApiRiskResponse,
} from '@/types/api'
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

function mapFrontendRiskToApi(risk: RiskLevel): ApiRiskLevel {
  const map: Record<RiskLevel, ApiRiskLevel> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
  }
  return map[risk]
}

async function fetchAllSummaries(params: ApiListParams = {}): Promise<ApiCustomerListResponse['items']> {
  const pageSize = 500
  const first = await apiFetch<ApiCustomerListResponse>('/customers', {
    skip: 0,
    limit: pageSize,
    ...params,
  })

  if (first.total <= pageSize) return first.items

  const second = await apiFetch<ApiCustomerListResponse>('/customers', {
    skip: pageSize,
    limit: pageSize,
    ...params,
  })

  return [...first.items, ...second.items]
}

function applyClientFilters(
  customers: Customer[],
  filters: CustomerFilters,
): Customer[] {
  let result = [...customers]

  if (filters.search) {
    const q = filters.search.toLowerCase().trim()
    result = result.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
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
        return (RISK_ORDER[a.risk.overall] - RISK_ORDER[b.risk.overall]) * dir
      case 'name':
      default:
        return a.code.localeCompare(b.code) * dir
    }
  })

  return result
}

function paginate<T>(
  items: T[],
  page: number,
  limit: number,
): PaginatedResult<T> {
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const start = (page - 1) * limit
  return {
    data: items.slice(start, start + limit),
    total,
    page,
    limit,
    totalPages,
  }
}

export async function getCrmOverview(): Promise<CrmOverview> {
  const [all, highRisk, critical] = await Promise.all([
    apiFetch<ApiCustomerListResponse>('/customers', { skip: 0, limit: 1 }),
    apiFetch<ApiCustomerListResponse>('/customers', {
      skip: 0,
      limit: 500,
      risk_level: 'High',
    }),
    apiFetch<ApiCustomerListResponse>('/customers', {
      skip: 0,
      limit: 500,
      risk_level: 'Critical',
    }),
  ])

  const active = await apiFetch<ApiCustomerListResponse>('/customers', {
    skip: 0,
    limit: 1,
    customer_status: 'فعال',
  })

  const sample = await fetchAllSummaries()
  const totalRevenue = sample.reduce(
    (sum, c) => sum + (c.Monetary_Total_Revenue ?? 0),
    0,
  )
  const outstanding = sample
    .filter((c) => c.Risk_Level === 'High' || c.Risk_Level === 'Critical')
    .reduce((sum, c) => sum + (c.Monetary_Total_Revenue ?? 0) * 0.08, 0)

  return {
    totalCustomers: all.total,
    newCustomersThisMonth: Math.round(all.total * 0.05),
    activeCustomers: active.total,
    atRiskCustomers: highRisk.total + critical.total,
    totalRevenue,
    outstandingPayments: outstanding,
  }
}

export async function getCustomers(
  filters: CustomerFilters = {},
): Promise<PaginatedResult<Customer>> {
  const page = filters.page ?? 1
  const limit = filters.limit ?? 10

  const needsClientFilter =
    !!filters.search ||
    (filters.status && filters.status !== 'all') ||
    (filters.paymentStatus && filters.paymentStatus !== 'all') ||
    (filters.orderStatus && filters.orderStatus !== 'all') ||
    !!filters.sortField

  const apiParams: ApiListParams = {
    limit: needsClientFilter ? 500 : limit,
    skip: needsClientFilter ? 0 : (page - 1) * limit,
  }

  if (filters.risk && filters.risk !== 'all') {
    apiParams.risk_level = mapFrontendRiskToApi(filters.risk)
  }

  let items: Customer[]

  if (needsClientFilter) {
    const summaries = await fetchAllSummaries(apiParams)
    items = summaries.map(mapSummaryToCustomer)
    items = applyClientFilters(items, filters)
    return paginate(items, page, limit)
  }

  const response = await apiFetch<ApiCustomerListResponse>('/customers', {
    skip: apiParams.skip,
    limit: apiParams.limit,
    risk_level: apiParams.risk_level,
  })

  items = response.items.map(mapSummaryToCustomer)

  return {
    data: items,
    total: response.total,
    page,
    limit,
    totalPages: Math.ceil(response.total / limit),
  }
}

export async function getCustomerById(id: string): Promise<Customer> {
  const [profile, risk] = await Promise.all([
    apiFetch<ApiCustomerProfile>(`/customers/${encodeURIComponent(id)}`),
    apiFetch<ApiRiskResponse>(`/customers/${encodeURIComponent(id)}/risk`).catch(
      () => undefined,
    ),
  ])

  return mapProfileToCustomer(profile, risk)
}

export async function getCustomerOrders(id: string): Promise<Order[]> {
  const profile = await apiFetch<ApiCustomerProfile>(
    `/customers/${encodeURIComponent(id)}`,
  )
  const synthetic = buildSyntheticOrder(profile)
  return synthetic ? [synthetic] : []
}

export async function getCustomerComplaints(id: string): Promise<Complaint[]> {
  const response = await apiFetch<ApiComplaintsResponse>(
    `/customers/${encodeURIComponent(id)}/complaints`,
  )
  return response.complaints.map(mapComplaint)
}

export async function getCustomerInsights(id: string): Promise<Insight[]> {
  const [profile, risk] = await Promise.all([
    apiFetch<ApiCustomerProfile>(`/customers/${encodeURIComponent(id)}`),
    apiFetch<ApiRiskResponse>(`/customers/${encodeURIComponent(id)}/risk`).catch(
      () => undefined,
    ),
  ])
  return buildInsights(profile, risk)
}

export async function getCustomerActions(
  id: string,
): Promise<RecommendedAction[]> {
  const [action, profile] = await Promise.all([
    apiFetch<ApiActionResponse>(`/customers/${encodeURIComponent(id)}/actions`),
    apiFetch<ApiCustomerProfile>(`/customers/${encodeURIComponent(id)}`).catch(
      () => undefined,
    ),
  ])
  return mapAction(action, profile)
}

export async function getGlobalInsights(): Promise<Insight[]> {
  const [critical, high] = await Promise.all([
    apiFetch<ApiCustomerListResponse>('/customers', {
      skip: 0,
      limit: 5,
      risk_level: 'Critical',
    }),
    apiFetch<ApiCustomerListResponse>('/customers', {
      skip: 0,
      limit: 5,
      risk_level: 'High',
    }),
  ])

  const insights: Insight[] = []

  for (const item of critical.items) {
    insights.push({
      id: `global-${item.Customer_ID}`,
      customerId: item.Customer_ID,
      title: 'ریسک بحرانی',
      message: `مشتری ${item.Customer_ID} — RFM: ${item.RFM_Segment ?? '—'} — درآمد: ${Math.round(item.Monetary_Total_Revenue ?? 0).toLocaleString('fa-IR')}`,
      severity: 'critical',
      isGlobal: true,
    })
  }

  for (const item of high.items) {
    insights.push({
      id: `global-high-${item.Customer_ID}`,
      customerId: item.Customer_ID,
      title: 'ریسک بالا',
      message: `مشتری ${item.Customer_ID} نیازمند پیگیری فوری — ${item.RFM_Segment ?? ''}`,
      severity: 'warning',
      isGlobal: true,
    })
  }

  return insights.slice(0, 6)
}
