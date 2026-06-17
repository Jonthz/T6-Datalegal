import apiClient from './client'
import type {
  RetentionPolicy,
  RetentionRecord,
  RetentionExecutionLog,
  ExpiredUnderReviewReport,
} from '../types'

export interface RetentionPolicyCreate {
  name: string
  data_category: string
  retention_days: number
  action_on_expiry?: string
  legal_basis?: string
}

export type RetentionPolicyUpdate = Partial<RetentionPolicyCreate> & { is_active?: boolean }

export interface RetentionRecordCreate {
  information_asset_id: number
  policy_id?: number | null
  expiry_date: string
  legal_hold?: boolean
  hold_justification?: string
}

export interface RetentionRecordUpdate {
  status?: string
  legal_hold?: boolean
  hold_justification?: string
  review_decision?: string
  decision_rationale?: string
}

export interface RetentionExecuteBody {
  policy_id?: number | null
  run_type?: string
}

export async function listRetentionPolicies() {
  const res = await apiClient.get<RetentionPolicy[]>('/retention/policies')
  return res.data
}

export async function createRetentionPolicy(data: RetentionPolicyCreate) {
  const res = await apiClient.post<RetentionPolicy>('/retention/policies', data)
  return res.data
}

export async function updateRetentionPolicy(id: number, data: RetentionPolicyUpdate) {
  const res = await apiClient.patch<RetentionPolicy>(`/retention/policies/${id}`, data)
  return res.data
}

export async function listRetentionRecords(params?: {
  record_status?: string
  legal_hold?: boolean
}) {
  const res = await apiClient.get<RetentionRecord[]>('/retention/records', { params })
  return res.data
}

export async function createRetentionRecord(data: RetentionRecordCreate) {
  const res = await apiClient.post<RetentionRecord>('/retention/records', data)
  return res.data
}

export async function updateRetentionRecord(id: number, data: RetentionRecordUpdate) {
  const res = await apiClient.patch<RetentionRecord>(`/retention/records/${id}`, data)
  return res.data
}

export async function getExpiredUnderReview() {
  const res = await apiClient.get<ExpiredUnderReviewReport>('/retention/expired-under-review')
  return res.data
}

export async function executeRetention(body: RetentionExecuteBody = {}) {
  const res = await apiClient.post<RetentionExecutionLog>('/retention/execute', body)
  return res.data
}

export async function listRetentionExecutionLogs() {
  const res = await apiClient.get<RetentionExecutionLog[]>('/retention/execution-logs')
  return res.data
}
