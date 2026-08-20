import { useQuery } from '@tanstack/react-query'
import {
  getCrmOverview,
  getCustomerActions,
  getCustomerById,
  getCustomerComplaints,
  getCustomerComplaintsCount,
  getCustomerCrm,
  getCustomerCrmInteractions,
  getCustomerInsights,
  getCustomerOrders,
  getCustomers,
  getGlobalInsights,
} from '@/services/crm/crm.service'
import type { CustomerFilters } from '@/types/crm'

export function useCrmOverview() {
  return useQuery({
    queryKey: ['crm', 'overview'],
    queryFn: getCrmOverview,
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

export function useGlobalInsights() {
  return useQuery({
    queryKey: ['crm', 'insights', 'global'],
    queryFn: getGlobalInsights,
  })
}
