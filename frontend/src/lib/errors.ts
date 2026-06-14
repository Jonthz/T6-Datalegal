interface AxiosLikeError {
  response?: {
    data?: {
      detail?: unknown
      message?: unknown
    }
    status?: number
  }
  message?: string
}

export function extractErrorMessage(err: unknown, fallback: string): string {
  if (!err) return fallback
  const axiosErr = err as AxiosLikeError
  const detail = axiosErr.response?.data?.detail
  if (typeof detail === 'string' && detail.trim()) return detail
  if (Array.isArray(detail)) {
    const first = detail[0]
    if (first && typeof first === 'object' && 'msg' in first && typeof (first as { msg?: unknown }).msg === 'string') {
      return (first as { msg: string }).msg
    }
  }
  const message = axiosErr.response?.data?.message
  if (typeof message === 'string' && message.trim()) return message
  if (typeof axiosErr.message === 'string' && axiosErr.message.trim()) return axiosErr.message
  return fallback
}

export function getStatus(err: unknown): number | undefined {
  return (err as AxiosLikeError)?.response?.status
}
