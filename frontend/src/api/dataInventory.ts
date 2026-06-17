import apiClient from './client'
import type { DataInventoryProgress } from '../types'

export async function getDataInventoryProgress() {
  const res = await apiClient.get<DataInventoryProgress>('/data-inventory/progress')
  return res.data
}
