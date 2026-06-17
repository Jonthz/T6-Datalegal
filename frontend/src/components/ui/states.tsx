import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden />
}

interface LoadingStateProps {
  label?: string
  className?: string
  /** Number of skeleton rows when rendered inside a list */
  rows?: number
}

export function LoadingState({ label = 'Loading…', rows = 0, className }: LoadingStateProps) {
  if (rows > 0) {
    return (
      <div className={cn('space-y-2', className)} role="status" aria-live="polite" aria-label={label}>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex items-center gap-3 text-ink-300 text-sm py-8', className)}
    >
      <span className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
      <span>{label}</span>
    </div>
  )
}

interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-10 px-6',
        className
      )}
    >
      {icon && (
        <div className="h-12 w-12 rounded-full glass-surface-light flex items-center justify-center text-ink-200 mb-3">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-ink-50">{title}</h3>
      {description && (
        <p className="text-sm text-ink-300 mt-1 max-w-md">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

interface ErrorStateProps {
  title?: string
  description?: string
  action?: ReactNode
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'We could not complete that request. Please retry in a moment.',
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center text-center py-10 px-6 rounded-glass border border-rose-400/20 bg-rose-500/5',
        className
      )}
    >
      <div className="h-10 w-10 rounded-full bg-rose-500/20 text-rose-200 flex items-center justify-center mb-3">
        <span aria-hidden>!</span>
      </div>
      <h3 className="text-base font-semibold text-rose-100">{title}</h3>
      <p className="text-sm text-rose-200/80 mt-1 max-w-md">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
