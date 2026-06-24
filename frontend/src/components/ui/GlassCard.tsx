import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean
  hoverable?: boolean
  children: ReactNode
}

export function GlassCard({
  padded = true,
  hoverable = false,
  className,
  children,
  ...rest
}: GlassCardProps) {
  return (
    <div
      {...rest}
      className={cn(
        'glass-surface rounded-glass',
        padded && 'p-6',
        hoverable && 'transition hover:border-brand-200 hover:shadow-glass-lg',
        className
      )}
    >
      {children}
    </div>
  )
}

export function GlassPanel({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      {...rest}
      className={cn('glass-surface rounded-glass overflow-hidden', className)}
    >
      {children}
    </section>
  )
}
