export interface LegalDocument {
  id: number
  tenant_id: number
  doc_type: string
  title: string
  version: string
  effective_date: string
  parameters: Record<string, unknown>
  content: string
  is_current: boolean
  created_by_id: number | null
  created_at: string
}

export interface TemplateTypeInfo {
  doc_type: string
  category: 'CORE' | 'EXPANDED' | string
  description: string
}

export interface ROPAActivity {
  id: number
  name: string
  purpose: string
  legal_basis: string
  personal_data_types: string[]
  data_subjects: string[]
  is_cross_border: boolean
  destination_countries: string[]
  processor_name: string | null
  processor_country: string | null
  retention_period_days: number
  status: string
  created_at: string | null
}

export interface ROPAReport {
  generated_at: string
  tenant_id: number
  total_activities: number
  activities_by_legal_basis: Record<string, ROPAActivity[]>
}
