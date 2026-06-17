export function formatDate(value: string | Date | null | undefined, locale = 'en-US'): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: '2-digit' })
}

export function formatDateTime(
  value: string | Date | null | undefined,
  locale = 'en-US'
): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatRelative(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '—'
  const diffMs = date.getTime() - Date.now()
  const abs = Math.abs(diffMs)
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['second', 1000],
    ['minute', 60_000],
    ['hour', 3_600_000],
    ['day', 86_400_000],
    ['week', 604_800_000],
    ['month', 2_629_800_000],
    ['year', 31_557_600_000],
  ]
  const rtf = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' })
  let bestUnit: Intl.RelativeTimeFormatUnit = 'second'
  let bestDivisor = 1000
  for (const [unit, divisor] of units) {
    if (abs >= divisor) {
      bestUnit = unit
      bestDivisor = divisor
    }
  }
  return rtf.format(Math.round(diffMs / bestDivisor), bestUnit)
}

export function formatPercent(
  value: number | null | undefined,
  fractionDigits = 0
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${value.toFixed(fractionDigits)}%`
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return value.toLocaleString('en-US')
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}
