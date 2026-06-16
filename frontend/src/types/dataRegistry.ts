export interface TreatmentActivity {
  id: number
  tenant_id: number
  name: string
  purpose: string
  legal_basis: string
  personal_data_types: string[]
  data_subjects: string[]
  retention_period_days: number
  is_cross_border: boolean
  destination_countries: string[]
  processor_name: string | null
  processor_country: string | null
  department_id: number | null
  owner_id: number | null
  status: string
}

export interface InformationAsset {
  id: number
  tenant_id: number
  name: string
  description: string
  asset_type_code: string
  format_code: string
  storage_medium_code: string
  classification_level_code: string
  treatment_activity_id: number | null
  department_id: number | null
  owner_id: number | null
}

export interface RetentionPolicy {
  id: number
  tenant_id: number
  name: string
  data_category: string
  retention_days: number
  action_on_expiry: string
  legal_basis: string
  is_active: boolean
}

export interface RetentionRecord {
  id: number
  tenant_id: number
  information_asset_id: number
  policy_id: number | null
  expiry_date: string
  status: string
  legal_hold: boolean
  hold_justification: string
  review_decision: string | null
  decision_rationale: string
  reviewed_by_id: number | null
}

export interface RetentionExecutionLog {
  id: number
  tenant_id: number
  policy_id: number | null
  executed_by_id: number | null
  records_processed: number
  records_exceptions: number
  status: string
  log_details: Record<string, unknown>
  run_type: string
  created_at: string
}

export interface ExpiredUnderReviewReport {
  total: number
  records: RetentionRecord[]
  as_of: string
}

export interface TreatmentActivityProgress {
  total: number
  draft: number
  active: number
  archived: number
  with_risk_assessment: number
  completion_pct: number
}

export interface DataInventoryProgress {
  as_of: string
  treatment_activities: TreatmentActivityProgress
  information_assets_total: number
  risk_assessments_total: number
  risk_distribution: Record<string, number>
  classification_distribution: Record<string, number>
}
