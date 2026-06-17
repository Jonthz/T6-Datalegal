import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { GlassCard } from './GlassCard'
import { Skeleton } from './states'

type Trend = 'up' | 'down' | 'flat' | null

interface KPICardProps {
  label: string
  value: ReactNode
  hint?: ReactNode
  trend?: Trend
  trendLabel?: string
  loading?: boolean
  icon?: ReactNode
  className?: string
}

const trendStyles: Record<Exclude<Trend, null>, string> = {
  up: 'text-emerald-300',
  down: 'text-rose-300',
  flat: 'text-ink-300',
}

const trendIcon: Record<Exclude<Trend, null>, string> = {
  up: '▲',
  down: '▼',
  flat: '·',
}

export function KPICard({
  label,
  value,
  hint,
  trend,
  trendLabel,
  loading = false,
  icon,
  className,
}: KPICardProps) {
  return (
    <GlassCard className={cn('relative overflow-hidden', className)} hoverable>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 min-w-0">
          <p className="text-xs uppercase tracking-wide text-ink-300 font-medium">{label}</p>
          {loading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <p className="text-3xl font-semibold text-ink-50 truncate">{value}</p>
          )}
          {loading ? (
            <Skeleton className="h-3 w-16" />
          ) : (
            <div className="flex items-center gap-2 text-xs">
              {trend && (
                <span className={cn('font-medium', trendStyles[trend])}>
                  <span aria-hidden className="mr-1">
                    {trendIcon[trend]}
                  </span>
                  {trendLabel}
                </span>
              )}
              {hint && <span className="text-ink-400">{hint}</span>}
            </div>
          )}
        </div>
        {icon && (
          <div className="h-10 w-10 rounded-lg bg-brand-500/15 border border-brand-400/30 flex items-center justify-center text-brand-200">
            {icon}
          </div>
        )}
      </div>
    </GlassCard>
  )
}
