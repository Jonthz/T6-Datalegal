import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react'
import {
  AlertTriangle,
  Archive,
  Bell,
  BookOpen,
  Building2,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Database,
  FileBarChart2,
  FileCheck2,
  FileClock,
  FileText,
  GraduationCap,
  HardDrive,
  Home,
  Import,
  ChevronsLeft,
  ChevronsRight,
  KeyRound,
  Layers,
  ListChecks,
  Network,
  ScrollText,
  ServerCog,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Siren,
  Users,
} from 'lucide-react'
import { NAV_GROUPS } from '../../routes/navigation'
import {
  getStoredAccountScope,
  getStoredRole,
  hasPlatformPermissions,
  hasRole,
} from '../../routes/permissions'
import { cn } from '../../lib/cn'
import { BrandMark } from '../ui/BrandMark'
import { DataLegalWordmark } from '../ui/DataLegalWordmark'
import { ChevronIcon, SidebarGroupIcon } from '../ui/Icons'

const STORAGE_KEY = 'datalegal.sidebar.openGroups'
const COLLAPSED_STORAGE_KEY = 'datalegal.sidebar.collapsed'

const NAV_ITEM_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  platform: Building2,
  dashboard: Home,
  alerts: Bell,
  reports: FileBarChart2,
  'company-profile': Building2,
  users: Users,
  departments: Network,
  catalogs: BookOpen,
  sectors: Layers,
  tenants: KeyRound,
  'data-inventory': Database,
  'treatment-activities': ClipboardList,
  'information-assets': HardDrive,
  retention: Archive,
  'import-export': Import,
  'risk-assessments': ShieldQuestion,
  dpias: ShieldCheck,
  arco: FileClock,
  portability: FileText,
  incidents: Siren,
  consents: ClipboardCheck,
  'legal-documents': ScrollText,
  ropa: FileCheck2,
  'action-plans': ListChecks,
  'audit-plans': ClipboardCheck,
  remediations: AlertTriangle,
  'audit-log': Clock,
  training: GraduationCap,
  backups: ServerCog,
  settings: Settings,
}

interface SidebarProps {
  open: boolean
  onClose: () => void
  unreadAlerts?: number
}

export function Sidebar({ open, onClose, unreadAlerts = 0 }: SidebarProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const role = getStoredRole()
  const accountScope = getStoredAccountScope()

  const groups = useMemo(
    () =>
      NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (item.hidden) return false
          const itemScopes = item.accountScopes ?? ['TENANT']
          return (
            itemScopes.includes(accountScope) &&
            hasRole(item.roles, role) &&
            hasPlatformPermissions(item.platformPermissions)
          )
        }),
      })).filter((group) => group.items.length > 0),
    [accountScope, role]
  )
  const activeGroupId = useMemo(
    () => groups.find((group) => group.items.some((item) => item.path === location.pathname))?.id,
    [groups, location.pathname]
  )
  const defaultOpenGroups = useMemo(() => {
    const defaults = new Set<string>()
    if (groups.some((group) => group.id === 'overview')) defaults.add('overview')
    if (activeGroupId) defaults.add(activeGroupId)
    return defaults
  }, [activeGroupId, groups])
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as string[]
        return new Set(parsed)
      }
    } catch {
      // Ignore malformed persisted UI state.
    }
    return defaultOpenGroups
  })
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    if (!activeGroupId) return
    setOpenGroups((current) => {
      if (current.has(activeGroupId)) return current
      return new Set([...current, activeGroupId])
    })
  }, [activeGroupId])

  useEffect(() => {
    const visibleIds = new Set(groups.map((group) => group.id))
    setOpenGroups((current) => {
      const next = new Set([...current].filter((id) => visibleIds.has(id)))
      if (next.size === current.size && [...next].every((id) => current.has(id))) {
        return current
      }
      return next
    })
  }, [defaultOpenGroups, groups])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...openGroups]))
  }, [openGroups])

  useEffect(() => {
    window.localStorage.setItem(COLLAPSED_STORAGE_KEY, String(collapsed))
  }, [collapsed])

  function toggleGroup(groupId: string) {
    setOpenGroups((current) => {
      const next = new Set(current)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  return (
    <>
      <button
        type="button"
        aria-hidden={!open}
        tabIndex={-1}
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-30 bg-slate-900/20 backdrop-blur-sm transition-opacity lg:hidden',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      />
      <aside
        aria-label={t('nav.sidebar')}
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-40 w-72 shrink-0 transform transition-all duration-200',
          'bg-white border-r border-slate-200 lg:translate-x-0 flex flex-col shadow-sm',
          collapsed && 'lg:w-16',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div
          className={cn(
            'px-5 py-4 flex items-center gap-3 border-b border-slate-200 bg-slate-50/70',
            collapsed && 'lg:justify-center lg:px-2'
          )}
        >
          <BrandMark size={collapsed ? 'sm' : 'md'} />
          <div className={cn('min-w-0', collapsed && 'lg:hidden')}>
            <DataLegalWordmark />
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto scrollbar-thin py-3">
          <div className={cn('hidden', collapsed && 'lg:block')}>
            {groups.map((group, index) => (
              <div key={group.id} className={cn('px-2', index > 0 && 'mt-2 border-t border-slate-100 pt-2')}>
                <ul className="space-y-1">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <CollapsedSidebarLink
                        to={item.path}
                        label={t(item.labelKey)}
                        onClick={onClose}
                        icon={NAV_ITEM_ICONS[item.id] ?? FileText}
                        badge={
                          item.id === 'alerts' && unreadAlerts > 0 ? unreadAlerts : undefined
                        }
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className={cn(collapsed && 'lg:hidden')}>
            {groups.map((group) => {
            const isOpen = openGroups.has(group.id)
            const contentId = `sidebar-group-${group.id}`
            return (
              <div key={group.id} className="px-3 mb-2">
                <button
                  type="button"
                  className="w-full px-3 py-2 flex items-center justify-between gap-2 text-left text-[13px] uppercase tracking-wide text-ink-400 font-bold rounded-md hover:bg-slate-50 hover:text-ink-200"
                  aria-expanded={isOpen}
                  aria-controls={contentId}
                  onClick={() => toggleGroup(group.id)}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-100 text-ink-300">
                      <SidebarGroupIcon groupId={group.id} className="h-3.5 w-3.5" />
                    </span>
                    <span className="truncate">{t(group.labelKey)}</span>
                  </span>
                  <ChevronIcon
                    aria-hidden
                    className={cn(
                      'h-3.5 w-3.5 shrink-0 transition-transform text-ink-500',
                      isOpen ? 'rotate-90' : 'rotate-0'
                    )}
                  />
                </button>
                {isOpen && (
                  <ul id={contentId} className="mt-0.5 space-y-0.5">
                    {group.items.map((item) => (
                      <li key={item.id}>
                        <SidebarLink
                          to={item.path}
                          label={t(item.labelKey)}
                          onClick={onClose}
                          icon={NAV_ITEM_ICONS[item.id] ?? FileText}
                          badge={
                            item.id === 'alerts' && unreadAlerts > 0 ? unreadAlerts : undefined
                          }
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
            })}
          </div>
        </nav>
        <div
          className={cn(
            'px-4 py-3 border-t border-slate-200 text-xs text-ink-400',
            collapsed && 'lg:px-2'
          )}
        >
          <button
            type="button"
            className={cn(
              'hidden lg:flex h-9 w-full items-center rounded-md border border-slate-200 text-ink-200 transition-colors hover:bg-slate-50 hover:text-ink-50',
              collapsed ? 'justify-center px-0' : 'justify-between px-3'
            )}
            aria-label={collapsed ? t('common.expand', 'Expand sidebar') : t('common.collapse', 'Collapse sidebar')}
            title={collapsed ? t('common.expand', 'Expand sidebar') : t('common.collapse', 'Collapse sidebar')}
            onClick={() => setCollapsed((value) => !value)}
          >
            {!collapsed && <span className="text-[13px] font-medium">{t('app.environment')}</span>}
            {collapsed ? (
              <ChevronsRight aria-hidden className="h-4 w-4" />
            ) : (
              <ChevronsLeft aria-hidden className="h-4 w-4" />
            )}
          </button>
          <p className={cn('lg:hidden', collapsed && 'lg:hidden')}>{t('app.environment')}</p>
        </div>
      </aside>
    </>
  )
}

interface SidebarLinkProps {
  to: string
  label: string
  onClick: () => void
  icon: ComponentType<{ className?: string }>
  badge?: ReactNode
}

function SidebarLink({ to, label, onClick, icon: Icon, badge }: SidebarLinkProps) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center justify-between px-3 h-9 rounded-md text-sm transition-colors',
          isActive
            ? 'bg-brand-50 text-brand-800 border border-brand-100'
            : 'text-ink-200 hover:text-ink-50 hover:bg-slate-50 border border-transparent'
        )
      }
    >
      <span className="flex min-w-0 items-center gap-2">
        <Icon aria-hidden className="h-4 w-4 shrink-0 opacity-75" />
        <span className="truncate">{label}</span>
      </span>
      {badge !== undefined && badge !== 0 && (
        <span className="ml-2 inline-flex items-center justify-center text-[13px] font-semibold min-w-[1.25rem] h-5 px-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
          {badge}
        </span>
      )}
    </NavLink>
  )
}

function CollapsedSidebarLink({ to, label, onClick, icon: Icon, badge }: SidebarLinkProps) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={({ isActive }) =>
        cn(
          'relative flex h-10 w-12 items-center justify-center rounded-md border text-sm transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-brand-100 focus:ring-offset-1',
          isActive
            ? 'border-brand-100 bg-brand-50 text-brand-800'
            : 'border-transparent text-ink-200 hover:bg-slate-50 hover:text-ink-50'
        )
      }
    >
      <Icon aria-hidden className="h-4.5 w-4.5" />
      {badge !== undefined && badge !== 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-white bg-rose-600 px-1 text-[11px] font-bold leading-none text-white">
          {badge}
        </span>
      )}
    </NavLink>
  )
}
