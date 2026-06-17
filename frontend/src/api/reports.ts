import apiClient from './client'
import type { ConsolidatedSummaryReport, ReportKPIs, ReportTrends } from '../types'

export async function getKPIs() {
  const res = await apiClient.get<ReportKPIs>('/reports/kpis')
  return res.data
}

export async function getTrends(months: number = 6) {
  const res = await apiClient.get<ReportTrends>('/reports/trends', { params: { months } })
  return res.data
}

export async function getConsolidatedSummary() {
  const res = await apiClient.get<ConsolidatedSummaryReport>('/reports/summary')
  return res.data
}

export async function downloadSummaryPdf(): Promise<Blob> {
  const res = await apiClient.get<Blob>('/reports/summary/pdf', { responseType: 'blob' })
  return res.data
}

export async function downloadSummaryCsv(): Promise<Blob> {
  const res = await apiClient.get<Blob>('/reports/summary/csv', { responseType: 'blob' })
  return res.data
}
