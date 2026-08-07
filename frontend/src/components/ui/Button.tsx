import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  iconLeft?: ReactNode
  iconRight?: ReactNode
  fullWidth?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900 shadow-glass disabled:bg-brand-700/40',
  secondary:
    'bg-white text-ink-50 border border-slate-300 hover:bg-slate-50 active:bg-slate-100 shadow-sm disabled:opacity-50',
  ghost:
    'bg-white text-ink-100 border border-slate-200 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50',
  danger:
    'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-glass disabled:bg-rose-600/40',
  subtle:
    'bg-slate-50 text-ink-100 border border-slate-200 hover:bg-slate-100 active:bg-slate-200 disabled:opacity-50',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-base gap-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  iconLeft,
  iconRight,
  fullWidth,
  className,
  children,
  disabled,
  type,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type ?? 'button'}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-semibold rounded-md transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-brand-100 focus:ring-offset-1 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className
      )}
      aria-busy={loading || undefined}
    >
      {loading ? (
        <span className="inline-block h-4 w-4 rounded-full border-2 border-current/30 border-t-current animate-spin" />
      ) : (
        iconLeft
      )}
      <span>{children}</span>
      {!loading && iconRight}
    </button>
  )
}
