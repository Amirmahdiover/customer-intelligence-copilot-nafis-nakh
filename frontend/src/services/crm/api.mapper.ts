import { formatCustomerIdWithStatus, parseCustomerInfo } from '@/lib/customerInfo'
import { SNAPSHOT_DATE } from '@/lib/constants'
import type {
  ApiActionResponse,
  ApiBestOfferResponse,
  ApiChurnResponse,
  ApiCompanyLiquidityResponse,
  ApiComplaintDetail,
  ApiComplaintRecord,
  ApiCrmInteractionItem,
  ApiCrmLatestResponse,
  ApiCustomerFinancialResponse,
  ApiCustomerLiquidityResponse,
  ApiCustomerProfile,
  ApiCustomerSummary,
  ApiKpiResponse,
  ApiNegotiationScoreResponse,
  ApiNotDueInvoiceItem,
  ApiNotDueInvoicesResponse,
  ApiOfferRecommendation,
  ApiReturnedCheckItem,
  ApiReturnedChecksResponse,
  ApiRiskFactor,
  ApiRiskLevel,
  ApiRiskResponse,
  ApiCustomerValueItem,
} from '@/types/api'
import type {
  ActionPriority,
  ActionType,
  AccountStatus,
  BestOffer,
  BestOfferItem,
  CompanyLiquidity,
  CustomerChurn,
  Complaint,
  ComplaintPriority,
  ComplaintStatus,
  CrmInteraction,
  CrmLatest,
  Customer,
  CustomerFinancial,
  CustomerLiquidity,
  CustomerRisk,
  CustomerStatus,
  Insight,
  InsightSeverity,
  NegotiationPillar,
  NegotiationPillarKey,
  NegotiationScore,
  NotDueInvoice,
  Order,
  OrderStatus,
  PaymentStatus,
  RecommendedAction,
  ReturnedCheck,
  RiskLevel,
  ValueTier,
} from '@/types/crm'

function mapRiskLevel(level?: ApiRiskLevel | null): RiskLevel {
  switch (level) {
    case 'Critical':
    case 'High':
      return 'high'
    case 'Medium':
      return 'medium'
    default:
      return 'low'
  }
}

function mapCustomerStatus(
  profile: ApiCustomerProfile | ApiCustomerSummary,
): CustomerStatus {
  const risk = profile.Risk_Level
  if (risk === 'Critical' || risk === 'High') return 'high-risk'
  if (
    risk === 'Medium' ||
    profile.RFM_Segment === 'At Risk (High Value)' ||
    profile.RFM_Segment === 'Lost / Churned'
  ) {
    return 'watch'
  }
  return 'healthy'
}

function mapReorderFields(profile: ApiCustomerProfile) {
  const interval = profile.Avg_Order_Interval_Days
  return {
    lastOrderDate: profile.Last_Order_Date ?? SNAPSHOT_DATE,
    typicalOrderInterval: interval != null ? Math.round(interval) : 0,
    recencyDays: profile.Recency_Days ?? profile.Days_Since_Last_Order ?? null,
    daysUntilExpectedNextOrder: profile.Days_Until_Expected_Next_Order ?? null,
    expectedNextOrderDate: profile.Expected_Next_Order_Date ?? null,
  }
}

function mapPaymentStatus(profile: ApiCustomerProfile): PaymentStatus {
  const maxDelay = profile.Max_Payment_Delay_Days ?? 0
  const avgDelay = profile.Avg_Payment_Delay_Days ?? 0
  if (maxDelay > 30 || avgDelay > 30) return 'overdue'
  if (avgDelay > 14 || (profile.Bounced_Check_Rate ?? 0) > 0) return 'pending'
  return 'paid'
}

function mapOrderStatus(profile: ApiCustomerProfile): OrderStatus {
  const daysUntil = profile.Days_Until_Expected_Next_Order
  if (daysUntil != null && daysUntil < -14) return 'delayed'
  if (daysUntil != null && daysUntil < 0) return 'no-active'
  if ((profile.Recency_Days ?? 999) <= 30) return 'delivered'
  return 'no-active'
}

function buildRiskFromFactors(
  factors: ApiRiskFactor[],
  overall?: ApiRiskLevel | null,
): CustomerRisk {
  const getPoints = (name: string) =>
    factors.find((f) => f.factor === name)?.points ?? 0

  const financialPts =
    getPoints('Avg_Payment_Delay_Days') + getPoints('Bounced_Check_Rate')
  const relationshipPts = getPoints('Recent_Complaints_12M')
  const commercialPts =
    getPoints('Recency_Days') + getPoints('Revenue_Share_Pct_Latest')

  const ptsToLevel = (pts: number): RiskLevel => {
    if (pts >= 2) return 'high'
    if (pts >= 1) return 'medium'
    return 'low'
  }

  return {
    financial: ptsToLevel(financialPts),
    relationship: ptsToLevel(relationshipPts),
    commercial: ptsToLevel(commercialPts),
    overall: mapRiskLevel(overall),
  }
}

function buildDefaultRisk(profile: ApiCustomerProfile): CustomerRisk {
  const overall = mapRiskLevel(profile.Risk_Level)
  return {
    financial: mapPaymentStatus(profile) === 'overdue' ? 'high' : 'low',
    relationship: (profile.Recent_Complaints_12M ?? 0) >= 2 ? 'high' : 'low',
    commercial:
      (profile.Days_Until_Expected_Next_Order ?? 0) < -30 ? 'high' : 'medium',
    overall,
  }
}

function inferActionType(text: string): ActionType {
  const lower = text.toLowerCase()
  if (lower.includes('payment') || lower.includes('collect')) {
    return 'follow-up-payment'
  }
  if (lower.includes('call') || lower.includes('contact') || lower.includes('win-back')) {
    return 'call-customer'
  }
  if (lower.includes('upsell') || lower.includes('grow') || lower.includes('opportunity')) {
    return 'create-opportunity'
  }
  if (lower.includes('pricing') || lower.includes('margin')) {
    return 'review-pricing'
  }
  if (lower.includes('order') || lower.includes('delivery')) {
    return 'follow-up-order'
  }
  return 'call-customer'
}

function inferActionPriority(risk?: ApiRiskLevel | null): ActionPriority {
  if (risk === 'Critical' || risk === 'High') return 'high'
  if (risk === 'Medium') return 'medium'
  return 'low'
}

function mapComplaintStatus(status?: string | null): ComplaintStatus {
  if (!status) return 'open'
  const resolved = ['resolved', 'حل', 'بسته', 'closed']
  return resolved.some((s) => status.toLowerCase().includes(s)) ? 'resolved' : 'open'
}

function mapComplaintPriority(severity?: string | null): ComplaintPriority {
  if (!severity) return 'medium'
  if (severity.includes('زیاد') || severity.toLowerCase().includes('high')) {
    return 'high'
  }
  if (severity.includes('کم') || severity.toLowerCase().includes('low')) {
    return 'low'
  }
  return 'medium'
}

function mapStatusFromHeader(
  status: string,
  segment: string,
  riskLevel?: ApiRiskLevel | null,
): CustomerStatus {
  if (riskLevel === 'Critical' || riskLevel === 'High') return 'high-risk'
  if (status === 'غیرفعال') return 'high-risk'
  if (riskLevel === 'Medium' || segment === 'C') return 'watch'
  return 'healthy'
}

export function buildProfileFromParts(
  customerInfo: string,
  kpis?: ApiKpiResponse,
  risk?: ApiRiskResponse,
): ApiCustomerProfile {
  const header = parseCustomerInfo(customerInfo)
  return {
    Customer_ID: header.customerId,
    Customer_Segment: header.segment || undefined,
    Customer_Status: header.status || undefined,
    Risk_Level: risk?.Risk_Level ?? undefined,
    Risk_Score: risk?.Risk_Score ?? undefined,
    ...(kpis ?? {}),
  }
}

function normalizeAccountStatus(
  status?: string | null,
): AccountStatus {
  if (status === 'فعال' || status === 'غیرفعال') return status
  return ''
}

export function mapCustomerInfoToCustomer(
  customerInfo: string,
  kpis?: ApiKpiResponse,
  risk?: ApiRiskResponse,
): Customer {
  const header = parseCustomerInfo(customerInfo)
  const accountStatus = normalizeAccountStatus(header.status)
  const displayLabel = formatCustomerIdWithStatus(header.customerId, accountStatus)

  const profile = buildProfileFromParts(customerInfo, kpis, risk)
  if (kpis || risk) {
    return {
      ...mapProfileToCustomer(profile, risk),
      accountStatus,
      name: displayLabel,
      code: header.customerId,
    }
  }

  const uiStatus = mapStatusFromHeader(header.status, header.segment)

  return {
    id: header.customerId,
    name: displayLabel,
    code: header.customerId,
    accountStatus,
    email: '—',
    phone: '—',
    segment: header.segment || null,
    salesRepId: null,
    locationId: null,
    creditLimit: null,
    status: uiStatus,
    totalRevenue: 0,
    totalProfit: 0,
    orderCount: 0,
    averageOrderValue: 0,
    lastOrderDate: SNAPSHOT_DATE,
    typicalOrderInterval: 0,
    recencyDays: null,
    daysUntilExpectedNextOrder: null,
    expectedNextOrderDate: null,
    paymentStatus: header.status === 'غیرفعال' ? 'overdue' : 'paid',
    orderStatus: header.status === 'فعال' ? 'delivered' : 'no-active',
    risk: {
      financial: header.status === 'غیرفعال' ? 'high' : 'low',
      relationship: 'low',
      commercial: header.segment === 'C' ? 'medium' : 'low',
      overall:
        uiStatus === 'high-risk'
          ? 'high'
          : uiStatus === 'watch'
            ? 'medium'
            : 'low',
    },
    favoriteProducts: header.segment
      ? [{ name: `بخش ${header.segment}`, percentage: 100 }]
      : [],
    revenueTrend: [],
    payment: {
      totalRevenue: 0,
      paid: 0,
      pending: 0,
      overdue: 0,
    },
    lastActivityDate: SNAPSHOT_DATE,
  }
}

export function applyCustomerValue(
  customer: Customer,
  value?: ApiCustomerValueItem | null,
): Customer {
  if (!value) return customer
  return {
    ...customer,
    valueScore: value.score,
    valueTier: value.value_tier as ValueTier,
  }
}

export function mapSummaryToCustomer(summary: ApiCustomerSummary): Customer {
  const profile = summary as ApiCustomerProfile
  const revenue = summary.Monetary_Total_Revenue ?? 0
  const profit = summary.LTV ?? 0
  const orders = profile.Frequency_Orders ?? 0

  return {
    id: summary.Customer_ID,
    name: formatCustomerIdWithStatus(
      summary.Customer_ID,
      normalizeAccountStatus(summary.Customer_Status),
    ),
    code: summary.Customer_ID,
    accountStatus: normalizeAccountStatus(summary.Customer_Status),
    email: '—',
    phone: '—',
    segment: summary.Customer_Segment ?? null,
    salesRepId: summary.Sales_Rep_ID ?? null,
    locationId: summary.Location_ID ?? null,
    creditLimit: profile.Credit_Limit ?? null,
    status: mapCustomerStatus(summary),
    totalRevenue: revenue,
    totalProfit: profit,
    orderCount: orders,
    averageOrderValue: orders > 0 ? revenue / orders : 0,
    ...mapReorderFields(profile),
    paymentStatus: mapPaymentStatus(profile),
    orderStatus: mapOrderStatus(profile),
    risk: buildDefaultRisk(profile),
    favoriteProducts: profile.Biggest_Problem
      ? [{ name: profile.Biggest_Problem, percentage: 100 }]
      : [],
    revenueTrend: buildRevenueTrend(profile),
    payment: buildPaymentSummary(profile),
    lastActivityDate: profile.Last_Order_Date ?? SNAPSHOT_DATE,
    walletSharePct: profile.Revenue_Share_Pct_Latest,
    walletShareAvgPct: profile.Revenue_Share_Pct_Avg,
    walletShareAsOfMonth: profile.Revenue_Share_As_Of_Month,
    annualSalesT12m: profile.Annual_Sales_Trailing12M ?? null,
    marginPct: profile.Margin_Pct ?? null,
    bouncedCheckRate: profile.Bounced_Check_Rate ?? null,
    avgPaymentDelayDays: profile.Avg_Payment_Delay_Days ?? null,
    maxPaymentDelayDays: profile.Max_Payment_Delay_Days ?? null,
  }
}

export function mapProfileToCustomer(
  profile: ApiCustomerProfile,
  riskResponse?: ApiRiskResponse,
): Customer {
  const base = mapSummaryToCustomer(profile)
  return {
    ...base,
    totalRevenue: profile.Revenue_Total_Lifetime ?? base.totalRevenue,
    totalProfit: profile.Margin_Total_Lifetime ?? profile.LTV ?? base.totalProfit,
    orderCount: profile.Frequency_Orders ?? base.orderCount,
    averageOrderValue:
      profile.Frequency_Orders && profile.Frequency_Orders > 0
        ? (profile.Revenue_Total_Lifetime ?? 0) / profile.Frequency_Orders
        : base.averageOrderValue,
    risk: riskResponse
      ? buildRiskFromFactors(riskResponse.factors, riskResponse.Risk_Level)
      : buildDefaultRisk(profile),
    favoriteProducts: buildProductMix(profile),
    revenueTrend: buildRevenueTrend(profile),
    payment: buildPaymentSummary(profile),
    annualSalesT12m: profile.Annual_Sales_Trailing12M ?? base.annualSalesT12m,
    creditLimit: profile.Credit_Limit ?? base.creditLimit,
    marginPct: profile.Margin_Pct ?? base.marginPct,
    bouncedCheckRate: profile.Bounced_Check_Rate ?? base.bouncedCheckRate,
    avgPaymentDelayDays: profile.Avg_Payment_Delay_Days ?? base.avgPaymentDelayDays,
    maxPaymentDelayDays: profile.Max_Payment_Delay_Days ?? base.maxPaymentDelayDays,
  }
}

function buildPaymentSummary(profile: ApiCustomerProfile) {
  const total = profile.Revenue_Total_Lifetime ?? profile.Monetary_Total_Revenue ?? 0
  const maxDelay = profile.Max_Payment_Delay_Days ?? 0
  const avgDelay = profile.Avg_Payment_Delay_Days ?? 0
  const overdueRatio = maxDelay > 30 ? 0.1 : maxDelay > 14 ? 0.05 : 0
  const pendingRatio = avgDelay > 14 ? 0.08 : 0.03
  const overdue = total * overdueRatio
  const pending = total * pendingRatio
  const paid = Math.max(0, total - overdue - pending)

  return {
    totalRevenue: total,
    paid,
    pending,
    overdue,
    overdueDays: maxDelay > 0 ? Math.round(maxDelay) : undefined,
  }
}

function buildRevenueTrend(profile: ApiCustomerProfile) {
  const annual = profile.Annual_Sales_Trailing12M ?? 0
  const total = profile.Revenue_Total_Lifetime ?? annual
  if (annual <= 0) return []

  const months = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر']
  const base = annual / 12
  return months.map((month, i) => ({
    month,
    revenue: Math.round((base * (0.7 + (i % 3) * 0.15)) / 100_000),
  }))
}

function buildProductMix(profile: ApiCustomerProfile) {
  if (profile.Biggest_Problem) {
    return [
      { name: profile.Biggest_Problem, percentage: 60 },
      { name: `گروه ${profile.Customer_Segment ?? 'B'}`, percentage: 25 },
      { name: profile.RFM_Segment ?? 'سایر', percentage: 15 },
    ]
  }
  return [
    { name: `بخش ${profile.Customer_Segment ?? '—'}`, percentage: 50 },
    { name: profile.RFM_Segment ?? 'Regular', percentage: 30 },
    { name: 'سایر', percentage: 20 },
  ]
}

export function mapComplaintDetail(
  customerId: string,
  record: ApiComplaintDetail,
  index: number,
): Complaint {
  const productId = record.Product_id ?? '—'
  const createdAt = record.created_at ?? ''
  return {
    id: `${customerId}-${productId}-${createdAt}-${index}`,
    customerId,
    Product_id: productId,
    complaint_text: record.complaint_text ?? '',
    severity: record.severity ?? '—',
    created_at: createdAt,
    complaint_status: record.complaint_status ?? '—',
    text_resolution: record.text_resolution ?? null,
  }
}

export function mapCrmLatest(response: ApiCrmLatestResponse): CrmLatest {
  return {
    customerId: response.customer_id,
    nextAction: response.next_action ?? null,
    interactionType: response.interaction_type ?? null,
    summaryText: response.summary_text ?? null,
    updatedAt: response.updated_at ?? null,
    urgency: response.urgency ?? null,
  }
}

export function mapCrmInteraction(record: ApiCrmInteractionItem): CrmInteraction {
  return {
    nextAction: record.next_action ?? null,
    interactionType: record.interaction_type ?? null,
    summaryText: record.summary_text ?? null,
    updatedAt: record.updated_at ?? null,
    urgency: record.urgency ?? null,
  }
}

export function mapCustomerFinancial(
  response: ApiCustomerFinancialResponse,
): CustomerFinancial {
  return {
    customerId: response.customer_id,
    outstandingBalance: response.outstanding_balance,
    notDueInvoiceCount: response.not_due_invoices.count,
    hasReturnedCheck: response.returned_checks.has_returned_check,
    returnedCheckCount: response.returned_checks.count,
    lastReturnedCheckDate: response.returned_checks.last_date ?? null,
    creditLimit: response.credit.limit ?? null,
    creditUsedPercent: response.credit.used_percent ?? null,
    creditRemaining: response.credit.remaining ?? null,
    creditStatus: response.credit.status,
    delayCost: response.delay_cost.amount,
    annualFinancingRate: response.delay_cost.annual_financing_rate,
  }
}

export function mapNotDueInvoice(record: ApiNotDueInvoiceItem): NotDueInvoice {
  return {
    invoiceId: record.invoice_id ?? null,
    invoiceTotal: record.invoice_total,
    amountCollected: record.amount_collected,
    outstandingBalance: record.outstanding_balance,
    dueDate: record.due_date ?? null,
  }
}

export function mapNotDueInvoices(
  response: ApiNotDueInvoicesResponse,
): NotDueInvoice[] {
  return response.invoices.map(mapNotDueInvoice)
}

export function mapReturnedCheck(record: ApiReturnedCheckItem): ReturnedCheck {
  return {
    date: record.date ?? null,
  }
}

export function mapReturnedChecks(
  response: ApiReturnedChecksResponse,
): ReturnedCheck[] {
  return response.checks.map(mapReturnedCheck)
}

/** @deprecated legacy mapper */
export function mapComplaint(record: ApiComplaintRecord): Complaint {
  return {
    id: record.Complaint_ID,
    customerId: record.Customer_ID,
    Product_id: record.Product_ID ?? '—',
    complaint_text: record.Complaint_Text ?? '',
    severity: record.Severity ?? '—',
    created_at: record.Created_At ?? '',
    complaint_status: record.Complaint_Status ?? '—',
    text_resolution: null,
  }
}

export function buildInsights(
  profile: ApiCustomerProfile,
  risk?: ApiRiskResponse,
): Insight[] {
  const insights: Insight[] = []
  const id = profile.Customer_ID

  if ((profile.Days_Until_Expected_Next_Order ?? 0) < 0) {
    insights.push({
      id: `${id}-reorder`,
      customerId: id,
      title: 'تأخیر در سفارش مجدد',
      message: `مشتری ${Math.abs(profile.Days_Until_Expected_Next_Order ?? 0)} روز از موعد معمول سفارش عقب است (snapshot: 2022-06-30).`,
      severity: 'warning',
    })
  }

  if ((profile.Recent_Complaints_12M ?? 0) > 0) {
    insights.push({
      id: `${id}-complaints`,
      customerId: id,
      title: 'شکایت اخیر',
      message: `${profile.Recent_Complaints_12M} شکایت در ۱۲ ماه اخیر. ${profile.Biggest_Problem ? `موضوع اصلی: ${profile.Biggest_Problem}` : ''}`,
      severity: profile.Recent_Complaints_12M! >= 3 ? 'critical' : 'warning',
    })
  }

  if (profile.Risk_Level === 'Critical' || profile.Risk_Level === 'High') {
    insights.push({
      id: `${id}-risk`,
      customerId: id,
      title: 'ریسک بالا',
      message: `سطح ریسک: ${profile.Risk_Level}. امتیاز: ${profile.Risk_Score ?? '—'}`,
      severity: 'critical',
      isGlobal: profile.Risk_Level === 'Critical',
    })
  }

  if ((profile.Margin_Pct ?? 1) < 0.12 && (profile.Revenue_Total_Lifetime ?? 0) > 1_000_000) {
    insights.push({
      id: `${id}-margin`,
      customerId: id,
      title: 'حاشیه سود پایین',
      message: `درآمد بالا (${Math.round((profile.Margin_Pct ?? 0) * 100)}٪ حاشیه سود). بررسی قیمت‌گذاری توصیه می‌شود.`,
      severity: 'warning',
    })
  }

  if (risk) {
    for (const factor of risk.factors) {
      if ((factor.points ?? 0) >= 2) {
        insights.push({
          id: `${id}-factor-${factor.factor}`,
          customerId: id,
          title: factor.factor,
          message: factor.rule,
          severity: 'warning',
        })
      }
    }
  }

  if (profile.RFM_Segment === 'Champions' || profile.RFM_Segment === 'Loyal Customers') {
    insights.push({
      id: `${id}-loyal`,
      customerId: id,
      title: 'مشتری وفادار',
      message: `بخش RFM: ${profile.RFM_Segment}. فرصت Upsell وجود دارد.`,
      severity: 'info',
    })
  }

  return insights
}

export function mapAction(
  response: ApiActionResponse,
  profile?: ApiCustomerProfile,
): RecommendedAction[] {
  const text = response.Recommended_Action
  const priority = inferActionPriority(response.Risk_Level)
  const type = inferActionType(text)

  const reasonParts = [
    response.RFM_Segment ? `RFM: ${response.RFM_Segment}` : null,
    response.Risk_Level ? `ریسک: ${response.Risk_Level}` : null,
    response.Days_Until_Expected_Next_Order != null &&
    response.Days_Until_Expected_Next_Order < 0
      ? `${Math.abs(response.Days_Until_Expected_Next_Order)} روز تأخیر سفارش`
      : null,
    profile?.Recent_Complaints_12M
      ? `${profile.Recent_Complaints_12M} شکایت اخیر`
      : null,
  ].filter(Boolean)

  return [
    {
      id: `${response.Customer_ID}-action`,
      customerId: response.Customer_ID,
      title: text.split('—')[0]?.trim() || text.split('-')[0]?.trim() || text,
      reason: reasonParts.join(' · ') || text,
      priority,
      type,
    },
  ]
}

function mapOfferItem(item: ApiOfferRecommendation): BestOfferItem {
  return {
    offerType: item.Offer_Type,
    offerReason: item.Offer_Reason,
    productFamily: item.Product_Family ?? null,
    discountPct: item.Offer_Discount_Pct,
    validityDays: item.Validity_Days,
    acceptProbability: item.accept_probability,
    businessScore: item.business_score,
  }
}

export function mapBestOffer(response: ApiBestOfferResponse): BestOffer {
  return {
    customerId: response.Customer_ID,
    method: response.method,
    best: mapOfferItem(response.best_offer),
    alternatives: (response.alternatives ?? []).map(mapOfferItem),
  }
}

export function mapCompanyLiquidity(response: ApiCompanyLiquidityResponse): CompanyLiquidity {
  return {
    totalLiquidity: response.total_liquidity,
    cashSalesTotal: response.cash_sales_total,
    collectedTotal: response.collected_total,
    period: response.period,
  }
}

export function mapCustomerLiquidity(response: ApiCustomerLiquidityResponse): CustomerLiquidity {
  return {
    customerId: response.customer_id,
    liquidityContribution: response.liquidity_contribution,
    cashSales: response.cash_sales,
    collectedAmount: response.collected_amount,
    liquidityRatio: response.liquidity_ratio,
    period: response.period,
  }
}

export function mapChurn(response: ApiChurnResponse): CustomerChurn {
  return {
    customerId: response.Customer_ID,
    method: response.method,
    churnProbability: response.churn_probability,
    churnPrediction: response.churn_prediction,
    riskLevel: response.risk_level,
    snapshotDate: response.snapshot_date ?? null,
  }
}

const NEGOTIATION_PILLAR_KEYS: NegotiationPillarKey[] = [
  'collection',
  'retention',
  'loyalty',
  'cash',
]

export function mapNegotiationScore(
  response: ApiNegotiationScoreResponse,
): NegotiationScore {
  const pillars = {} as Record<NegotiationPillarKey, NegotiationPillar>
  for (const key of NEGOTIATION_PILLAR_KEYS) {
    const pillar = response.pillars[key]
    pillars[key] = {
      score: pillar?.score ?? 0,
      weight: pillar?.weight ?? 0,
      contribution: pillar?.contribution ?? 0,
      method: pillar?.method ?? 'rule_based_scorecard',
      note: pillar?.note ?? null,
      confidence: pillar?.confidence ?? 'medium',
    }
  }
  return {
    customerId: response.Customer_ID,
    method: response.method,
    negotiationScore: response.negotiation_score,
    recommendation: response.recommendation,
    pillars,
    keyDrivers: response.key_drivers ?? [],
    warnings: response.warnings ?? [],
    snapshotDate: response.snapshot_date ?? null,
  }
}

export function buildSyntheticOrder(profile: ApiCustomerProfile): Order | null {
  const daysUntil = profile.Days_Until_Expected_Next_Order
  if (daysUntil == null) return null

  const isOverdue = daysUntil < 0
  const status: OrderStatus = isOverdue ? 'delayed' : 'in-production'

  return {
    id: `expected-${profile.Customer_ID}`,
    customerId: profile.Customer_ID,
    orderNumber: `EXP-${profile.Customer_ID}`,
    product: profile.Biggest_Problem ?? `سفارش ${profile.RFM_Segment ?? 'معمول'}`,
    quantity: profile.Frequency_Orders ?? 1,
    quantityUnit: 'سفارش',
    status,
    createdDate: profile.Last_Order_Date ?? '2022-04-01',
    promisedDate: profile.Expected_Next_Order_Date ?? '2022-05-20',
    isActive: isOverdue || daysUntil <= 7,
    delayDays: isOverdue ? Math.abs(Math.round(daysUntil)) : undefined,
    currentStep: isOverdue ? 'production' : 'confirmed',
    timeline: ['created', 'confirmed', 'production', 'ready', 'delivered', 'paid'],
  }
}
