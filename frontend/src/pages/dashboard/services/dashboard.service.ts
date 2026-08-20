import { apiFetch } from '@/lib/api'
import type {
  DashboardAIExecutiveSummaryResponse,
  DashboardAIExplanationResponse,
  DashboardOverviewResponse,
  DashboardPriorityCustomer,
  ExecutiveSummaryResponse,
  RiskOpportunityMapResponse,
} from '../types/dashboard.types'

/** Read-only access to the isolated Dashboard API endpoints. */
export function getDashboardOverview() {
  return apiFetch<DashboardOverviewResponse>('/dashboard/overview')
}

export function getDashboardPriorities(limit = 8) {
  return apiFetch<DashboardPriorityCustomer[]>('/dashboard/priorities', { limit })
}

export function getRiskOpportunityMap() {
  return apiFetch<RiskOpportunityMapResponse>('/dashboard/risk-opportunity-map')
}

export function getExecutiveSummary() {
  return apiFetch<ExecutiveSummaryResponse>('/dashboard/summary')
}

/** Server-side AI explanation. The browser never receives the OpenAI key. */
export function getDashboardAIExplanation(customerId: string) {
  return apiFetch<DashboardAIExplanationResponse>(`/dashboard/ai/explanation/${encodeURIComponent(customerId)}`)
}

export function getDashboardAIExecutiveSummary() {
  return apiFetch<DashboardAIExecutiveSummaryResponse>('/dashboard/ai/executive-summary')
}
