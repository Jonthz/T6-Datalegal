import apiClient from './client'
import type {
  ConsentRecord,
  CookieBanner,
  CookieConsent,
  ConsentStats,
} from '../types'

export interface ConsentRecordCreate {
  treatment_activity_id?: number | null
  data_subject_token: string
  legal_basis: string
  purpose: string
  is_sensitive?: boolean
}

export interface ConsentRevokeBody {
  revocation_reason?: string
}

export interface CookieBannerCreate {
  version: string
  content: string
  effective_date: string
}

export interface CookieBannerUpdate {
  content?: string
  is_active?: boolean
}

export interface CookieConsentCreate {
  banner_id: number
  data_subject_token: string
}

export async function getConsentStats() {
  const res = await apiClient.get<ConsentStats>('/consents/stats')
  return res.data
}

export async function listConsentRecords(params?: {
  is_revoked?: boolean
  is_sensitive?: boolean
  skip?: number
  limit?: number
}) {
  const res = await apiClient.get<ConsentRecord[]>('/consents', { params })
  return res.data
}

export async function getConsentRecord(id: number) {
  const res = await apiClient.get<ConsentRecord>(`/consents/${id}`)
  return res.data
}

export async function createConsentRecord(data: ConsentRecordCreate) {
  const res = await apiClient.post<ConsentRecord>('/consents', data)
  return res.data
}

export async function revokeConsentRecord(id: number, body: ConsentRevokeBody = {}) {
  const res = await apiClient.post<ConsentRecord>(`/consents/${id}/revoke`, body)
  return res.data
}

export async function listCookieBanners(params?: { active_only?: boolean }) {
  const res = await apiClient.get<CookieBanner[]>('/cookie-banners', { params })
  return res.data
}

export async function createCookieBanner(data: CookieBannerCreate) {
  const res = await apiClient.post<CookieBanner>('/cookie-banners', data)
  return res.data
}

export async function updateCookieBanner(id: number, data: CookieBannerUpdate) {
  const res = await apiClient.patch<CookieBanner>(`/cookie-banners/${id}`, data)
  return res.data
}

export async function createCookieConsent(data: CookieConsentCreate) {
  const res = await apiClient.post<CookieConsent>('/cookie-consents', data)
  return res.data
}

export async function revokeCookieConsent(id: number) {
  const res = await apiClient.post<CookieConsent>(`/cookie-consents/${id}/revoke`)
  return res.data
}
