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

export function LoadingState({ label = 'Loading...', rows = 0, className }: LoadingStateProps) {
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
      <span className="inline-block h-4 w-4 rounded-full border-2 border-slate-300 border-t-brand-600 animate-spin" />
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
        <div className="h-12 w-12 rounded-md bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-700 mb-3">
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
        'flex flex-col items-center text-center py-10 px-6 rounded-glass border border-rose-200 bg-rose-50',
        className
      )}
    >
      <div className="h-10 w-10 rounded-md bg-white border border-rose-100 text-rose-700 flex items-center justify-center mb-3">
        <span aria-hidden>!</span>
      </div>
      <h3 className="text-base font-semibold text-rose-900">{title}</h3>
      <p className="text-sm text-rose-700 mt-1 max-w-md">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ForbiddenState({
  title = 'Access restricted',
  description = 'Your current role does not have permission to view this workspace area.',
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center text-center py-10 px-6 rounded-glass border border-amber-200 bg-amber-50',
        className
      )}
    >
      <div className="h-10 w-10 rounded-md bg-white border border-amber-100 text-amber-700 flex items-center justify-center mb-3">
        <span aria-hidden>!</span>
      </div>
      <h3 className="text-base font-semibold text-amber-900">{title}</h3>
      <p className="text-sm text-amber-800 mt-1 max-w-md">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
