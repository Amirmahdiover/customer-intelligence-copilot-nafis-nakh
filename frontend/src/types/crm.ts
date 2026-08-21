export type CustomerStatus = 'healthy' | 'watch' | 'high-risk'
export type ValueTier =
  | 'شریک طلایی'
  | 'مشتری پایدار'
  | 'مشتری پرچالش'
  | 'مشتری قرمز'
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
export type CreditStatus = 'safe' | 'warning' | 'critical' | 'over_limit' | 'unknown'
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
  segment?: string | null
  salesRepId?: string | null
  locationId?: string | null
  creditLimit?: number | null
  status: CustomerStatus
  totalRevenue: number
  totalProfit: number
  orderCount: number
  averageOrderValue: number
  lastOrderDate: string
  typicalOrderInterval: number
  /** Days since last order as of the analytics snapshot. */
  recencyDays?: number | null
  /** Negative means overdue vs this customer's own order pattern as of the snapshot. */
  daysUntilExpectedNextOrder?: number | null
  expectedNextOrderDate?: string | null
  paymentStatus: PaymentStatus
  orderStatus: OrderStatus
  risk: CustomerRisk
  favoriteProducts: ProductMix[]
  revenueTrend: RevenueTrendPoint[]
  payment: PaymentSummary
  lastActivityDate: string
  valueScore?: number | null
  valueTier?: ValueTier | null
  /** Wallet share (Nafis purchase / estimated total purchase) for the latest month on record. */
  walletSharePct?: number | null
  /** Mean wallet share across all months on record. */
  walletShareAvgPct?: number | null
  /** The YYYY-MM the latest wallet share belongs to. */
  walletShareAsOfMonth?: string | null
  /** Net sales in the 365 days ending on the analytics snapshot. */
  annualSalesT12m?: number | null
  /** Realized margin percentage (0-1). */
  marginPct?: number | null
  /** Share of collections marked as bounced check (0-1). */
  bouncedCheckRate?: number | null
  /** Mean collection delay in days. */
  avgPaymentDelayDays?: number | null
  /** Worst single collection delay in days. */
  maxPaymentDelayDays?: number | null
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

export interface CustomerFinancial {
  customerId: string
  outstandingBalance: number
  notDueInvoiceCount: number
  hasReturnedCheck: boolean
  returnedCheckCount: number
  lastReturnedCheckDate: string | null
  creditLimit: number | null
  creditUsedPercent: number | null
  creditRemaining: number | null
  creditStatus: CreditStatus
  delayCost: number
  annualFinancingRate: number
}

export interface NotDueInvoice {
  invoiceId: string | null
  invoiceTotal: number
  amountCollected: number
  outstandingBalance: number
  dueDate: string | null
}

export interface ReturnedCheck {
  date: string | null
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

export interface BestOfferItem {
  offerType: string
  offerReason: string
  productFamily: string | null
  discountPct: number
  validityDays: number
  acceptProbability: number
  businessScore: number
}

export interface BestOffer {
  customerId: string
  method: 'ml_offer_accept'
  best: BestOfferItem
  alternatives: BestOfferItem[]
}

export type ChurnRiskLevelFa = 'پایین' | 'متوسط' | 'بالا'

export interface CustomerChurn {
  customerId: string
  method: 'ml_churn'
  churnProbability: number
  churnPrediction: number
  riskLevel: ChurnRiskLevelFa
  snapshotDate: string | null
}

export type NegotiationPillarKey = 'collection' | 'retention' | 'loyalty' | 'cash'
export type NegotiationPillarMethod = 'ml_model' | 'rule_based_scorecard'
export type NegotiationConfidence = 'high' | 'medium' | 'low'

export interface NegotiationPillar {
  score: number
  weight: number
  contribution: number
  method: NegotiationPillarMethod
  note: string | null
  confidence: NegotiationConfidence
}

export interface NegotiationScore {
  customerId: string
  method: 'negotiation_score'
  negotiationScore: number
  recommendation: string
  pillars: Record<NegotiationPillarKey, NegotiationPillar>
  keyDrivers: string[]
  warnings: string[]
  snapshotDate: string | null
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
  accountStatus?: Exclude<AccountStatus, ''> | 'all'
  risk?: RiskLevel | 'all'
  valueTier?: ValueTier | 'all'
  paymentStatus?: PaymentStatus | 'all'
  orderStatus?: OrderStatus | 'all'
  /** Left undefined the list keeps its stable shuffled order. */
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
