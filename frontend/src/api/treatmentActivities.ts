import apiClient from './client'
import type { TreatmentActivity } from '../types'

export interface TreatmentActivityCreate {
  name: string
  purpose: string
  legal_basis?: string
  legal_bases?: string[]
  complementary_legal_bases?: string[]
  personal_data_types?: string[]
  data_subjects?: string[]
  retention_period_days?: number
  is_cross_border?: boolean
  destination_countries?: string[]
  processor_name?: string | null
  processor_country?: string | null
  department_id?: number | null
  status?: string
  // Variables adicionales del RAT
  area?: string | null
  operational_owner?: string | null
  data_categories?: string[]
  data_origin?: string | null
  treatment_operations?: string[]
  uses_profiling?: boolean
  uses_ai?: boolean
  automated_decision?: boolean
  requires_dpia?: boolean
  has_special_data?: boolean
  involves_minors?: boolean
  recipients?: string[]
  processors?: string[]
  system_platform?: string | null
  technical_measures?: string | null
  organizational_measures?: string | null
  physical_measures?: string | null
  legal_measures?: string | null
  mtge_score?: number | null
  mtge_result?: string | null
}

export type TreatmentActivityUpdate = Partial<TreatmentActivityCreate>

export interface WizardStartBody {
  name: string
  purpose: string
  department_id?: number | null
  area?: string | null
}

export interface WizardLegalBasisBody {
  legal_basis?: string
  legal_bases?: string[]
  complementary_legal_bases?: string[]
  personal_data_types: string[]
  data_subjects: string[]
}

export interface WizardTransfersBody {
  is_cross_border: boolean
  destination_countries?: string[]
  processor_name?: string | null
  processor_country?: string | null
}

export async function listTreatmentActivities(params?: {
  status?: string
  department_id?: number
  skip?: number
  limit?: number
}) {
  const res = await apiClient.get<TreatmentActivity[]>('/treatment-activities', { params })
  return res.data
}

export async function getTreatmentActivity(id: number) {
  const res = await apiClient.get<TreatmentActivity>(`/treatment-activities/${id}`)
  return res.data
}

export async function createTreatmentActivity(data: TreatmentActivityCreate) {
  const res = await apiClient.post<TreatmentActivity>('/treatment-activities', data)
  return res.data
}

export async function updateTreatmentActivity(id: number, data: TreatmentActivityUpdate) {
  const res = await apiClient.patch<TreatmentActivity>(`/treatment-activities/${id}`, data)
  return res.data
}

export async function deleteTreatmentActivity(id: number) {
  await apiClient.delete(`/treatment-activities/${id}`)
}

export async function wizardStart(body: WizardStartBody) {
  const res = await apiClient.post<TreatmentActivity>('/treatment-activities/wizard/start', body)
  return res.data
}

export async function wizardLegalBasis(id: number, body: WizardLegalBasisBody) {
  const res = await apiClient.patch<TreatmentActivity>(
    `/treatment-activities/wizard/${id}/legal-basis`,
    body
  )
  return res.data
}

export async function wizardTransfers(id: number, body: WizardTransfersBody) {
  const res = await apiClient.patch<TreatmentActivity>(
    `/treatment-activities/wizard/${id}/transfers`,
    body
  )
  return res.data
}

export async function wizardFinalize(id: number) {
  const res = await apiClient.post<TreatmentActivity>(
    `/treatment-activities/wizard/${id}/finalize`
  )
  return res.data
}
