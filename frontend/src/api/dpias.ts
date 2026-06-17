import apiClient from './client'
import type { DPIA } from '../types'

export interface DPIACreate {
  treatment_activity_id: number
  step1_description?: string
  step2_risk_analysis?: string
  step3_mitigations?: string
}

export interface DPIAUpdate {
  step1_description?: string
  step2_risk_analysis?: string
  step3_mitigations?: string
  status?: string
}

export async function listDPIAs() {
  const res = await apiClient.get<DPIA[]>('/dpias')
  return res.data
}

export async function getDPIA(id: number) {
  const res = await apiClient.get<DPIA>(`/dpias/${id}`)
  return res.data
}

export async function createDPIA(data: DPIACreate) {
  const res = await apiClient.post<DPIA>('/dpias', data)
  return res.data
}

export async function updateDPIA(id: number, data: DPIAUpdate) {
  const res = await apiClient.patch<DPIA>(`/dpias/${id}`, data)
  return res.data
}

export async function signDPIA(id: number) {
  const res = await apiClient.post<DPIA>(`/dpias/${id}/sign`)
  return res.data
}

export async function downloadDPIAPdf(id: number): Promise<Blob> {
  const res = await apiClient.get<Blob>(`/dpias/${id}/pdf`, { responseType: 'blob' })
  return res.data
}
