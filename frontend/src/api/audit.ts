import apiClient from './client'
import type { AuditLog } from '../types'

export interface AuditLogFilter {
  action?: string
  user_id?: number
  from_date?: string
  to_date?: string
  skip?: number
  limit?: number
}

export async function listAuditLog(params?: AuditLogFilter) {
  const res = await apiClient.get<AuditLog[]>('/audit', { params })
  return res.data
}

export async function exportAuditLogCsv(params?: {
  action?: string
  from_date?: string
  to_date?: string
}): Promise<Blob> {
  const res = await apiClient.get<Blob>('/audit/export', {
    params,
    responseType: 'blob',
  })
  return res.data
}
