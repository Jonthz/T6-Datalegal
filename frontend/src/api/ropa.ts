import apiClient from './client'
import type { ROPAReport } from '../types'

export async function getROPAReport() {
  const res = await apiClient.get<ROPAReport>('/ropa')
  return res.data
}

export async function downloadROPAPdf(): Promise<Blob> {
  const res = await apiClient.get<Blob>('/ropa/pdf', { responseType: 'blob' })
  return res.data
}
