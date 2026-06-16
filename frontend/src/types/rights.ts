export interface ARCORequest {
  id: number
  tenant_id: number
  ticket_number: string
  request_type: string
  requester_name: string
  requester_email: string
  requester_id_number: string
  description: string
  status: string
  deadline_date: string
  received_date: string
  assigned_dpo_id: number | null
  response_text: string
  responded_at: string | null
  rejection_reason: string
  created_at: string
}

export interface ARCODashboard {
  total: number
  by_type: Record<string, number>
  by_status: Record<string, number>
  overdue_count: number
}

export interface ARCOSLAStatus {
  ticket_number: string
  status: string
  stoplight: 'GREEN' | 'YELLOW' | 'RED' | 'GREY'
  on_time: boolean | null
  days_remaining: number | null
  deadline_date: string
}

export interface Incident {
  id: number
  tenant_id: number
  title: string
  description: string
  incident_type: string
  severity: string
  status: string
  regulatory_notification_required: boolean
  regulatory_notified_at: string | null
  reporter_id: number | null
  assigned_to_id: number | null
  resolved_at: string | null
  affected_data_types: string
  department_id: number | null
  created_at: string
}

export interface PortabilityRequest {
  id: number
  tenant_id: number
  subject_name: string
  subject_email: string
  request_date: string
  status: string
  notes: string
  completed_at: string | null
  created_at: string
}

export interface PortabilityExport {
  request_id: number
  subject: Record<string, string>
  data: Record<string, unknown>
  format: string
  standard: string
  generated_at: string
}

export interface ConsentRecord {
  id: number
  tenant_id: number
  treatment_activity_id: number | null
  data_subject_token: string
  legal_basis: string
  purpose: string
  is_sensitive: boolean
  granted_at: string
  is_revoked: boolean
  revoked_at: string | null
  revocation_reason: string
}

export interface CookieBanner {
  id: number
  tenant_id: number
  version: string
  content: string
  effective_date: string
  is_active: boolean
  created_at: string
}

export interface CookieConsent {
  id: number
  tenant_id: number
  banner_id: number
  data_subject_token: string
  accepted_at: string
  revoked_at: string | null
  is_revoked: boolean
}

export interface ConsentStats {
  total: number
  active: number
  revoked: number
  sensitive: number
  revocation_rate: number
  by_legal_basis: Record<string, number>
  by_treatment_activity: Record<string, number>
}
