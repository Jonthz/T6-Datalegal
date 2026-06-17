import apiClient from './client'
import type { LegalDocument, TemplateTypeInfo } from '../types'

export interface LegalDocumentCreate {
  doc_type: string
  title: string
  version: string
  effective_date: string
  parameters?: Record<string, unknown>
  content?: string
}

export async function listTemplateTypes() {
  const res = await apiClient.get<TemplateTypeInfo[]>('/legal-documents/template-types')
  return res.data
}

export async function listLegalDocuments(params?: {
  doc_type?: string
  current_only?: boolean
  skip?: number
  limit?: number
}) {
  const res = await apiClient.get<LegalDocument[]>('/legal-documents', { params })
  return res.data
}

export async function getLegalDocument(id: number) {
  const res = await apiClient.get<LegalDocument>(`/legal-documents/${id}`)
  return res.data
}

export async function createLegalDocument(data: LegalDocumentCreate) {
  const res = await apiClient.post<LegalDocument>('/legal-documents', data)
  return res.data
}

export async function downloadLegalDocumentPdf(id: number): Promise<Blob> {
  const res = await apiClient.get<Blob>(`/legal-documents/${id}/pdf`, { responseType: 'blob' })
  return res.data
}
