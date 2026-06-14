export type ClassValue =
  | string
  | number
  | null
  | undefined
  | false
  | ClassValue[]
  | { [key: string]: boolean | null | undefined }

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = []
  const push = (value: ClassValue) => {
    if (!value && value !== 0) return
    if (typeof value === 'string' || typeof value === 'number') {
      out.push(String(value))
      return
    }
    if (Array.isArray(value)) {
      value.forEach(push)
      return
    }
    if (typeof value === 'object') {
      for (const key of Object.keys(value)) {
        if (value[key]) out.push(key)
      }
    }
  }
  inputs.forEach(push)
  return out.join(' ')
}
