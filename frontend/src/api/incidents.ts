import apiClient from './client'
import type { Incident } from '../types'

export interface IncidentCreate {
  title: string
  description: string
  incident_type: string
  severity?: string
  regulatory_notification_required?: boolean
  affected_data_types?: string
  department_id?: number | null
  assigned_to_id?: number | null
}

export interface IncidentUpdate {
  title?: string
  description?: string
  incident_type?: string
  severity?: string
  status?: string
  regulatory_notification_required?: boolean
  regulatory_notified_at?: string | null
  assigned_to_id?: number | null
  resolved_at?: string | null
  affected_data_types?: string
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
