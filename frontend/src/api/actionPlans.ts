import apiClient from './client'
import type { ActionPlan, ActionPlanTask, ActionPlanTemplate } from '../types'

export interface ActionPlanTemplateCreate {
  name: string
  description?: string
  applies_to_level?: string
  default_tasks?: ActionPlanTask[]
}

export interface ActionPlanCreate {
  risk_assessment_id?: number | null
  template_id?: number | null
  title: string
  description?: string
  tasks?: ActionPlanTask[]
  target_date?: string | null
}

export interface ActionPlanUpdate {
  title?: string
  description?: string
  status?: string
  tasks?: ActionPlanTask[]
  target_date?: string | null
}

export async function listActionPlanTemplates() {
  const res = await apiClient.get<ActionPlanTemplate[]>('/action-plans/templates')
  return res.data
}

export async function createActionPlanTemplate(data: ActionPlanTemplateCreate) {
  const res = await apiClient.post<ActionPlanTemplate>('/action-plans/templates', data)
  return res.data
}

export async function autoGenerateActionPlans() {
  const res = await apiClient.post<ActionPlan[]>('/action-plans/auto-generate')
  return res.data
}

export async function listActionPlans(params?: {
  plan_status?: string
  risk_assessment_id?: number
}) {
  const res = await apiClient.get<ActionPlan[]>('/action-plans', { params })
  return res.data
}

export async function getActionPlan(id: number) {
  const res = await apiClient.get<ActionPlan>(`/action-plans/${id}`)
  return res.data
}

export async function createActionPlan(data: ActionPlanCreate) {
  const res = await apiClient.post<ActionPlan>('/action-plans', data)
  return res.data
}

export async function updateActionPlan(id: number, data: ActionPlanUpdate) {
  const res = await apiClient.patch<ActionPlan>(`/action-plans/${id}`, data)
  return res.data
}
