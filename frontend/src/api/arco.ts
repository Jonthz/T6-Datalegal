import apiClient from './client'
import type { ARCORequest, ARCODashboard, ARCOSLAStatus } from '../types'

export interface ARCORequestCreate {
  request_type: string
  requester_name: string
  requester_email: string
  requester_id_number: string
  description?: string
}

export interface ARCORequestUpdate {
  status?: string
  assigned_dpo_id?: number | null
  response_text?: string
  rejection_reason?: string
}

export async function getARCODashboard() {
  const res = await apiClient.get<ARCODashboard>('/arco-requests/dashboard')
  return res.data
}

export async function listARCORequests(params?: { request_type?: string; status?: string }) {
  const res = await apiClient.get<ARCORequest[]>('/arco-requests', { params })
  return res.data
}

export async function getARCORequest(id: number) {
  const res = await apiClient.get<ARCORequest>(`/arco-requests/${id}`)
  return res.data
}

export async function createARCORequest(data: ARCORequestCreate) {
  const res = await apiClient.post<ARCORequest>('/arco-requests', data)
  return res.data
}

export async function updateARCORequest(id: number, data: ARCORequestUpdate) {
  const res = await apiClient.patch<ARCORequest>(`/arco-requests/${id}`, data)
  return res.data
}

export async function getARCOSLAStatus(id: number) {
  const res = await apiClient.get<ARCOSLAStatus>(`/arco-requests/${id}/sla-status`)
  return res.data
}
