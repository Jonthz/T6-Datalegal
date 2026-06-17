import apiClient from './client'
import type { SectorSuggestions } from '../types'

export async function listSectors() {
  const res = await apiClient.get<SectorSuggestions[]>('/sectors')
  return res.data
}

export async function getSector(code: string) {
  const res = await apiClient.get<SectorSuggestions>(`/sectors/${code}`)
  return res.data
}

export interface SectorUpdateResponse {
  sector: string
  label: string
  suggestions: {
    label: string
    suggested_data_types: string[]
    suggested_activities: string[]
    suggested_templates: string[]
  }
  message: string
}

export async function setCompanySector(sector_code: string) {
  const res = await apiClient.patch<SectorUpdateResponse>('/sectors/company/sector', {
    sector: sector_code,
  })
  return res.data
}
