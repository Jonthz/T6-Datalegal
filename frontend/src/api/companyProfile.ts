import apiClient from './client'
import type { Tenant } from '../types'

export interface CompanyProfileUpdate {
  name?: string
  country?: string
  sector?: string | null
  address?: string | null
  website?: string | null
  dpo_name?: string | null
  dpo_email?: string | null
  dpo_phone?: string | null
}

export async function getCompanyProfile() {
  const res = await apiClient.get<Tenant>('/company-profile')
  return res.data
}

export async function updateCompanyProfile(data: CompanyProfileUpdate) {
  const res = await apiClient.put<Tenant>('/company-profile', data)
  return res.data
}
