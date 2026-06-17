export interface Alert {
  id: number
  tenant_id: number
  alert_type: string
  title: string
  message: string
  severity: string
  resource_type: string | null
  resource_id: number | null
  recipient_id: number | null
  is_read: boolean
  created_at: string
  read_at: string | null
}

export interface AuditLog {
  id: number
  tenant_id: number | null
  user_id: number | null
  action: string
  resource: string
  detail: string
  ip_address: string | null
  created_at: string
}

export interface BackupRecord {
  id: number
  tenant_id: number | null
  filename: string
  checksum_sha256: string
  size_bytes: number
  status: string
  notes: string
  created_at: string
  verified_at: string | null
}

export interface BackupVerifyResult {
  backup_id: number
  filename: string
  expected_checksum: string
  actual_checksum: string
  is_valid: boolean
  verified_at: string
}

export interface TrainingProgram {
  id: number
  tenant_id: number
  title: string
  description: string
  is_active: boolean
  created_at: string
}

export interface TrainingModule {
  id: number
  tenant_id: number
  program_id: number
  title: string
  description: string
  order: number
  created_at: string
}

export interface TrainingMaterial {
  id: number
  tenant_id: number
  module_id: number
  title: string
  content_type: string
  url: string | null
  content: string
  created_at: string
}

export interface TrainingEnrollment {
  id: number
  tenant_id: number
  user_id: number
  program_id: number
  enrolled_at: string | null
  completed_at: string | null
  progress_pct: number
  created_at: string
}

export interface ReportKPIAlerts {
  overdue_arco_requests: number
  open_critical_findings: number
  open_high_risk_assessments: number
}

export interface ReportKPIs {
  pct_activities_active: number
  avg_risk_score: number
  pct_arco_on_time: number
  reported_breaches: number
  alerts: ReportKPIAlerts
}

export interface ReportTrendPoint {
  month: string
  new_treatment_activities: number
  new_incidents: number
  new_arco_requests: number
  new_consents: number
  new_risk_assessments: number
}

export interface ReportTrends {
  months: number
  trends: ReportTrendPoint[]
}

export interface RiskSummary {
  total: number
  high: number
  medium: number
  low: number
}

export interface ARCOSummary {
  total: number
  open: number
  completed: number
}

export interface IncidentSummary {
  total: number
  open: number
  regulatory_notification_required: number
}

export interface ActionPlanSummary {
  total: number
  draft: number
  active: number
  completed: number
}

export interface AuditSummary {
  total_plans: number
  open_findings: number
  critical_findings: number
}

export interface ConsentSummary {
  total: number
  active: number
  revoked: number
  sensitive: number
}

export interface ConsolidatedSummaryReport {
  tenant_id: number
  total_treatment_activities: number
  risks: RiskSummary
  arco: ARCOSummary
  incidents: IncidentSummary
  action_plans: ActionPlanSummary
  audits: AuditSummary
  consents: ConsentSummary
  total_legal_documents: number
  total_dpias: number
  open_remediations: number
}
