export interface QuestionnaireQuestion {
  id: string
  text: string
  is_gateway?: boolean
}

export interface QuestionnaireSchema {
  questions: QuestionnaireQuestion[]
}

export interface RiskAssessment {
  id: number
  tenant_id: number
  treatment_activity_id: number
  analyst_id: number | null
  responses: Record<string, boolean>
  probability: number
  impact: number
  risk_score: number
  risk_level: string
  status: string
  notes: string
}

export interface RiskDashboardHighRiskItem {
  assessment_id: number
  treatment_activity_id: number
  risk_score: number
  risk_level: string
}

export interface RiskDashboard {
  total: number
  green: number
  yellow: number
  red: number
  by_level: Record<string, number>
  avg_score: number
  high_risk_activities: RiskDashboardHighRiskItem[]
}

export interface DPIA {
  id: number
  tenant_id: number
  treatment_activity_id: number
  step1_description: string
  step2_risk_analysis: string
  step3_mitigations: string
  status: string
  signed_at: string | null
  signed_by_id: number | null
  version: number
  created_at: string
  updated_at: string
}
