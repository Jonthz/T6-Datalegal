import axios from 'axios'

const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: attach JWT Bearer token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: handle 401 by clearing token and redirecting to login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = String(error.config?.url ?? '')
    const isAuthEndpoint =
      requestUrl.includes('/auth/login') || requestUrl.includes('/auth/mfa-verify')

    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('role')
      localStorage.removeItem('tenant_id')
      localStorage.removeItem('account_scope')
      localStorage.removeItem('platform_permissions')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient
