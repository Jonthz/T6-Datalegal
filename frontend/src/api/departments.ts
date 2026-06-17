import apiClient from './client'
import type { Department } from '../types'

export interface DepartmentCreate {
  name: string
  head_user_id?: number | null
}

export interface DepartmentUpdate {
  name?: string
  head_user_id?: number | null
}

export async function listDepartments(params?: { skip?: number; limit?: number }) {
  const res = await apiClient.get<Department[]>('/departments', { params })
  return res.data
}

export async function getDepartment(id: number) {
  const res = await apiClient.get<Department>(`/departments/${id}`)
  return res.data
}

export async function createDepartment(data: DepartmentCreate) {
  const res = await apiClient.post<Department>('/departments', data)
  return res.data
}

export async function updateDepartment(id: number, data: DepartmentUpdate) {
  const res = await apiClient.put<Department>(`/departments/${id}`, data)
  return res.data
}

export async function deleteDepartment(id: number) {
  await apiClient.delete(`/departments/${id}`)
}
