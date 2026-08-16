import type { Role } from './auth'

export interface User {
  id: number
  tenant_id: number
  email: string
  full_name: string
  role: Role
  department_id: number | null
  is_active: boolean
  mfa_enabled: boolean
  created_at: string
  updated_at: string
}

export interface Tenant {
  id: number
  name: string
  ruc: string
  country: string
  sector: string | null
  is_active: boolean
  created_at: string
  address: string | null
  website: string | null
  dpo_name: string | null
  dpo_email: string | null
  dpo_phone: string | null
}

export interface TenantProvisionRequest {
  tenant: {
    name: string
    ruc: string
    country?: string
    sector?: string | null
  }
  admin_user: {
    email: string
    password: string
    full_name: string
    role?: string
    department_id?: number | null
  }
}

export interface Department {
  id: number
  tenant_id: number
  name: string
  head_user_id: number | null
  created_at: string
}

export interface CatalogEntry {
  id: number
  tenant_id: number
  type: string
  code: string
  label: string
  description: string
  is_active: boolean
  sensitivity: string | null
  criticality: string | null
  version: number
  created_at: string
}

export interface CatalogEntryVersion {
  id: number
  catalog_entry_id: number
  version: number
  label: string
  description: string
  sensitivity: string | null
  criticality: string | null
  is_active: boolean
  changed_by_id: number | null
  created_at: string
}

export interface SectorSuggestions {
  sector_code: string
  label: string
  suggested_data_types: string[]
  suggested_activities: string[]
  suggested_templates: string[]
}
