import apiClient from './client'
import type {
  TrainingProgram,
  TrainingModule,
  TrainingMaterial,
  TrainingEnrollment,
} from '../types'

export interface ProgramCreate {
  title: string
  description?: string
}

export interface ProgramUpdate {
  title?: string
  description?: string
  is_active?: boolean
}

export interface ModuleCreate {
  title: string
  description?: string
  order?: number
}

export interface ModuleUpdate {
  title?: string
  description?: string
  order?: number
}

export interface MaterialCreate {
  title: string
  content_type?: string
  url?: string | null
  content?: string
}

export interface MaterialUpdate {
  title?: string
  content_type?: string
  url?: string | null
  content?: string
}

export interface EnrollmentCreate {
  user_id: number
  program_id: number
}

export interface EnrollmentUpdate {
  progress_pct?: number
  completed_at?: string | null
}

export async function listPrograms(params?: { skip?: number; limit?: number }) {
  const res = await apiClient.get<TrainingProgram[]>('/training/programs', { params })
  return res.data
}

export async function getProgram(id: number) {
  const res = await apiClient.get<TrainingProgram>(`/training/programs/${id}`)
  return res.data
}

export async function createProgram(data: ProgramCreate) {
  const res = await apiClient.post<TrainingProgram>('/training/programs', data)
  return res.data
}

export async function updateProgram(id: number, data: ProgramUpdate) {
  const res = await apiClient.put<TrainingProgram>(`/training/programs/${id}`, data)
  return res.data
}

export async function deleteProgram(id: number) {
  await apiClient.delete(`/training/programs/${id}`)
}

export async function listModules(programId: number) {
  const res = await apiClient.get<TrainingModule[]>(
    `/training/programs/${programId}/modules`
  )
  return res.data
}

export async function createModule(programId: number, data: ModuleCreate) {
  const res = await apiClient.post<TrainingModule>(
    `/training/programs/${programId}/modules`,
    data
  )
  return res.data
}

export async function updateModule(id: number, data: ModuleUpdate) {
  const res = await apiClient.put<TrainingModule>(`/training/modules/${id}`, data)
  return res.data
}

export async function listMaterials(moduleId: number) {
  const res = await apiClient.get<TrainingMaterial[]>(
    `/training/modules/${moduleId}/materials`
  )
  return res.data
}

export async function createMaterial(moduleId: number, data: MaterialCreate) {
  const res = await apiClient.post<TrainingMaterial>(
    `/training/modules/${moduleId}/materials`,
    data
  )
  return res.data
}

export async function updateMaterial(id: number, data: MaterialUpdate) {
  const res = await apiClient.put<TrainingMaterial>(`/training/materials/${id}`, data)
  return res.data
}

export async function listEnrollments(params?: { user_id?: number; program_id?: number }) {
  const res = await apiClient.get<TrainingEnrollment[]>('/training/enrollments', { params })
  return res.data
}

export async function createEnrollment(data: EnrollmentCreate) {
  const res = await apiClient.post<TrainingEnrollment>('/training/enrollments', data)
  return res.data
}

export async function updateEnrollment(id: number, data: EnrollmentUpdate) {
  const res = await apiClient.put<TrainingEnrollment>(
    `/training/enrollments/${id}`,
    data
  )
  return res.data
}
