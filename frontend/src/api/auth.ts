import apiClient from './client'
import type { TokenResponse, MFAPendingResponse } from '../types'

export async function login(
  email: string,
  password: string
): Promise<TokenResponse | MFAPendingResponse> {
  const response = await apiClient.post('/auth/login', { email, password })
  return response.data
}

export async function verifyMFA(
  mfaToken: string,
  code: string
): Promise<TokenResponse> {
  const response = await apiClient.post('/auth/mfa-verify', {
    mfa_token: mfaToken,
    code,
  })
  return response.data
}

export async function setupMFA(): Promise<{ secret: string; uri: string; message: string }> {
  const response = await apiClient.post('/auth/mfa-setup')
  return response.data
}

export async function confirmMFA(code: string): Promise<{ message: string }> {
  const response = await apiClient.post('/auth/mfa-confirm', { code })
  return response.data
}
