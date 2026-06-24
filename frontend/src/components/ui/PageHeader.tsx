import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { ModuleIcon } from './Icons'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  meta?: ReactNode
  icon?: ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, meta, icon, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-4 md:flex-row md:items-end md:justify-between', className)}>
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-brand-100 bg-brand-50 text-brand-700">
          {icon ?? <ModuleIcon className="h-5 w-5" />}
        </div>
        <div className="space-y-1 min-w-0">
          <h1 className="text-3xl font-semibold text-ink-50 tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-ink-300 max-w-2xl">{description}</p>
          )}
          {meta && <div className="pt-1">{meta}</div>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </header>
  )
}
