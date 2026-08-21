import { apiFetch } from '@/lib/api'
import { parseCustomerInfo } from '@/lib/customerInfo'
import {
  buildInsights,
  buildProfileFromParts,
  buildSyntheticOrder,
  mapAction,
  mapBestOffer,
  mapChurn,
  mapNegotiationScore,
  mapComplaintDetail,
  mapCrmInteraction,
  mapCrmLatest,
  mapCustomerFinancial,
  mapCustomerInfoToCustomer,
  mapNotDueInvoices,
  mapReturnedChecks,
  applyCustomerValue,
} from '@/services/crm/api.mapper'
import type {
  ApiActionResponse,
  ApiBestOfferResponse,
  ApiChurnResponse,
  ApiComplaintsCountResponse,
  ApiCrmInteractionsListResponse,
  ApiCrmLatestResponse,
  ApiCustomerAIActionResponse,
  ApiCustomerComplaintsResponse,
  ApiCustomerFinancialResponse,
  ApiCustomerHeaderListResponse,
  ApiCustomerHeaderResponse,
  ApiKpiResponse,
  ApiNegotiationScoreResponse,
  ApiNotDueInvoicesResponse,
  ApiReturnedChecksResponse,
  ApiRiskResponse,
  ApiCustomerValueItem,
  ApiCustomerValueListResponse,
} from '@/types/api'
import type {
  BestOffer,
  CustomerChurn,
  Complaint,
  CrmInteraction,
  CrmLatest,
  CrmOverview,
  Customer,
  CustomerFilters,
  CustomerFinancial,
  Insight,
  NegotiationScore,
  NotDueInvoice,
  Order,
  PaginatedResult,
  RecommendedAction,
  ReturnedCheck,
  RiskLevel,
} from '@/types/crm'

const RISK_ORDER: Record<RiskLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
}

/**
 * دریافت لیست کامل مشتریان از بک‌اند
 */
async function fetchAllCustomerHeaders(): Promise<string[]> {
  const response = await apiFetch<ApiCustomerHeaderListResponse>('/customers')

  return response.customers.map((item) => item.customer_info)
}

/**
 * FNV-1a over the customer id. Every customer gets a fixed pseudo-random rank,
 * so the unsorted listing is not clustered by risk or account status while
 * staying identical across pages and refetches.
 */
function shuffleRank(id: string): number {
  let hash = 0x811c9dc5

  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }

  return hash >>> 0
}

/**
 * فیلتر و مرتب‌سازی سمت کلاینت
 */
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

  if (filters.accountStatus && filters.accountStatus !== 'all') {
    result = result.filter((c) => c.accountStatus === filters.accountStatus)
  }

  if (filters.risk && filters.risk !== 'all') {
    result = result.filter((c) => c.risk.overall === filters.risk)
  }

  if (filters.valueTier && filters.valueTier !== 'all') {
    result = result.filter((c) => c.valueTier === filters.valueTier)
  }

  if (filters.paymentStatus && filters.paymentStatus !== 'all') {
    result = result.filter((c) => c.paymentStatus === filters.paymentStatus)
  }

  if (filters.orderStatus && filters.orderStatus !== 'all') {
    result = result.filter((c) => c.orderStatus === filters.orderStatus)
  }

  const sortField = filters.sortField

  if (!sortField) {
    return result.sort((a, b) => shuffleRank(a.id) - shuffleRank(b.id))
  }

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
        return a.code.localeCompare(b.code) * dir
    }
  })

  return result
}

/**
 * Pagination سمت کلاینت
 */
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

/**
 * ============================================================
 * CRM OVERVIEW
 * ============================================================
 *
 * مهم:
 * قبلاً اینجا اعداد به صورت دستی محاسبه می‌شدند و بعضی فیلدها
 * مثل totalRevenue و outstandingPayments برابر 0 بودند.
 *
 * بک‌اند جدید endpoint واقعی زیر را دارد:
 *
 * GET /dashboard/overview
 *
 * بنابراین مستقیماً از بک‌اند می‌خوانیم.
 */
export async function getCrmOverview(): Promise<CrmOverview> {
  const response = await apiFetch<CrmOverview>('/dashboard/overview')

  return response
}

/**
 * Portfolio net sales over the trailing 12 months ending on the analytics
 * snapshot — denominator for «سهم از درآمد شرکت».
 */
export async function getPortfolioTrailing12mRevenue(): Promise<number> {
  const response = await apiFetch<{
    metrics: Array<{ key: string; value: number }>
  }>('/dashboard/overview')

  const metric = response.metrics?.find((item) => item.key === 'trailing_12m_revenue')
  return metric?.value ?? 0
}

/**
 * ============================================================
 * CUSTOMER VALUES
 * ============================================================
 */
async function fetchAllCustomerValues(): Promise<
  Map<string, ApiCustomerValueItem>
> {
  try {
    const response = await apiFetch<ApiCustomerValueListResponse>(
      '/value-segments/customers',
    )

    return new Map(
      response.customers.map((item) => [item.customer_id, item]),
    )
  } catch {
    return new Map()
  }
}

/**
 * ============================================================
 * CUSTOMERS
 * ============================================================
 */
export async function getCustomers(
  filters: CustomerFilters = {},
): Promise<PaginatedResult<Customer>> {
  const page = filters.page ?? 1
  const limit = filters.limit ?? 10

  const [headers, values] = await Promise.all([
    fetchAllCustomerHeaders(),
    fetchAllCustomerValues(),
  ])

  const baseCustomers = headers.map((info) => {
    const customer = mapCustomerInfoToCustomer(info)

    return applyCustomerValue(customer, values.get(customer.id))
  })

  const filtered = applyClientFilters(baseCustomers, filters)

  return paginate(filtered, page, limit)
}

/**
 * ============================================================
 * CUSTOMER DETAIL
 * ============================================================
 */
export async function getCustomerById(id: string): Promise<Customer> {
  const encodedId = encodeURIComponent(id)

  const header = await apiFetch<ApiCustomerHeaderResponse>(
    `/customers/${encodedId}`,
  )

  const [kpis, risk, value] = await Promise.all([
    apiFetch<ApiKpiResponse>(`/customers/${encodedId}/kpis`).catch(
      () => undefined,
    ),

    apiFetch<ApiRiskResponse>(`/customers/${encodedId}/risk`).catch(
      () => undefined,
    ),

    apiFetch<ApiCustomerValueItem>(`/customers/${encodedId}/value`).catch(
      () => undefined,
    ),
  ])

  return applyCustomerValue(
    mapCustomerInfoToCustomer(header.customer_info, kpis, risk),
    value,
  )
}

/**
 * ============================================================
 * CUSTOMER ORDERS
 * ============================================================
 */
export async function getCustomerOrders(id: string): Promise<Order[]> {
  const encodedId = encodeURIComponent(id)

  const kpis = await apiFetch<ApiKpiResponse>(
    `/customers/${encodedId}/kpis`,
  ).catch(() => undefined)

  const header = await apiFetch<ApiCustomerHeaderResponse>(
    `/customers/${encodedId}`,
  ).catch(() => ({
    customer_info: `${id},,`,
  }))

  const profile = buildProfileFromParts(header.customer_info, kpis)

  const synthetic = buildSyntheticOrder(profile)

  return synthetic ? [synthetic] : []
}

/**
 * ============================================================
 * COMPLAINT COUNT
 * ============================================================
 */
export async function getCustomerComplaintsCount(
  id: string,
): Promise<number> {
  const response = await apiFetch<ApiComplaintsCountResponse>(
    `/customers/${encodeURIComponent(id)}/complaints/count`,
  )

  return response.complaints_count
}

/**
 * ============================================================
 * COMPLAINTS
 * ============================================================
 */
export async function getCustomerComplaints(
  id: string,
): Promise<Complaint[]> {
  const response = await apiFetch<ApiCustomerComplaintsResponse>(
    `/customers/${encodeURIComponent(id)}/complaints`,
  )

  return response.complaints.map((record, index) =>
    mapComplaintDetail(response.customer_id, record, index),
  )
}

/**
 * ============================================================
 * CRM LATEST
 * ============================================================
 */
export async function getCustomerCrm(id: string): Promise<CrmLatest> {
  const response = await apiFetch<ApiCrmLatestResponse>(
    `/customers/${encodeURIComponent(id)}/crm`,
  )

  return mapCrmLatest(response)
}

/**
 * ============================================================
 * CRM INTERACTIONS
 * ============================================================
 */
export async function getCustomerCrmInteractions(
  id: string,
): Promise<CrmInteraction[]> {
  const response = await apiFetch<ApiCrmInteractionsListResponse>(
    `/customers/${encodeURIComponent(id)}/crm/interactions`,
  )

  return response.interactions.map(mapCrmInteraction)
}

/**
 * ============================================================
 * FINANCIAL
 * ============================================================
 */
export async function getCustomerFinancial(
  id: string,
): Promise<CustomerFinancial> {
  const response = await apiFetch<ApiCustomerFinancialResponse>(
    `/customers/${encodeURIComponent(id)}/financial`,
  )

  return mapCustomerFinancial(response)
}

/**
 * ============================================================
 * NOT DUE INVOICES
 * ============================================================
 */
export async function getCustomerNotDueInvoices(
  id: string,
): Promise<NotDueInvoice[]> {
  const response = await apiFetch<ApiNotDueInvoicesResponse>(
    `/customers/${encodeURIComponent(id)}/financial/not-due-invoices`,
  )

  return mapNotDueInvoices(response)
}

/**
 * ============================================================
 * RETURNED CHECKS
 * ============================================================
 */
export async function getCustomerReturnedChecks(
  id: string,
): Promise<ReturnedCheck[]> {
  const response = await apiFetch<ApiReturnedChecksResponse>(
    `/customers/${encodeURIComponent(id)}/financial/returned-checks`,
  )

  return mapReturnedChecks(response)
}

/**
 * ============================================================
 * CUSTOMER INSIGHTS
 * ============================================================
 */
export async function getCustomerInsights(
  id: string,
): Promise<Insight[]> {
  const encodedId = encodeURIComponent(id)

  const [header, kpis, risk] = await Promise.all([
    apiFetch<ApiCustomerHeaderResponse>(
      `/customers/${encodedId}`,
    ),

    apiFetch<ApiKpiResponse>(
      `/customers/${encodedId}/kpis`,
    ).catch(() => undefined),

    apiFetch<ApiRiskResponse>(
      `/customers/${encodedId}/risk`,
    ).catch(() => undefined),
  ])

  const profile = buildProfileFromParts(
    header.customer_info,
    kpis,
    risk,
  )

  return buildInsights(profile, risk)
}

/**
 * ============================================================
 * CUSTOMER ACTIONS
 * ============================================================
 */
export async function getCustomerActions(
  id: string,
): Promise<RecommendedAction[]> {
  const encodedId = encodeURIComponent(id)

  const [action, header, kpis] = await Promise.all([
    apiFetch<ApiActionResponse>(
      `/customers/${encodedId}/actions`,
    ),

    apiFetch<ApiCustomerHeaderResponse>(
      `/customers/${encodedId}`,
    ).catch(() => ({
      customer_info: `${id},,`,
    })),

    apiFetch<ApiKpiResponse>(
      `/customers/${encodedId}/kpis`,
    ).catch(() => undefined),
  ])

  const profile = buildProfileFromParts(
    header.customer_info,
    kpis,
  )

  return mapAction(action, profile)
}

/**
 * ============================================================
 * CUSTOMER AI ACTION
 * ============================================================
 *
 * Server-side OpenAI narration of a deterministic rule-based baseline
 * (risk, RFM, purchase status, debt, tickets). The browser never receives
 * the OpenAI key; the backend caches by a hash of the input factors.
 */
export async function getCustomerAIAction(
  id: string,
): Promise<ApiCustomerAIActionResponse> {
  return apiFetch<ApiCustomerAIActionResponse>(
    `/dashboard/ai/customer-action/${encodeURIComponent(id)}`,
  )
}

/**
 * ============================================================
 * BEST OFFER
 * ============================================================
 */
export async function getCustomerBestOffer(
  id: string,
): Promise<BestOffer> {
  const response = await apiFetch<ApiBestOfferResponse>(
    `/customers/${encodeURIComponent(id)}/offers/best`,
  )

  return mapBestOffer(response)
}

/**
 * ============================================================
 * CHURN
 * ============================================================
 */
export async function getCustomerChurn(
  id: string,
): Promise<CustomerChurn> {
  const response = await apiFetch<ApiChurnResponse>(
    `/customers/${encodeURIComponent(id)}/churn`,
  )

  return mapChurn(response)
}

/**
 * ============================================================
 * NEGOTIATION SCORE
 * ============================================================
 */
export async function getCustomerNegotiationScore(
  id: string,
): Promise<NegotiationScore> {
  const response = await apiFetch<ApiNegotiationScoreResponse>(
    `/customers/${encodeURIComponent(id)}/negotiation-score`,
  )
  return mapNegotiationScore(response)
}

/**
 * ============================================================
 * GLOBAL INSIGHTS
 * ============================================================
 */
export async function getGlobalInsights(): Promise<Insight[]> {
  const headers = await fetchAllCustomerHeaders()

  const parsed = headers.map(parseCustomerInfo)

  const inactive = parsed
    .filter((p) => p.status === 'غیرفعال')
    .slice(0, 3)

  const segmentC = parsed
    .filter(
      (p) =>
        p.segment === 'C' &&
        p.status === 'فعال',
    )
    .slice(0, 3)

  const insights: Insight[] = []

  for (const item of inactive) {
    insights.push({
      id: `global-inactive-${item.customerId}`,
      customerId: item.customerId,
      title: 'مشتری غیرفعال',
      message: `مشتری ${item.customerId} (بخش ${
        item.segment || '—'
      }) در وضعیت غیرفعال است.`,
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
