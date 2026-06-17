import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getNavLabelKey } from '../../routes/navigation'

export function Breadcrumbs() {
  const { t } = useTranslation()
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)

  if (segments.length === 0) return null

  const crumbs = segments.map((seg, idx) => {
    const to = '/' + segments.slice(0, idx + 1).join('/')
    const labelKey = getNavLabelKey(to)
    const label = labelKey ? t(labelKey) : seg.replace(/-/g, ' ')
    return { to, label, isLast: idx === segments.length - 1 }
  })

  return (
    <nav aria-label={t('nav.breadcrumbs')} className="text-xs text-ink-300">
      <ol className="flex items-center gap-1.5 flex-wrap">
        <li>
          <Link to="/dashboard" className="hover:text-white">
            {t('nav.dashboard')}
          </Link>
        </li>
        {crumbs[0]?.to !== '/dashboard' &&
          crumbs.map((crumb) => (
            <li key={crumb.to} className="flex items-center gap-1.5">
              <span aria-hidden className="text-ink-500">
                /
              </span>
              {crumb.isLast ? (
                <span className="text-ink-100 capitalize">{crumb.label}</span>
              ) : (
                <Link to={crumb.to} className="hover:text-white capitalize">
                  {crumb.label}
                </Link>
              )}
            </li>
          ))}
      </ol>
    </nav>
  )
}
