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
    'bg-brand-500 text-white hover:bg-brand-400 active:bg-brand-600 shadow-glass disabled:bg-brand-500/40',
  secondary:
    'bg-slate-100 text-ink-50 border border-slate-300 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-50',
  ghost:
    'bg-white text-ink-100 border border-slate-200 hover:bg-slate-100 active:bg-slate-200 disabled:opacity-50',
  danger:
    'bg-rose-500 text-white hover:bg-rose-400 active:bg-rose-600 shadow-glass disabled:bg-rose-500/40',
  subtle:
    'bg-slate-50 text-ink-100 border border-slate-300 hover:bg-slate-100 active:bg-slate-200 disabled:opacity-50',
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
        'inline-flex items-center justify-center font-medium rounded-lg transition-colors',
        'disabled:cursor-not-allowed',
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
