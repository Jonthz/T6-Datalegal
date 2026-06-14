import apiClient from './client'
import type { PortabilityRequest, PortabilityExport } from '../types'

export interface PortabilityRequestCreate {
  subject_name: string
  subject_email: string
  notes?: string
}

export interface PortabilityRequestUpdate {
  status?: string
  notes?: string
  response_data?: Record<string, unknown>
}

export async function listPortabilityRequests(params?: {
  status?: string
  skip?: number
  limit?: number
}) {
  const res = await apiClient.get<PortabilityRequest[]>('/portability', { params })
  return res.data
}

export async function getPortabilityRequest(id: number) {
  const res = await apiClient.get<PortabilityRequest>(`/portability/${id}`)
  return res.data
}

export async function createPortabilityRequest(data: PortabilityRequestCreate) {
  const res = await apiClient.post<PortabilityRequest>('/portability', data)
  return res.data
}

export async function completePortabilityRequest(
  id: number,
  data: PortabilityRequestUpdate
) {
  const res = await apiClient.put<PortabilityRequest>(`/portability/${id}/complete`, data)
  return res.data
}

export async function exportPortability(id: number) {
  const res = await apiClient.get<PortabilityExport>(`/portability/${id}/export`)
  return res.data
}
