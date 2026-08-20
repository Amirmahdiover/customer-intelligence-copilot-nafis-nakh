export type CustomerStatus = 'healthy' | 'watch' | 'high-risk'
export type AccountStatus = 'فعال' | 'غیرفعال' | ''
export type RiskLevel = 'low' | 'medium' | 'high'
export type PaymentStatus = 'paid' | 'pending' | 'overdue'
export type OrderStatus =
  | 'no-active'
  | 'in-production'
  | 'ready'
  | 'delivered'
  | 'delayed'
export type InsightSeverity = 'info' | 'warning' | 'critical'
export type ActionPriority = 'low' | 'medium' | 'high'
export type ActionType =
  | 'call-customer'
  | 'follow-up-order'
  | 'contact-production'
  | 'review-pricing'
  | 'follow-up-payment'
  | 'create-opportunity'
export type ComplaintStatus = 'open' | 'resolved'
export type ComplaintPriority = 'low' | 'medium' | 'high'
export type OrderTimelineStep =
  | 'created'
  | 'confirmed'
  | 'production'
  | 'ready'
  | 'delivered'
  | 'paid'
export type SortField = 'revenue' | 'lastOrder' | 'risk' | 'name'
export type SortDirection = 'asc' | 'desc'

export interface CustomerRisk {
  financial: RiskLevel
  relationship: RiskLevel
  commercial: RiskLevel
  overall: RiskLevel
}

export interface ProductMix {
  name: string
  percentage: number
}

export interface RevenueTrendPoint {
  month: string
  revenue: number
}

export interface PaymentSummary {
  totalRevenue: number
  paid: number
  pending: number
  overdue: number
  overdueDays?: number
}

export interface Customer {
  id: string
  name: string
  code: string
  /** Raw Customer_Status from API: فعال | غیرفعال */
  accountStatus: AccountStatus
  email: string
  phone: string
  status: CustomerStatus
  totalRevenue: number
  totalProfit: number
  orderCount: number
  averageOrderValue: number
  lastOrderDate: string
  typicalOrderInterval: number
  paymentStatus: PaymentStatus
  orderStatus: OrderStatus
  risk: CustomerRisk
  favoriteProducts: ProductMix[]
  revenueTrend: RevenueTrendPoint[]
  payment: PaymentSummary
  lastActivityDate: string
}

export interface Order {
  id: string
  customerId: string
  orderNumber: string
  product: string
  quantity: number
  quantityUnit: string
  status: OrderStatus
  createdDate: string
  promisedDate: string
  isActive: boolean
  delayDays?: number
  currentStep: OrderTimelineStep
  timeline: OrderTimelineStep[]
}

export interface Complaint {
  id: string
  customerId: string
  Product_id: string
  complaint_text: string
  severity: string
  created_at: string
  complaint_status: string
  text_resolution: string | null
}

export interface CrmInteraction {
  nextAction: string | null
  interactionType: string | null
  summaryText: string | null
  updatedAt: string | null
  urgency: string | null
}

export interface CrmLatest {
  customerId: string
  nextAction: string | null
  interactionType: string | null
  summaryText: string | null
  updatedAt: string | null
  urgency: string | null
}

export interface Insight {
  id: string
  customerId: string
  title: string
  message: string
  severity: InsightSeverity
  isGlobal?: boolean
}

export interface RecommendedAction {
  id: string
  customerId: string
  title: string
  reason: string
  priority: ActionPriority
  type: ActionType
}

export interface CrmOverview {
  totalCustomers: number
  newCustomersThisMonth: number
  activeCustomers: number
  atRiskCustomers: number
  totalRevenue: number
  outstandingPayments: number
}

export interface CustomerFilters {
  search?: string
  status?: CustomerStatus | 'all'
  risk?: RiskLevel | 'all'
  paymentStatus?: PaymentStatus | 'all'
  orderStatus?: OrderStatus | 'all'
  sortField?: SortField
  sortDirection?: SortDirection
  page?: number
  limit?: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CustomerListItem extends Customer {
  activeOrder?: Order
}
