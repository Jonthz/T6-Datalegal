import apiClient from './client'
import type { QuestionnaireSchema, RiskAssessment, RiskDashboard } from '../types'

export interface RiskAssessmentCreate {
  treatment_activity_id: number
  responses: Record<string, boolean>
  notes?: string
}

export interface RiskAssessmentUpdate {
  responses?: Record<string, boolean>
  notes?: string
  status?: string
}

export async function getQuestionnaire() {
  const res = await apiClient.get<QuestionnaireSchema>('/risk-assessments/questionnaire')
  return res.data
}

export async function getRiskDashboard() {
  const res = await apiClient.get<RiskDashboard>('/risk-assessments/dashboard')
  return res.data
}

export async function listRiskAssessments(params?: {
  treatment_activity_id?: number
  risk_level?: string
}) {
  const res = await apiClient.get<RiskAssessment[]>('/risk-assessments', { params })
  return res.data
}

export async function getRiskAssessment(id: number) {
  const res = await apiClient.get<RiskAssessment>(`/risk-assessments/${id}`)
  return res.data
}

export async function createRiskAssessment(data: RiskAssessmentCreate) {
  const res = await apiClient.post<RiskAssessment>('/risk-assessments', data)
  return res.data
}

export async function updateRiskAssessment(id: number, data: RiskAssessmentUpdate) {
  const res = await apiClient.patch<RiskAssessment>(`/risk-assessments/${id}`, data)
  return res.data
}
