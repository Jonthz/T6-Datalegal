import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert as AlertBox,
  Badge,
  Button,
  GlassCard,
  GlassPanel,
  Input,
  LoadingState,
  PageHeader,
  Select,
} from '../components/ui'
import { getCompanyProfile, updateCompanyProfile } from '../api/companyProfile'
import { listSectors } from '../api/sectors'
import type { SectorSuggestions, Tenant } from '../types'
import { getStoredRole } from '../routes/permissions'
import { extractErrorMessage } from '../lib/errors'

interface FormState {
  name: string
  country: string
  sector: string
  address: string
  website: string
  dpo_name: string
  dpo_email: string
  dpo_phone: string
}

const EMPTY: FormState = {
  name: '',
  country: '',
  sector: '',
  address: '',
  website: '',
  dpo_name: '',
  dpo_email: '',
  dpo_phone: '',
}

export default function CompanyProfilePage() {
  const { t } = useTranslation()
  const [profile, setProfile] = useState<Tenant | null>(null)
  const [sectors, setSectors] = useState<SectorSuggestions[]>([])
  const [form, setForm] = useState<FormState>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const role = getStoredRole()
  const canEdit = role === 'SUPER_ADMIN' || role === 'DPO'

  const load = useCallback(async () => {
    setLoading(true)
    setPageError('')
    try {
      const [tenant, sectorList] = await Promise.all([
        getCompanyProfile(),
        listSectors().catch(() => [] as SectorSuggestions[]),
      ])
      setProfile(tenant)
      setSectors(sectorList)
      setForm({
        name: tenant.name ?? '',
        country: tenant.country ?? '',
        sector: tenant.sector ?? '',
        address: tenant.address ?? '',
        website: tenant.website ?? '',
        dpo_name: tenant.dpo_name ?? '',
        dpo_email: tenant.dpo_email ?? '',
        dpo_phone: tenant.dpo_phone ?? '',
      })
    } catch (err) {
      setPageError(extractErrorMessage(err, t('companyProfile.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canEdit) return
    setSuccess('')
    setPageError('')
    setSubmitting(true)
    try {
      const updated = await updateCompanyProfile({
        name: form.name,
        country: form.country,
        sector: form.sector || null,
        address: form.address || null,
        website: form.website || null,
        dpo_name: form.dpo_name || null,
        dpo_email: form.dpo_email || null,
        dpo_phone: form.dpo_phone || null,
      })
      setProfile(updated)
      setSuccess(t('companyProfile.updateSuccess'))
    } catch (err) {
      setPageError(extractErrorMessage(err, t('common.error')))
    } finally {
      setSubmitting(false)
    }
  }

  const sectorOptions = useMemo(
    () => [
      { value: '', label: '—' },
      ...sectors.map((s) => ({ value: s.sector_code, label: s.label })),
    ],
    [sectors]
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('companyProfile.title')}
        description={t('companyProfile.description')}
        meta={
          profile && (
            <div className="flex items-center gap-2 text-xs text-ink-300">
              <Badge tone="brand">RUC {profile.ruc || '—'}</Badge>
              <Badge tone={profile.is_active ? 'success' : 'neutral'}>
                {profile.is_active ? t('common.active') : t('common.inactive')}
              </Badge>
            </div>
          )
        }
      />

      {pageError && <AlertBox tone="danger">{pageError}</AlertBox>}
      {success && <AlertBox tone="success">{success}</AlertBox>}
      {!canEdit && !loading && (
        <AlertBox tone="info">{t('companyProfile.permissionRequired')}</AlertBox>
      )}

      {loading ? (
        <GlassPanel>
          <div className="p-6">
            <LoadingState rows={6} />
          </div>
        </GlassPanel>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <GlassCard>
            <h2 className="text-base font-semibold text-ink-50 mb-4">
              {t('companyProfile.sections.company')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t('companyProfile.fields.name')}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                disabled={!canEdit}
                required
              />
              <Input
                label={t('companyProfile.fields.ruc')}
                value={profile?.ruc ?? ''}
                disabled
                hint={t('companyProfile.rucReadonly')}
              />
              <Input
                label={t('companyProfile.fields.country')}
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                disabled={!canEdit}
              />
              <Select
                label={t('companyProfile.fields.sector')}
                value={form.sector}
                onChange={(e) => setForm({ ...form, sector: e.target.value })}
                options={sectorOptions}
                disabled={!canEdit}
              />
              <Input
                label={t('companyProfile.fields.address')}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                disabled={!canEdit}
                className="sm:col-span-2"
              />
              <Input
                label={t('companyProfile.fields.website')}
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                disabled={!canEdit}
                placeholder="https://example.com"
                className="sm:col-span-2"
              />
            </div>
          </GlassCard>

          <GlassCard>
            <h2 className="text-base font-semibold text-ink-50 mb-4">
              {t('companyProfile.sections.dpo')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t('companyProfile.fields.dpoName')}
                value={form.dpo_name}
                onChange={(e) => setForm({ ...form, dpo_name: e.target.value })}
                disabled={!canEdit}
              />
              <Input
                label={t('companyProfile.fields.dpoEmail')}
                type="email"
                value={form.dpo_email}
                onChange={(e) => setForm({ ...form, dpo_email: e.target.value })}
                disabled={!canEdit}
              />
              <Input
                label={t('companyProfile.fields.dpoPhone')}
                value={form.dpo_phone}
                onChange={(e) => setForm({ ...form, dpo_phone: e.target.value })}
                disabled={!canEdit}
              />
            </div>
          </GlassCard>

          {canEdit && (
            <div className="flex justify-end">
              <Button type="submit" loading={submitting}>
                {t('common.saveChanges')}
              </Button>
            </div>
          )}
        </form>
      )}
    </div>
  )
}
