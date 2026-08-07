import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import type { ButtonVariant } from './Button'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  icon: ReactNode
  variant?: Extract<ButtonVariant, 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle'>
  size?: 'sm' | 'md'
  loading?: boolean
}

const variantClasses: Record<NonNullable<IconButtonProps['variant']>, string> = {
  primary:
    'bg-brand-700 text-white border border-brand-700 hover:bg-brand-800 active:bg-brand-900 disabled:opacity-50',
  secondary:
    'bg-white text-ink-50 border border-slate-300 hover:bg-slate-50 active:bg-slate-100 shadow-sm disabled:opacity-50',
  ghost:
    'bg-white text-ink-100 border border-slate-200 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50',
  danger:
    'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-600 hover:text-white hover:border-rose-600 active:bg-rose-700 active:text-white active:border-rose-700 disabled:opacity-50',
  subtle:
    'bg-slate-50 text-ink-100 border border-slate-200 hover:bg-slate-100 active:bg-slate-200 disabled:opacity-50',
}

const sizeClasses: Record<NonNullable<IconButtonProps['size']>, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
}

export function IconButton({
  label,
  icon,
  variant = 'ghost',
  size = 'sm',
  loading = false,
  disabled,
  className,
  type,
  ...rest
}: IconButtonProps) {
  return (
    <span className="relative inline-flex group">
      <button
        {...rest}
        type={type ?? 'button'}
        disabled={disabled || loading}
        aria-label={label}
        title={label}
        aria-busy={loading || undefined}
        className={cn(
          'inline-flex items-center justify-center rounded-md transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-brand-100 focus:ring-offset-1 disabled:cursor-not-allowed',
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
      >
        {loading ? (
          <span className="inline-block h-4 w-4 rounded-full border-2 border-current/30 border-t-current animate-spin" />
        ) : (
          icon
        )}
      </button>
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute right-0 top-full z-30 mt-1 whitespace-nowrap rounded-md',
          'bg-ink-50 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-glass-lg',
          'transition-opacity group-hover:opacity-100 group-focus-within:opacity-100'
        )}
      >
        {label}
      </span>
    </span>
  )
}
