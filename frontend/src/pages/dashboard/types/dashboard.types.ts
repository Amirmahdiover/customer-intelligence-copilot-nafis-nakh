/** Contracts for the read-only, rule-based Dashboard APIs. */

export type DashboardStatus = 'risk' | 'opportunity' | 'attention'
export type DashboardDecisionCategory = 'customer_recovery' | 'growth_opportunity' | 'sales_opportunity'

export interface DashboardMetric {
  key:
    | 'active_customers'
    | 'customers_at_risk'
    | 'revenue_at_risk'
    | 'growth_opportunities'
    | 'priority_actions'
    | 'trailing_12m_revenue'
    | 'total_liquidity'
  label: string
  value: number
}

export interface DashboardSignal {
  name: string
  value: string | number | null
  rule: string
  interpretation: string
  action: string
  severity: 'low' | 'medium' | 'high'
}

export interface DashboardOverviewResponse {
  snapshot_date: string
  method: 'rule_based'
  metrics: DashboardMetric[]
  risk_distribution: Record<string, number>
}

export interface DashboardPriorityCustomer {
  customer_id: string
  status: DashboardStatus
  customer_status: string | null
  business_value: number
  annual_sales_trailing_12m: number
  margin_total_lifetime: number
  ltv: number
  risk_level: string | null
  risk_score: number | null
  opportunity_score: number
  priority_score: number
  decision_category: DashboardDecisionCategory | null
  decision_score: number | null
  decision_reason: string | null
  decision_evidence: string[]
  main_signal: string | null
  signals: DashboardSignal[]
  interpretation: string
  recommended_action: string
  latest_crm_next_action: string | null
  crm_urgency: string | null
}

export interface RiskOpportunityPoint {
  customer_id: string
  risk_level: string | null
  risk_score: number | null
  opportunity_score: number
  business_value: number
  status: DashboardStatus
  attention_required: boolean
}

export interface RiskOpportunityMapResponse {
  snapshot_date: string
  method: 'rule_based'
  customers: RiskOpportunityPoint[]
}

export type StrategicMatrixQuadrantKey =
  | 'golden_loyal'
  | 'growth_potential'
  | 'high_risk_moneymaker'
  | 'marginal'

export interface StrategicMatrixQuadrant {
  key: StrategicMatrixQuadrantKey
  label: string
  action: string
  count: number
}

export interface StrategicMatrixResponse {
  snapshot_date: string
  method: 'rule_based'
  weighting_note: string
  thresholds: {
    economic_median: number
    health_median: number
  }
  quadrants: StrategicMatrixQuadrant[]
}

export interface ExecutiveSummaryResponse {
  snapshot_date: string
  method: 'rule_based'
  headline: string
  key_findings: string[]
  important_focus_areas: string[]
}

export interface DashboardAIExplanationResponse {
  customer_id: string
  summary: string
  why_it_matters: string
  recommended_action: string
  why_tag: string
  action_tag: string
  source: 'openai' | 'fallback'
  cached: boolean
}

export interface DashboardAIExecutiveSummaryResponse {
  snapshot_date: string
  current_sales_status: string
  main_risks: string
  followable_opportunities: string
  recommended_action: string
  source: 'openai' | 'fallback'
  cached: boolean
}
