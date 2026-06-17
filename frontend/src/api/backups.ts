import apiClient from './client'
import type { BackupRecord, BackupVerifyResult } from '../types'

export async function listBackups(params?: { skip?: number; limit?: number }) {
  const res = await apiClient.get<BackupRecord[]>('/backups', { params })
  return res.data
}

export async function getBackup(id: number) {
  const res = await apiClient.get<BackupRecord>(`/backups/${id}`)
  return res.data
}

export async function createBackup() {
  const res = await apiClient.post<BackupRecord>('/backups/create')
  return res.data
}

export async function verifyBackup(id: number) {
  const res = await apiClient.post<BackupVerifyResult>(`/backups/${id}/verify`)
  return res.data
}
