import apiClient from './client'
import type { User } from '../types'

export interface UserCreate {
  email: string
  password: string
  full_name: string
  role: string
  department_id?: number | null
}

export interface UserUpdate {
  email?: string
  full_name?: string
  role?: string
  department_id?: number | null
  is_active?: boolean
  password?: string
}

export async function getUsers(params?: {
  skip?: number
  limit?: number
  tenant_id?: number
}): Promise<User[]> {
  const response = await apiClient.get('/users', { params })
  return response.data
}

export async function createUser(data: UserCreate): Promise<User> {
  const response = await apiClient.post('/users', data)
  return response.data
}

export async function updateUser(userId: number, data: UserUpdate): Promise<User> {
  const response = await apiClient.put(`/users/${userId}`, data)
  return response.data
}

export async function deleteUser(userId: number): Promise<void> {
  await apiClient.delete(`/users/${userId}`)
}

export async function getUser(userId: number): Promise<User> {
  const response = await apiClient.get(`/users/${userId}`)
  return response.data
}
