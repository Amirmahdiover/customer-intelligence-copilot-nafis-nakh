export type ApiCustomerStatus = 'فعال' | 'غیرفعال'
export type ApiRiskLevel = 'Low' | 'Medium' | 'High' | 'Critical' | 'Not Yet Active'
export type ApiCustomerSegment = 'A' | 'B' | 'C'
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

export interface ApiListParams {
  skip?: number
  limit?: number
  customer_status?: ApiCustomerStatus
  risk_level?: ApiRiskLevel
  rfm_segment?: ApiRfmSegment
  customer_segment?: ApiCustomerSegment
}
