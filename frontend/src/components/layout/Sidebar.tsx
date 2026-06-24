import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { NAV_GROUPS } from '../../routes/navigation'
import { getStoredRole, hasRole } from '../../routes/permissions'
import { cn } from '../../lib/cn'
import { BrandMark } from '../ui/BrandMark'
import { ChevronIcon, SidebarGroupIcon } from '../ui/Icons'

const STORAGE_KEY = 'datalegal.sidebar.openGroups'

interface SidebarProps {
  open: boolean
  onClose: () => void
  unreadAlerts?: number
}

export function Sidebar({ open, onClose, unreadAlerts = 0 }: SidebarProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const role = getStoredRole()

  const groups = useMemo(
    () =>
      NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) => !item.hidden && hasRole(item.roles, role)),
      })).filter((group) => group.items.length > 0),
    [role]
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
          'fixed lg:static inset-y-0 left-0 z-40 w-72 shrink-0 transform transition-transform duration-200',
          'bg-white border-r border-slate-200 lg:translate-x-0 flex flex-col shadow-glass',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="px-5 py-5 flex items-center gap-3 border-b border-slate-200 bg-slate-50/70">
          <BrandMark />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-50 leading-tight">
              {t('app.title')}
            </p>
            <p className="text-xs text-ink-400 leading-tight">{t('app.subtitle')}</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto scrollbar-thin py-3">
          {groups.map((group) => {
            const isOpen = openGroups.has(group.id)
            const contentId = `sidebar-group-${group.id}`
            return (
              <div key={group.id} className="px-3 mb-2">
                <button
                  type="button"
                  className="w-full px-3 py-2 flex items-center justify-between gap-2 text-left text-[10px] uppercase tracking-wider text-ink-400 font-bold rounded-md hover:bg-slate-50 hover:text-ink-200"
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
        </nav>
        <div className="px-4 py-3 border-t border-slate-200 text-xs text-ink-400">
          <p>{t('app.environment')}</p>
        </div>
      </aside>
    </>
  )
}

interface SidebarLinkProps {
  to: string
  label: string
  onClick: () => void
  badge?: ReactNode
}

function SidebarLink({ to, label, onClick, badge }: SidebarLinkProps) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center justify-between px-3 h-9 rounded-md text-sm transition-colors',
          isActive
            ? 'bg-brand-50 text-brand-800 border border-brand-200 shadow-ring'
            : 'text-ink-200 hover:text-ink-50 hover:bg-slate-50 border border-transparent'
        )
      }
    >
      <span className="flex min-w-0 items-center gap-2">
        <span
          aria-hidden
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-40"
        />
        <span className="truncate">{label}</span>
      </span>
      {badge !== undefined && badge !== 0 && (
        <span className="ml-2 inline-flex items-center justify-center text-[10px] font-semibold min-w-[1.25rem] h-5 px-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
          {badge}
        </span>
      )}
    </NavLink>
  )
}
