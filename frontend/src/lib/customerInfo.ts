import type { ApiCustomerSegment, ApiCustomerStatus } from '@/types/api'

export interface ParsedCustomerInfo {
  customerId: string
  segment: ApiCustomerSegment | ''
  status: ApiCustomerStatus | ''
}

export function parseCustomerInfo(customerInfo: string): ParsedCustomerInfo {
  const parts = customerInfo.split(',')
  const customerId = (parts[0] ?? '').trim()
  const segment = (parts[1] ?? '').trim() as ApiCustomerSegment | ''
  const status = (parts[2] ?? '').trim() as ApiCustomerStatus | ''

  return { customerId, segment, status }
}

/** Display format: Customer_ID,Customer_Status (e.g. C_010649,فعال) */
export function formatCustomerIdWithStatus(
  customerId: string,
  status: ApiCustomerStatus | '' | null | undefined,
): string {
  if (!customerId) return ''
  if (!status) return customerId
  return `${customerId},${status}`
}
