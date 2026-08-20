import { apiFetch } from '@/lib/api'
import { parseCustomerInfo } from '@/lib/customerInfo'
import {
  buildInsights,
  buildProfileFromParts,
  buildSyntheticOrder,
  mapAction,
  mapComplaint,
  mapCustomerInfoToCustomer,
} from '@/services/crm/api.mapper'
import type {
  ApiActionResponse,
  ApiComplaintsResponse,
  ApiCustomerHeaderListResponse,
  ApiCustomerHeaderResponse,
  ApiKpiResponse,
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

async function fetchAllCustomerHeaders(): Promise<string[]> {
  const response = await apiFetch<ApiCustomerHeaderListResponse>('/customers')
  return response.customers.map((item) => item.customer_info)
}

async function enrichCustomer(
  customerInfo: string,
): Promise<Customer> {
  const { customerId } = parseCustomerInfo(customerInfo)
  const [kpis, risk] = await Promise.all([
    apiFetch<ApiKpiResponse>(`/customers/${encodeURIComponent(customerId)}/kpis`).catch(
      () => undefined,
    ),
    apiFetch<ApiRiskResponse>(`/customers/${encodeURIComponent(customerId)}/risk`).catch(
      () => undefined,
    ),
  ])
  return mapCustomerInfoToCustomer(customerInfo, kpis, risk)
}

async function enrichCustomers(
  customerInfos: string[],
): Promise<Customer[]> {
  return Promise.all(customerInfos.map(enrichCustomer))
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
  const headers = await fetchAllCustomerHeaders()
  const parsed = headers.map(parseCustomerInfo)

  const totalCustomers = parsed.length
  const activeCustomers = parsed.filter((p) => p.status === 'فعال').length
  const atRiskCustomers = parsed.filter((p) => p.status === 'غیرفعال').length

  const sampleSize = Math.min(40, headers.length)
  const sample = headers.slice(0, sampleSize)
  const enrichedSample = await enrichCustomers(sample)

  const sampleRevenue = enrichedSample.reduce((sum, c) => sum + c.totalRevenue, 0)
  const totalRevenue =
    sampleSize > 0
      ? Math.round((sampleRevenue / sampleSize) * totalCustomers)
      : 0

  const outstandingPayments = enrichedSample
    .filter((c) => c.risk.overall === 'high')
    .reduce((sum, c) => sum + c.totalRevenue * 0.08, 0)

  const scale =
    atRiskCustomers > 0
      ? atRiskCustomers / Math.max(1, enrichedSample.filter((c) => c.risk.overall === 'high').length)
      : 1

  return {
    totalCustomers,
    newCustomersThisMonth: Math.round(totalCustomers * 0.05),
    activeCustomers,
    atRiskCustomers,
    totalRevenue,
    outstandingPayments: Math.round(outstandingPayments * scale),
  }
}

export async function getCustomers(
  filters: CustomerFilters = {},
): Promise<PaginatedResult<Customer>> {
  const page = filters.page ?? 1
  const limit = filters.limit ?? 10
  const headers = await fetchAllCustomerHeaders()

  const baseCustomers = headers.map((info) => mapCustomerInfoToCustomer(info))
  const filtered = applyClientFilters(baseCustomers, filters)
  const pageSlice = paginate(filtered, page, limit)
  const pageHeaders = pageSlice.data.map((c) => {
    const header = headers.find((h) => parseCustomerInfo(h).customerId === c.id)
    return header ?? `${c.id},,`
  })

  const enrichedPage = await enrichCustomers(pageHeaders)

  return {
    ...pageSlice,
    data: enrichedPage,
  }
}

export async function getCustomerById(id: string): Promise<Customer> {
  const header = await apiFetch<ApiCustomerHeaderResponse>(
    `/customers/${encodeURIComponent(id)}`,
  )

  const [kpis, risk] = await Promise.all([
    apiFetch<ApiKpiResponse>(`/customers/${encodeURIComponent(id)}/kpis`).catch(
      () => undefined,
    ),
    apiFetch<ApiRiskResponse>(`/customers/${encodeURIComponent(id)}/risk`).catch(
      () => undefined,
    ),
  ])

  return mapCustomerInfoToCustomer(header.customer_info, kpis, risk)
}

export async function getCustomerOrders(id: string): Promise<Order[]> {
  const kpis = await apiFetch<ApiKpiResponse>(
    `/customers/${encodeURIComponent(id)}/kpis`,
  ).catch(() => undefined)

  const header = await apiFetch<ApiCustomerHeaderResponse>(
    `/customers/${encodeURIComponent(id)}`,
  ).catch(() => ({ customer_info: `${id},,` }))

  const profile = buildProfileFromParts(header.customer_info, kpis)
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
  const [header, kpis, risk] = await Promise.all([
    apiFetch<ApiCustomerHeaderResponse>(`/customers/${encodeURIComponent(id)}`),
    apiFetch<ApiKpiResponse>(`/customers/${encodeURIComponent(id)}/kpis`).catch(
      () => undefined,
    ),
    apiFetch<ApiRiskResponse>(`/customers/${encodeURIComponent(id)}/risk`).catch(
      () => undefined,
    ),
  ])

  const profile = buildProfileFromParts(header.customer_info, kpis, risk)
  return buildInsights(profile, risk)
}

export async function getCustomerActions(
  id: string,
): Promise<RecommendedAction[]> {
  const [action, header, kpis] = await Promise.all([
    apiFetch<ApiActionResponse>(`/customers/${encodeURIComponent(id)}/actions`),
    apiFetch<ApiCustomerHeaderResponse>(`/customers/${encodeURIComponent(id)}`).catch(
      () => ({ customer_info: `${id},,` }),
    ),
    apiFetch<ApiKpiResponse>(`/customers/${encodeURIComponent(id)}/kpis`).catch(
      () => undefined,
    ),
  ])

  const profile = buildProfileFromParts(header.customer_info, kpis)
  return mapAction(action, profile)
}

export async function getGlobalInsights(): Promise<Insight[]> {
  const headers = await fetchAllCustomerHeaders()
  const inactive = headers
    .map(parseCustomerInfo)
    .filter((p) => p.status === 'غیرفعال')
    .slice(0, 3)

  const segmentC = headers
    .map(parseCustomerInfo)
    .filter((p) => p.segment === 'C' && p.status === 'فعال')
    .slice(0, 3)

  const insights: Insight[] = []

  for (const item of inactive) {
    insights.push({
      id: `global-inactive-${item.customerId}`,
      customerId: item.customerId,
      title: 'مشتری غیرفعال',
      message: `مشتری ${item.customerId} (بخش ${item.segment || '—'}) در وضعیت غیرفعال است.`,
      severity: 'critical',
      isGlobal: true,
    })
  }

  for (const item of segmentC) {
    insights.push({
      id: `global-segment-c-${item.customerId}`,
      customerId: item.customerId,
      title: 'بخش C — نیازمند توجه',
      message: `مشتری فعال ${item.customerId} در بخش C قرار دارد.`,
      severity: 'warning',
      isGlobal: true,
    })
  }

  return insights.slice(0, 6)
}
