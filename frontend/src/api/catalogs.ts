import apiClient from './client'
import type { CatalogEntry } from '../types'

export interface CatalogEntryCreate {
  type: string
  code: string
  label: string
  description?: string
}

export interface CatalogEntryUpdate {
  label?: string
  description?: string
  is_active?: boolean
  sensitivity?: string | null
  criticality?: string | null
}

export async function listCatalogs(params?: { type?: string; skip?: number; limit?: number }) {
  const res = await apiClient.get<CatalogEntry[]>('/catalogs', { params })
  return res.data
}

export async function listCatalogByType(type: string) {
  const res = await apiClient.get<CatalogEntry[]>(`/catalogs/${type}`)
  return res.data
}

export async function bulkLoadCatalog(entries: CatalogEntryCreate[]) {
  const res = await apiClient.post<CatalogEntry[]>('/catalogs/bulk-load', { entries })
  return res.data
}

export async function updateCatalogEntry(id: number, data: CatalogEntryUpdate) {
  const res = await apiClient.patch<CatalogEntry>(`/catalogs/${id}`, data)
  return res.data
}

export async function deleteCatalogEntry(id: number) {
  await apiClient.delete(`/catalogs/${id}`)
}
