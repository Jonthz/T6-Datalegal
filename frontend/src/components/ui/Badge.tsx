import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type BadgeTone =
  | 'neutral'
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  children: ReactNode
  icon?: ReactNode
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-white/[0.06] text-ink-100 border border-white/10',
  brand: 'bg-brand-500/15 text-brand-200 border border-brand-400/30',
  success: 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/30',
  warning: 'bg-amber-500/15 text-amber-200 border border-amber-400/30',
  danger: 'bg-rose-500/15 text-rose-200 border border-rose-400/30',
  info: 'bg-sky-500/15 text-sky-200 border border-sky-400/30',
}

export function Badge({ tone = 'neutral', icon, className, children, ...rest }: BadgeProps) {
  return (
    <span
      {...rest}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        toneClasses[tone],
        className
      )}
    >
      {icon}
      {children}
    </span>
  )
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

const riskTone: Record<RiskLevel, BadgeTone> = {
  LOW: 'success',
  MEDIUM: 'warning',
  HIGH: 'danger',
  CRITICAL: 'danger',
}

const riskLabel: Record<RiskLevel, string> = {
  LOW: 'Low risk',
  MEDIUM: 'Medium risk',
  HIGH: 'High risk',
  CRITICAL: 'Critical',
}

export function RiskBadge({ level }: { level: RiskLevel | string }) {
  const safeLevel = (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as RiskLevel[]).includes(
    level as RiskLevel
  )
    ? (level as RiskLevel)
    : 'LOW'
  return (
    <Badge
      tone={riskTone[safeLevel]}
      icon={<span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />}
    >
      {riskLabel[safeLevel]}
    </Badge>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const upper = status?.toUpperCase?.() ?? 'UNKNOWN'
  const tone: BadgeTone =
    upper === 'ACTIVE' || upper === 'RESOLVED' || upper === 'CLOSED' || upper === 'COMPLETED' || upper === 'SIGNED'
      ? 'success'
      : upper === 'PENDING' || upper === 'IN_PROGRESS' || upper === 'INVESTIGATING' || upper === 'DRAFT' || upper === 'OPEN'
        ? 'info'
        : upper === 'REVIEW' || upper === 'UNDER_REVIEW' || upper === 'VERIFYING'
          ? 'warning'
          : upper === 'REJECTED' || upper === 'FAILED' || upper === 'EXPIRED'
            ? 'danger'
            : 'neutral'
  return <Badge tone={tone}>{upper.replace(/_/g, ' ')}</Badge>
}
