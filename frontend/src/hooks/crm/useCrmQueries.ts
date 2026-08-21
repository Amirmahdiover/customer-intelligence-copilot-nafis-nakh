import { useQuery } from '@tanstack/react-query'
import {
  getCrmOverview,
  getCustomerActions,
  getCustomerAIAction,
  getCompanyLiquidity,
  getCustomerBestOffer,
  getCustomerById,
  getCustomerChurn,
  getCustomerLiquidity,
  getCustomerNegotiationScore,
  getCustomerComplaints,
  getCustomerComplaintsCount,
  getCustomerCrm,
  getCustomerCrmInteractions,
  getCustomerFinancial,
  getCustomerInsights,
  getCustomerNotDueInvoices,
  getCustomerOrders,
  getCustomerReturnedChecks,
  getCustomers,
  getComplaints,
  getGlobalInsights,
  getPortfolioTrailing12mRevenue,
} from '@/services/crm/crm.service'
import type { CustomerFilters } from '@/types/crm'

export function useCrmOverview() {
  return useQuery({
    queryKey: ['crm', 'overview'],
    queryFn: getCrmOverview,
  })
}

export function usePortfolioTrailing12mRevenue() {
  return useQuery({
    queryKey: ['crm', 'portfolio', 'trailing-12m-revenue'],
    queryFn: getPortfolioTrailing12mRevenue,
    staleTime: 30 * 60 * 1000,
  })
}

export function useCustomers(filters: CustomerFilters) {
  return useQuery({
    queryKey: ['crm', 'customers', filters],
    queryFn: () => getCustomers(filters),
  })
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['crm', 'customer', id],
    queryFn: () => getCustomerById(id),
    enabled: !!id,
  })
}

export function useCustomerOrders(id: string) {
  return useQuery({
    queryKey: ['crm', 'orders', id],
    queryFn: () => getCustomerOrders(id),
    enabled: !!id,
  })
}

export function useCustomerComplaintsCount(id: string) {
  return useQuery({
    queryKey: ['crm', 'complaints', id, 'count'],
    queryFn: () => getCustomerComplaintsCount(id),
    enabled: !!id,
  })
}

export function useCustomerComplaints(id: string, enabled = true) {
  return useQuery({
    queryKey: ['crm', 'complaints', id],
    queryFn: () => getCustomerComplaints(id),
    enabled: !!id && enabled,
  })
}

export function useComplaints() {
  return useQuery({
    queryKey: ['crm', 'complaints'],
    queryFn: getComplaints,
  })
}

export function useCustomerCrm(id: string) {
  return useQuery({
    queryKey: ['crm', 'crm-latest', id],
    queryFn: () => getCustomerCrm(id),
    enabled: !!id,
  })
}

export function useCustomerCrmInteractions(id: string, enabled = true) {
  return useQuery({
    queryKey: ['crm', 'crm-interactions', id],
    queryFn: () => getCustomerCrmInteractions(id),
    enabled: !!id && enabled,
  })
}

export function useCustomerFinancial(id: string) {
  return useQuery({
    queryKey: ['crm', 'financial', id],
    queryFn: () => getCustomerFinancial(id),
    enabled: !!id,
  })
}

export function useCustomerNotDueInvoices(id: string, enabled = true) {
  return useQuery({
    queryKey: ['crm', 'financial', id, 'not-due'],
    queryFn: () => getCustomerNotDueInvoices(id),
    enabled: !!id && enabled,
  })
}

export function useCustomerReturnedChecks(id: string, enabled = true) {
  return useQuery({
    queryKey: ['crm', 'financial', id, 'returned-checks'],
    queryFn: () => getCustomerReturnedChecks(id),
    enabled: !!id && enabled,
  })
}

export function useCustomerInsights(id: string) {
  return useQuery({
    queryKey: ['crm', 'insights', id],
    queryFn: () => getCustomerInsights(id),
    enabled: !!id,
  })
}

export function useCustomerActions(id: string) {
  return useQuery({
    queryKey: ['crm', 'actions', id],
    queryFn: () => getCustomerActions(id),
    enabled: !!id,
  })
}

/** Independent, cached (15min) AI narration — loads separately from the
 * rule-based action so it never blocks the rest of the customer panel. */
export function useCustomerAIAction(id: string) {
  return useQuery({
    queryKey: ['crm', 'ai-action', id],
    queryFn: () => getCustomerAIAction(id),
    enabled: !!id,
    staleTime: 15 * 60 * 1000,
    retry: 1,
  })
}

export function useCustomerBestOffer(id: string) {
  return useQuery({
    queryKey: ['crm', 'offers', 'best', id],
    queryFn: () => getCustomerBestOffer(id),
    enabled: !!id,
  })
}

export function useCompanyLiquidity(days?: number) {
  return useQuery({
    queryKey: ['crm', 'liquidity', 'company', days],
    queryFn: () => getCompanyLiquidity(days),
    staleTime: 30 * 60 * 1000,
  })
}

export function useCustomerLiquidity(id: string, days?: number) {
  return useQuery({
    queryKey: ['crm', 'liquidity', id, days],
    queryFn: () => getCustomerLiquidity(id, days),
    enabled: !!id,
  })
}

export function useCustomerChurn(id: string) {
  return useQuery({
    queryKey: ['crm', 'churn', id],
    queryFn: () => getCustomerChurn(id),
    enabled: !!id,
  })
}

export function useCustomerNegotiationScore(id: string) {
  return useQuery({
    queryKey: ['crm', 'negotiation-score', id],
    queryFn: () => getCustomerNegotiationScore(id),
    enabled: !!id,
  })
}

export function useGlobalInsights() {
  return useQuery({
    queryKey: ['crm', 'insights', 'global'],
    queryFn: getGlobalInsights,
  })
}
