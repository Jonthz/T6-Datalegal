import apiClient from './client'
import type { AuditPlan, AuditFinding } from '../types'

export interface AuditPlanCreate {
  name: string
  scope?: string
  period_start?: string | null
  period_end?: string | null
  auditor_id?: number | null
  notes?: string
}

export interface AuditPlanUpdate {
  name?: string
  scope?: string
  period_start?: string | null
  period_end?: string | null
  auditor_id?: number | null
  status?: string
  notes?: string
}

export interface AuditFindingCreate {
  audit_plan_id: number
  title: string
  description?: string
  evidence?: string
  severity?: string
  remediation_notes?: string
  remediation_date?: string | null
}

export interface AuditFindingUpdate {
  title?: string
  description?: string
  evidence?: string
  severity?: string
  status?: string
  remediation_notes?: string
  remediation_date?: string | null
}

export async function listAuditPlans(params?: {
  plan_status?: string
  skip?: number
  limit?: number
}) {
  const res = await apiClient.get<AuditPlan[]>('/audit-plans', { params })
  return res.data
}

export async function getAuditPlan(id: number) {
  const res = await apiClient.get<AuditPlan>(`/audit-plans/${id}`)
  return res.data
}

export async function createAuditPlan(data: AuditPlanCreate) {
  const res = await apiClient.post<AuditPlan>('/audit-plans', data)
  return res.data
}

export async function updateAuditPlan(id: number, data: AuditPlanUpdate) {
  const res = await apiClient.patch<AuditPlan>(`/audit-plans/${id}`, data)
  return res.data
}

export async function listAuditFindings(
  planId: number,
  params?: { severity?: string; finding_status?: string }
) {
  const res = await apiClient.get<AuditFinding[]>(`/audit-plans/${planId}/findings`, { params })
  return res.data
}

export async function createAuditFinding(data: AuditFindingCreate) {
  const res = await apiClient.post<AuditFinding>('/audit-plans/findings', data)
  return res.data
}

export async function updateAuditFinding(id: number, data: AuditFindingUpdate) {
  const res = await apiClient.patch<AuditFinding>(`/audit-plans/findings/${id}`, data)
  return res.data
}

export async function downloadAuditReportPdf(planId: number): Promise<Blob> {
  const res = await apiClient.get<Blob>(`/audit-plans/${planId}/report`, {
    responseType: 'blob',
  })
  return res.data
}
