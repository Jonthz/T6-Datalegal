import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type AlertTone = 'info' | 'success' | 'warning' | 'danger'

const toneClasses: Record<AlertTone, string> = {
  info: 'bg-sky-50 border-sky-200 text-sky-800',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  danger: 'bg-rose-50 border-rose-200 text-rose-800',
}

interface AlertProps {
  tone?: AlertTone
  title?: string
  children?: ReactNode
  className?: string
}

export function Alert({ tone = 'info', title, children, className }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-lg border px-4 py-3 text-sm',
        toneClasses[tone],
        className
      )}
    >
      {title && <p className="font-semibold mb-0.5">{title}</p>}
      {children && <div className="text-current/90">{children}</div>}
    </div>
  )
}
