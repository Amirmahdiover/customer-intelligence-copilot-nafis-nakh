export type ApiCustomerStatus = 'فعال' | 'غیرفعال'
export type ApiRiskLevel = 'Low' | 'Medium' | 'High' | 'Critical' | 'Not Yet Active'
export type ApiCustomerSegment = 'A' | 'B' | 'C'
export type ApiValueTier =
  | 'شریک طلایی'
  | 'مشتری پایدار'
  | 'مشتری پرچالش'
  | 'مشتری قرمز'
export type ApiRfmSegment =
  | 'Champions'
  | 'Loyal Customers'
  | 'Regular'
  | 'New / Recent'
  | 'At Risk (High Value)'
  | 'Lost / Churned'
  | 'No Activity (Pre-Onboarding as of Snapshot)'

export interface ApiCustomerHeaderItem {
  customer_info: string
}

export interface ApiCustomerHeaderListResponse {
  customers: ApiCustomerHeaderItem[]
}

export interface ApiCustomerHeaderResponse {
  customer_info: string
}

export interface ApiCustomerSummary {
  Customer_ID: string
  Customer_Segment?: ApiCustomerSegment | null
  Customer_Status?: ApiCustomerStatus | null
  Location_ID?: string | null
  Sales_Rep_ID?: string | null
  RFM_Segment?: ApiRfmSegment | null
  Risk_Level?: ApiRiskLevel | null
  Recency_Days?: number | null
  Monetary_Total_Revenue?: number | null
  LTV?: number | null
}

export interface ApiCustomerProfile extends ApiCustomerSummary {
  Credit_Limit?: number | null
  Payment_Terms_Days?: number | null
  Days_Since_Last_Order?: number | null
  Frequency_Orders?: number | null
  R_Score?: number | null
  F_Score?: number | null
  M_Score?: number | null
  RFM_Score?: string | null
  Last_Order_Date?: string | null
  First_Order_Date?: string | null
  Avg_Order_Interval_Days?: number | null
  Order_Interval_Std_Days?: number | null
  Avg_Payment_Delay_Days?: number | null
  Max_Payment_Delay_Days?: number | null
  Collections_Count?: number | null
  Bounced_Check_Rate?: number | null
  Lifetime_Days?: number | null
  Lifetime_Years?: number | null
  Annual_Sales_Trailing12M?: number | null
  Revenue_Total_Lifetime?: number | null
  Cost_Total_Lifetime?: number | null
  Margin_Total_Lifetime?: number | null
  Margin_Pct?: number | null
  Margin_Confidence?: string | null
  Revenue_Share_As_Of_Month?: string | null
  Revenue_Share_Pct_Latest?: number | null
  Revenue_Share_Pct_Avg?: number | null
  Lifetime_Complaints?: number | null
  Recent_Complaints_12M?: number | null
  Biggest_Problem?: string | null
  Expected_Next_Order_Date?: string | null
  Days_Until_Expected_Next_Order?: number | null
  Risk_Score?: number | null
  Recommended_Action?: string | null
}

export interface ApiKpiResponse {
  Customer_ID: string
  Recency_Days?: number | null
  Days_Since_Last_Order?: number | null
  Frequency_Orders?: number | null
  Monetary_Total_Revenue?: number | null
  R_Score?: number | null
  F_Score?: number | null
  M_Score?: number | null
  RFM_Score?: string | null
  RFM_Segment?: ApiRfmSegment | null
  Last_Order_Date?: string | null
  First_Order_Date?: string | null
  Avg_Order_Interval_Days?: number | null
  Order_Interval_Std_Days?: number | null
  Avg_Payment_Delay_Days?: number | null
  Max_Payment_Delay_Days?: number | null
  Bounced_Check_Rate?: number | null
  Lifetime_Days?: number | null
  Lifetime_Years?: number | null
  Annual_Sales_Trailing12M?: number | null
  Revenue_Total_Lifetime?: number | null
  Cost_Total_Lifetime?: number | null
  Margin_Total_Lifetime?: number | null
  Margin_Pct?: number | null
  Margin_Confidence?: string | null
  LTV?: number | null
  Revenue_Share_As_Of_Month?: string | null
  Revenue_Share_Pct_Latest?: number | null
  Revenue_Share_Pct_Avg?: number | null
  Expected_Next_Order_Date?: string | null
  Days_Until_Expected_Next_Order?: number | null
}

export interface ApiCustomerListResponse {
  total: number
  skip: number
  limit: number
  count: number
  items: ApiCustomerSummary[]
}

export interface ApiRiskFactor {
  factor: string
  value?: number | string | null
  points?: number | null
  rule: string
}

export interface ApiRiskResponse {
  Customer_ID: string
  Snapshot_Date: string
  Risk_Score?: number | null
  Risk_Level?: ApiRiskLevel | null
  factors: ApiRiskFactor[]
  method: 'rule_based'
}

export interface ApiActionResponse {
  Customer_ID: string
  Recommended_Action: string
  Risk_Level?: ApiRiskLevel | null
  RFM_Segment?: ApiRfmSegment | null
  Customer_Status?: ApiCustomerStatus | null
  Days_Until_Expected_Next_Order?: number | null
  method: 'rule_based'
}

export interface ApiOfferRecommendation {
  Offer_Type: string
  Offer_Reason: string
  Product_Family?: string | null
  Offer_Discount_Pct: number
  Validity_Days: number
  accept_probability: number
  business_score: number
}

export interface ApiBestOfferResponse {
  Customer_ID: string
  method: 'ml_offer_accept'
  best_offer: ApiOfferRecommendation
  alternatives: ApiOfferRecommendation[]
}

export interface ApiChurnResponse {
  Customer_ID: string
  method: 'ml_churn'
  churn_probability: number
  churn_prediction: number
  risk_level: 'پایین' | 'متوسط' | 'بالا'
  snapshot_date?: string | null
}

export type ApiNegotiationPillarMethod = 'ml_model' | 'rule_based_scorecard'
export type ApiNegotiationConfidence = 'high' | 'medium' | 'low'

export interface ApiNegotiationPillar {
  score: number
  weight: number
  contribution: number
  method: ApiNegotiationPillarMethod
  note?: string | null
  confidence: ApiNegotiationConfidence
}

export interface ApiNegotiationScoreResponse {
  Customer_ID: string
  method: 'negotiation_score'
  negotiation_score: number
  recommendation: string
  pillars: Record<string, ApiNegotiationPillar>
  key_drivers: string[]
  warnings: string[]
  snapshot_date?: string | null
}

export interface ApiCrmLatestResponse {
  customer_id: string
  next_action?: string | null
  interaction_type?: string | null
  summary_text?: string | null
  updated_at?: string | null
  urgency?: string | null
}

export interface ApiCrmInteractionItem {
  next_action?: string | null
  interaction_type?: string | null
  summary_text?: string | null
  updated_at?: string | null
  urgency?: string | null
}

export interface ApiCrmInteractionsListResponse {
  customer_id: string
  interactions: ApiCrmInteractionItem[]
}

export interface ApiComplaintDetail {
  Product_id?: string | null
  complaint_text?: string | null
  severity?: string | null
  created_at?: string | null
  complaint_status?: string | null
  text_resolution?: string | null
}

export interface ApiComplaintsCountResponse {
  customer_id: string
  complaints_count: number
}

export interface ApiCustomerComplaintsResponse {
  customer_id: string
  complaints_count: number
  complaints: ApiComplaintDetail[]
}

export type ApiCreditStatus = 'safe' | 'warning' | 'critical' | 'over_limit' | 'unknown'

export interface ApiNotDueInvoicesSummary {
  count: number
}

export interface ApiReturnedChecksSummary {
  has_returned_check: boolean
  count: number
  last_date?: string | null
}

export interface ApiCreditSummary {
  limit?: number | null
  used_percent?: number | null
  remaining?: number | null
  status: ApiCreditStatus
}

export interface ApiDelayCostSummary {
  amount: number
  annual_financing_rate: number
}

export interface ApiCustomerFinancialResponse {
  customer_id: string
  outstanding_balance: number
  not_due_invoices: ApiNotDueInvoicesSummary
  returned_checks: ApiReturnedChecksSummary
  credit: ApiCreditSummary
  delay_cost: ApiDelayCostSummary
}

export interface ApiNotDueInvoiceItem {
  invoice_id?: string | null
  invoice_total: number
  amount_collected: number
  outstanding_balance: number
  due_date?: string | null
}

export interface ApiNotDueInvoicesResponse {
  customer_id: string
  count: number
  invoices: ApiNotDueInvoiceItem[]
}

export interface ApiReturnedCheckItem {
  date?: string | null
}

export interface ApiReturnedChecksResponse {
  customer_id: string
  count: number
  checks: ApiReturnedCheckItem[]
}

/** @deprecated legacy analytics sheet shape */
export interface ApiComplaintRecord {
  Complaint_ID: string
  Customer_ID: string
  Product_ID?: string | null
  Complaint_Title?: string | null
  Complaint_Text?: string | null
  Severity?: string | null
  Created_At?: string | null
  Complaint_Status?: string | null
  Resolved_At?: string | null
}

export interface ApiComplaintsResponse {
  Customer_ID: string
  Lifetime_Complaints?: number | null
  Recent_Complaints_12M?: number | null
  Biggest_Problem?: string | null
  complaints: ApiComplaintRecord[]
}

export interface ApiCustomerValueItem {
  customer_id: string
  score: number
  value_tier: ApiValueTier
  monetary?: number | null
  sow?: number | null
  margin?: number | null
  on_time?: number | null
  check_quality?: number | null
  frequency?: number | null
  recency?: number | null
  trend?: number | null
  offer_accept?: number | null
  growth_capacity?: number | null
}

export interface ApiCustomerValueListResponse {
  count: number
  customers: ApiCustomerValueItem[]
}

export interface ApiListParams {
  skip?: number
  limit?: number
  customer_status?: ApiCustomerStatus
  risk_level?: ApiRiskLevel
  rfm_segment?: ApiRfmSegment
  customer_segment?: ApiCustomerSegment
}
