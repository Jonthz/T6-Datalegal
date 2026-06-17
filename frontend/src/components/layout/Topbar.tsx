import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { cn } from '../../lib/cn'
import { getStoredRole, getStoredTenantId } from '../../routes/permissions'

interface TopbarProps {
  onMenuClick: () => void
  unreadAlerts: number
}

export function Topbar({ onMenuClick, unreadAlerts }: TopbarProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const role = getStoredRole()
  const tenantId = getStoredTenantId()

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('role')
    localStorage.removeItem('tenant_id')
    navigate('/login')
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-20 flex items-center gap-3 px-4 lg:px-6 h-16',
        'glass-surface border-b border-white/10'
      )}
    >
      <button
        type="button"
        onClick={onMenuClick}
        className="lg:hidden h-9 w-9 rounded-md glass-surface-light flex items-center justify-center text-ink-100"
        aria-label={t('nav.openSidebar')}
      >
        <span aria-hidden>☰</span>
      </button>

      <div className="hidden md:flex flex-1 max-w-md">
        <label className="relative w-full">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-sm" aria-hidden>
            ⌕
          </span>
          <input
            type="search"
            placeholder={t('common.searchPlaceholder')}
            aria-label={t('common.search')}
            className="w-full h-9 pl-9 pr-3 text-sm rounded-md bg-white/[0.04] border border-white/10 text-ink-50 placeholder:text-ink-400 focus:bg-white/[0.06] focus:border-brand-400/60"
          />
        </label>
      </div>

      <div className="flex-1 md:hidden" />

      <Link
        to="/alerts"
        aria-label={t('nav.alerts')}
        className="relative h-9 w-9 rounded-md glass-surface-light flex items-center justify-center text-ink-100 hover:text-white"
      >
        <span aria-hidden>🔔</span>
        {unreadAlerts > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[1rem] h-4 px-1 text-[10px] font-semibold rounded-full bg-rose-500 text-white">
            {unreadAlerts > 99 ? '99+' : unreadAlerts}
          </span>
        )}
      </Link>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 h-9 pl-1.5 pr-3 rounded-full glass-surface-light text-sm text-ink-100"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <span className="h-6 w-6 rounded-full bg-gradient-to-br from-brand-400 to-sky-400 flex items-center justify-center text-[11px] font-bold text-ink-950">
            {role?.charAt(0) ?? '·'}
          </span>
          <span className="hidden sm:inline">{role ?? '—'}</span>
        </button>
        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 mt-2 w-60 glass-surface rounded-glass p-2 shadow-glass-lg"
          >
            <div className="px-3 py-2 border-b border-white/10 mb-2">
              <p className="text-xs text-ink-400">{t('topbar.signedInAs')}</p>
              <p className="text-sm text-ink-50 font-semibold">{role ?? '—'}</p>
              {tenantId != null && (
                <p className="text-xs text-ink-300 mt-1">
                  {t('topbar.tenantId')}: <Badge tone="brand">{tenantId}</Badge>
                </p>
              )}
            </div>
            <Link
              to="/settings"
              role="menuitem"
              className="block px-3 h-8 text-sm rounded-md text-ink-100 hover:bg-white/[0.06] flex items-center"
              onClick={() => setMenuOpen(false)}
            >
              {t('nav.settings')}
            </Link>
            <Link
              to="/mfa-setup"
              role="menuitem"
              className="block px-3 h-8 text-sm rounded-md text-ink-100 hover:bg-white/[0.06] flex items-center"
              onClick={() => setMenuOpen(false)}
            >
              {t('topbar.manageMfa')}
            </Link>
            <div className="my-1 border-t border-white/10" />
            <div className="px-1">
              <Button variant="ghost" fullWidth onClick={handleLogout}>
                {t('nav.logout')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
