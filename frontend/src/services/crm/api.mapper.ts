import type {
  ApiActionResponse,
  ApiComplaintRecord,
  ApiCustomerProfile,
  ApiCustomerSummary,
  ApiRiskFactor,
  ApiRiskLevel,
  ApiRiskResponse,
} from '@/types/api'
import type {
  ActionPriority,
  ActionType,
  Complaint,
  ComplaintPriority,
  ComplaintStatus,
  Customer,
  CustomerRisk,
  CustomerStatus,
  Insight,
  InsightSeverity,
  Order,
  OrderStatus,
  PaymentStatus,
  RecommendedAction,
  RiskLevel,
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

export function mapSummaryToCustomer(summary: ApiCustomerSummary): Customer {
  const profile = summary as ApiCustomerProfile
  const revenue = summary.Monetary_Total_Revenue ?? 0
  const profit = summary.LTV ?? 0
  const orders = profile.Frequency_Orders ?? 0

  return {
    id: summary.Customer_ID,
    name: summary.Customer_Segment
      ? `مشتری ${summary.Customer_Segment} — ${summary.Customer_ID}`
      : `مشتری ${summary.Customer_ID}`,
    code: summary.Customer_ID,
    email: summary.Sales_Rep_ID ? `نماینده: ${summary.Sales_Rep_ID}` : '—',
    phone: summary.Location_ID ? `موقعیت: ${summary.Location_ID}` : '—',
    status: mapCustomerStatus(summary),
    totalRevenue: revenue,
    totalProfit: profit,
    orderCount: orders,
    averageOrderValue: orders > 0 ? revenue / orders : 0,
    lastOrderDate: profile.Last_Order_Date ?? '2022-06-30',
    typicalOrderInterval: profile.Avg_Order_Interval_Days ?? 30,
    paymentStatus: mapPaymentStatus(profile),
    orderStatus: mapOrderStatus(profile),
    risk: buildDefaultRisk(profile),
    favoriteProducts: profile.Biggest_Problem
      ? [{ name: profile.Biggest_Problem, percentage: 100 }]
      : [],
    revenueTrend: buildRevenueTrend(profile),
    payment: buildPaymentSummary(profile),
    lastActivityDate: profile.Last_Order_Date ?? '2022-06-30',
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

export function mapComplaint(record: ApiComplaintRecord): Complaint {
  return {
    id: record.Complaint_ID,
    customerId: record.Customer_ID,
    complaintNumber: record.Complaint_ID,
    type: record.Complaint_Title ?? 'شکایت',
    status: mapComplaintStatus(record.Complaint_Status),
    date: record.Created_At ?? '',
    description: record.Complaint_Text ?? '',
    priority: mapComplaintPriority(record.Severity),
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
