import apiClient from './client'

export interface BulkImportRequest {
  activities: Array<Record<string, unknown>>
}

export interface BulkImportError {
  row: number
  detail: string
}

export interface BulkImportResult {
  created: number
  errors: BulkImportError[]
}

export async function importTreatmentActivities(payload: BulkImportRequest) {
  const res = await apiClient.post<BulkImportResult>(
    '/import/treatment-activities',
    payload
  )
  return res.data
}

export async function exportTreatmentActivitiesCsv(): Promise<Blob> {
  const res = await apiClient.get<Blob>('/export/treatment-activities', {
    responseType: 'blob',
  })
  return res.data
}

export async function exportComplianceReport() {
  const res = await apiClient.get<Record<string, unknown>>('/export/compliance-report')
  return res.data
}
