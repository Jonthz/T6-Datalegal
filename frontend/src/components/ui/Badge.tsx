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
  neutral: 'bg-slate-100 text-ink-100 border border-slate-200',
  brand: 'bg-brand-50 text-brand-700 border border-brand-200',
  success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
  danger: 'bg-rose-50 text-rose-700 border border-rose-200',
  info: 'bg-sky-50 text-sky-700 border border-sky-200',
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
