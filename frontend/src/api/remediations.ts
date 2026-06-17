import apiClient from './client'
import type { Remediation } from '../types'

export interface RemediationCreate {
  risk_assessment_id: number
  title: string
  description?: string
  responsible_id?: number | null
  due_date?: string | null
}

export interface RemediationUpdate {
  title?: string
  description?: string
  responsible_id?: number | null
  due_date?: string | null
  completed_date?: string | null
  status?: string
  risk_score_after?: number | null
  risk_level_after?: string | null
}

export async function listRemediations(params?: {
  risk_assessment_id?: number
  remediation_status?: string
  skip?: number
  limit?: number
}) {
  const res = await apiClient.get<Remediation[]>('/remediations', { params })
  return res.data
}

export async function getRemediation(id: number) {
  const res = await apiClient.get<Remediation>(`/remediations/${id}`)
  return res.data
}

export async function createRemediation(data: RemediationCreate) {
  const res = await apiClient.post<Remediation>('/remediations', data)
  return res.data
}

export async function updateRemediation(id: number, data: RemediationUpdate) {
  const res = await apiClient.patch<Remediation>(`/remediations/${id}`, data)
  return res.data
}
