import apiClient from './client'
import type { InformationAsset } from '../types'

export interface InformationAssetCreate {
  name: string
  description?: string
  asset_type_code: string
  format_code: string
  storage_medium_code: string
  classification_level_code: string
  treatment_activity_id?: number | null
  department_id?: number | null
}

export type InformationAssetUpdate = Partial<InformationAssetCreate>

export async function listInformationAssets(params?: {
  classification?: string
  treatment_activity_id?: number
  skip?: number
  limit?: number
}) {
  const res = await apiClient.get<InformationAsset[]>('/information-assets', { params })
  return res.data
}

export async function getInformationAsset(id: number) {
  const res = await apiClient.get<InformationAsset>(`/information-assets/${id}`)
  return res.data
}

export async function createInformationAsset(data: InformationAssetCreate) {
  const res = await apiClient.post<InformationAsset>('/information-assets', data)
  return res.data
}

export async function updateInformationAsset(id: number, data: InformationAssetUpdate) {
  const res = await apiClient.patch<InformationAsset>(`/information-assets/${id}`, data)
  return res.data
}

export async function deleteInformationAsset(id: number) {
  await apiClient.delete(`/information-assets/${id}`)
}
