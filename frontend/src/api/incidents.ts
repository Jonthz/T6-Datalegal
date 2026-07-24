import apiClient from './client'
import type { Incident } from '../types'

export const VULNERABILITY_TYPES = ['CONFIDENTIALITY', 'INTEGRITY', 'AVAILABILITY'] as const

export interface IncidentCreate {
  title: string
  description: string
  incident_type: string
  severity?: string
  vulnerability_types?: string[]
  regulatory_notification_required?: boolean
  affected_data_types?: string
  department_id?: number | null
  assigned_to_id?: number | null
  delegate_name?: string | null
  delegate_email?: string | null
  delegate_phone?: string | null
  controller_name?: string | null
  controller_email?: string | null
  controller_phone?: string | null
}

export interface IncidentUpdate {
  title?: string
  description?: string
  incident_type?: string
  severity?: string
  status?: string
  vulnerability_types?: string[]
  regulatory_notification_required?: boolean
  regulatory_notified_at?: string | null
  assigned_to_id?: number | null
  resolved_at?: string | null
  affected_data_types?: string
  delegate_name?: string | null
  delegate_email?: string | null
  delegate_phone?: string | null
  controller_name?: string | null
  controller_email?: string | null
  controller_phone?: string | null
}

export async function listIncidents(params?: {
  status?: string
  severity?: string
  skip?: number
  limit?: number
}) {
  const res = await apiClient.get<Incident[]>('/incidents', { params })
  return res.data
}

export async function getIncident(id: number) {
  const res = await apiClient.get<Incident>(`/incidents/${id}`)
  return res.data
}

export async function createIncident(data: IncidentCreate) {
  const res = await apiClient.post<Incident>('/incidents', data)
  return res.data
}

export async function updateIncident(id: number, data: IncidentUpdate) {
  const res = await apiClient.patch<Incident>(`/incidents/${id}`, data)
  return res.data
}

export async function notifyIncident(id: number) {
  const res = await apiClient.post<Incident>(`/incidents/${id}/notify`)
  return res.data
}

export async function closeIncident(id: number, closureSummary: string) {
  const res = await apiClient.post<Incident>(`/incidents/${id}/close`, {
    closure_summary: closureSummary,
  })
  return res.data
}

export async function downloadIncidentReport(id: number) {
  const res = await apiClient.get(`/incidents/${id}/report.pdf`, {
    responseType: 'blob',
  })
  const url = window.URL.createObjectURL(res.data as Blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `incident_${id}_closure.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
