import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type AlertTone = 'info' | 'success' | 'warning' | 'danger'

const toneClasses: Record<AlertTone, string> = {
  info: 'bg-sky-500/10 border-sky-400/30 text-sky-100',
  success: 'bg-emerald-500/10 border-emerald-400/30 text-emerald-100',
  warning: 'bg-amber-500/10 border-amber-400/30 text-amber-100',
  danger: 'bg-rose-500/10 border-rose-400/30 text-rose-100',
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
