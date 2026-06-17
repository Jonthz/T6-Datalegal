import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMemo, type ReactNode } from 'react'
import { NAV_GROUPS } from '../../routes/navigation'
import { getStoredRole, hasRole } from '../../routes/permissions'
import { cn } from '../../lib/cn'

interface SidebarProps {
  open: boolean
  onClose: () => void
  unreadAlerts?: number
}

export function Sidebar({ open, onClose, unreadAlerts = 0 }: SidebarProps) {
  const { t } = useTranslation()
  const role = getStoredRole()

  const groups = useMemo(
    () =>
      NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) => !item.hidden && hasRole(item.roles, role)),
      })).filter((group) => group.items.length > 0),
    [role]
  )

  return (
    <>
      <button
        type="button"
        aria-hidden={!open}
        tabIndex={-1}
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-30 bg-ink-950/60 backdrop-blur-sm transition-opacity lg:hidden',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      />
      <aside
        aria-label={t('nav.sidebar')}
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-40 w-72 shrink-0 transform transition-transform duration-200',
          'glass-surface border-r border-white/10 lg:translate-x-0 flex flex-col',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="px-5 py-5 flex items-center gap-3 border-b border-white/10">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-brand-400 to-sky-400 flex items-center justify-center font-bold text-ink-950">
            DL
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-50 leading-tight">
              {t('app.title')}
            </p>
            <p className="text-xs text-ink-400 leading-tight">{t('app.subtitle')}</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto scrollbar-thin py-3">
          {groups.map((group) => (
            <div key={group.id} className="px-3 mb-4">
              <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-ink-400 font-semibold">
                {t(group.labelKey)}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <SidebarLink
                      to={item.path}
                      label={t(item.labelKey)}
                      onClick={onClose}
                      badge={item.id === 'alerts' && unreadAlerts > 0 ? unreadAlerts : undefined}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-white/10 text-xs text-ink-400">
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
            ? 'bg-brand-500/15 text-white border border-brand-400/30'
            : 'text-ink-200 hover:text-white hover:bg-white/[0.05] border border-transparent'
        )
      }
    >
      <span className="truncate">{label}</span>
      {badge !== undefined && badge !== 0 && (
        <span className="ml-2 inline-flex items-center justify-center text-[10px] font-semibold min-w-[1.25rem] h-5 px-1.5 rounded-full bg-rose-500/20 text-rose-200 border border-rose-400/30">
          {badge}
        </span>
      )}
    </NavLink>
  )
}
