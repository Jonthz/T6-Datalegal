import apiClient from './client'
import type { Tenant, TenantProvisionRequest } from '../types'

export async function listTenants() {
  const res = await apiClient.get<Tenant[]>('/tenants')
  return res.data
}

export async function getTenant(id: number) {
  const res = await apiClient.get<Tenant>(`/tenants/${id}`)
  return res.data
}

export async function provisionTenant(payload: TenantProvisionRequest) {
  const res = await apiClient.post<{ tenant: Tenant; admin_user: unknown }>(
    '/tenants/provision',
    payload
  )
  return res.data
}
