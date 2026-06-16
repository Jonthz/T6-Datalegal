import apiClient from './client'
import type { Alert } from '../types'

export interface AlertCreate {
  alert_type: string
  title: string
  message: string
  severity?: string
  resource_type?: string | null
  resource_id?: number | null
  recipient_id?: number | null
}

export async function getUnreadCount() {
  const res = await apiClient.get<{ unread_count: number }>('/alerts/unread-count')
  return res.data
}

export async function listAlerts(params?: {
  is_read?: boolean
  skip?: number
  limit?: number
}) {
  const res = await apiClient.get<Alert[]>('/alerts', { params })
  return res.data
}

export async function createAlert(data: AlertCreate) {
  const res = await apiClient.post<Alert>('/alerts', data)
  return res.data
}

export async function markAlertRead(id: number) {
  const res = await apiClient.patch<Alert>(`/alerts/${id}/read`)
  return res.data
}

export async function deleteAlert(id: number) {
  await apiClient.delete(`/alerts/${id}`)
}
