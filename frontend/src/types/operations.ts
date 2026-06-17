export interface ActionPlanTask {
  title?: string
  description?: string
  assignee_id?: number | null
  due_date?: string | null
  status?: string
  [key: string]: unknown
}

export interface ActionPlanTemplate {
  id: number
  tenant_id: number
  name: string
  description: string
  applies_to_level: string
  default_tasks: ActionPlanTask[]
  is_active: boolean
}

export interface ActionPlan {
  id: number
  tenant_id: number
  risk_assessment_id: number | null
  template_id: number | null
  title: string
  description: string
  status: string
  tasks: ActionPlanTask[]
  target_date: string | null
  auto_generated: boolean
  created_by_id: number | null
  created_at: string
}

export interface AuditPlan {
  id: number
  tenant_id: number
  name: string
  scope: string
  period_start: string | null
  period_end: string | null
  auditor_id: number | null
  status: string
  notes: string
  created_at: string
}

export interface AuditFinding {
  id: number
  tenant_id: number
  audit_plan_id: number
  title: string
  description: string
  evidence: string
  severity: string
  status: string
  remediation_notes: string
  remediation_date: string | null
  created_by_id: number | null
  created_at: string
}

export interface Remediation {
  id: number
  tenant_id: number
  risk_assessment_id: number
  title: string
  description: string
  responsible_id: number | null
  due_date: string | null
  completed_date: string | null
  status: string
  risk_score_before: number | null
  risk_score_after: number | null
  risk_level_before: string | null
  risk_level_after: string | null
  created_by_id: number | null
  created_at: string
}
