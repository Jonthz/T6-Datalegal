import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert as AlertBox,
  Badge,
  Button,
  GlassCard,
  LoadingState,
  PageHeader,
} from '../components/ui'
import { listSectors, setCompanySector } from '../api/sectors'
import { getCompanyProfile } from '../api/companyProfile'
import type { SectorSuggestions, Tenant } from '../types'
import { extractErrorMessage } from '../lib/errors'
import { getStoredRole } from '../routes/permissions'

export default function SectorsPage() {
  const { t } = useTranslation()
  const [sectors, setSectors] = useState<SectorSuggestions[]>([])
  const [profile, setProfile] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busyCode, setBusyCode] = useState<string | null>(null)

  const role = getStoredRole()
  const canUpdate = role === 'SUPER_ADMIN' || role === 'DPO' || role === 'ADMIN'

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [sectorList, tenant] = await Promise.all([
        listSectors(),
        getCompanyProfile().catch(() => null),
      ])
      setSectors(sectorList)
      setProfile(tenant)
    } catch (err) {
      setError(extractErrorMessage(err, t('sectors.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  async function handleUse(code: string) {
    setBusyCode(code)
    setError('')
    setSuccess('')
    try {
      await setCompanySector(code)
      setSuccess(t('sectors.useSectorSuccess'))
      await load()
    } catch (err) {
      setError(extractErrorMessage(err, t('common.error')))
    } finally {
      setBusyCode(null)
    }
  }

  const current = profile?.sector ?? null

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('sectors.title')}
        description={t('sectors.description')}
        meta={
          <p className="text-xs text-ink-300">
            {t('sectors.currentSector')}:{' '}
            {current ? (
              <Badge tone="brand">{current}</Badge>
            ) : (
              <span className="text-amber-300">{t('sectors.noSectorYet')}</span>
            )}
          </p>
        }
      />

      {error && <AlertBox tone="danger">{error}</AlertBox>}
      {success && <AlertBox tone="success">{success}</AlertBox>}

      {loading ? (
        <LoadingState rows={3} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sectors.map((sector) => {
            const isActive = current === sector.sector_code
            return (
              <GlassCard
                key={sector.sector_code}
                className={
                  isActive ? 'border-brand-400/40 bg-brand-500/[0.05]' : undefined
                }
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-ink-50">{sector.label}</h3>
                    <p className="text-xs text-ink-400 mt-0.5">{sector.sector_code}</p>
                  </div>
                  {isActive ? (
                    <Badge tone="success">{t('common.active')}</Badge>
                  ) : canUpdate ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={busyCode === sector.sector_code}
                      onClick={() => handleUse(sector.sector_code)}
                    >
                      {t('sectors.useSector')}
                    </Button>
                  ) : null}
                </div>

                <SuggestionBlock
                  title={t('sectors.suggested.dataTypes')}
                  items={sector.suggested_data_types}
                  tone="info"
                />
                <SuggestionBlock
                  title={t('sectors.suggested.activities')}
                  items={sector.suggested_activities}
                  tone="brand"
                />
                <SuggestionBlock
                  title={t('sectors.suggested.templates')}
                  items={sector.suggested_templates}
                  tone="neutral"
                />
              </GlassCard>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SuggestionBlock({
  title,
  items,
  tone,
}: {
  title: string
  items: string[]
  tone: 'info' | 'brand' | 'neutral'
}) {
  if (!items || items.length === 0) return null
  return (
    <div className="mt-3">
      <p className="text-[13px] uppercase tracking-wide text-ink-400 mb-1.5">{title}</p>
      <ul className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li key={item}>
            <Badge tone={tone}>{item}</Badge>
          </li>
        ))}
      </ul>
    </div>
  )
}
