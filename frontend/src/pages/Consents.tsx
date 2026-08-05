import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { FilePlus2, RefreshCw, RotateCcw, ToggleLeft, ToggleRight } from 'lucide-react'
import {
  Alert as AlertBox,
  Badge,
  Button,
  DataTable,
  GlassCard,
  GlassPanel,
  IconButton,
  Input,
  KPICard,
  Modal,
  PageHeader,
  Select,
  Tabs,
  Textarea,
} from '../components/ui'
import type { DataTableColumn } from '../components/ui'
import {
  createConsentRecord,
  createCookieBanner,
  createCookieConsent,
  getConsentStats,
  listConsentRecords,
  listCookieBanners,
  revokeConsentRecord,
  revokeCookieConsent,
  updateCookieBanner,
} from '../api/consents'
import type {
  ConsentRecord,
  ConsentStats,
  CookieBanner,
  CookieConsent,
} from '../types'
import { extractErrorMessage } from '../lib/errors'
import { formatDate, formatDateTime, formatPercent } from '../lib/format'

const LEGAL_BASES = [
  'CONSENT',
  'CONTRACT',
  'LEGAL_OBLIGATION',
  'VITAL_INTEREST',
  'PUBLIC_INTEREST',
  'LEGITIMATE_INTEREST',
] as const

interface RecordForm {
  data_subject_token: string
  purpose: string
  legal_basis: string
  treatment_activity_id: string
  is_sensitive: boolean
}

const EMPTY_RECORD_FORM: RecordForm = {
  data_subject_token: '',
  purpose: '',
  legal_basis: 'CONSENT',
  treatment_activity_id: '',
  is_sensitive: false,
}

interface BannerForm {
  version: string
  content: string
  effective_date: string
}

const todayIso = () => new Date().toISOString().slice(0, 10)

const EMPTY_BANNER_FORM: BannerForm = {
  version: '',
  content: '',
  effective_date: todayIso(),
}

interface CookieForm {
  banner_id: string
  data_subject_token: string
}

const EMPTY_COOKIE_FORM: CookieForm = {
  banner_id: '',
  data_subject_token: '',
}

export default function ConsentsPage() {
  const { t } = useTranslation()

  const [stats, setStats] = useState<ConsentStats | null>(null)
  const [records, setRecords] = useState<ConsentRecord[]>([])
  const [banners, setBanners] = useState<CookieBanner[]>([])

  const [recordFilter, setRecordFilter] = useState<'all' | 'active' | 'revoked'>('all')
  const [recordsLoading, setRecordsLoading] = useState(true)
  const [bannersLoading, setBannersLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [createRecordOpen, setCreateRecordOpen] = useState(false)
  const [recordForm, setRecordForm] = useState<RecordForm>(EMPTY_RECORD_FORM)
  const [recordSubmitting, setRecordSubmitting] = useState(false)
  const [recordError, setRecordError] = useState('')

  const [revokingRecord, setRevokingRecord] = useState<ConsentRecord | null>(null)
  const [revokeReason, setRevokeReason] = useState('')
  const [revokeSubmitting, setRevokeSubmitting] = useState(false)
  const [revokeError, setRevokeError] = useState('')

  const [bannerOpen, setBannerOpen] = useState(false)
  const [bannerForm, setBannerForm] = useState<BannerForm>(EMPTY_BANNER_FORM)
  const [bannerSubmitting, setBannerSubmitting] = useState(false)
  const [bannerError, setBannerError] = useState('')

  const [bannerBusy, setBannerBusy] = useState<number | null>(null)

  const [cookieOpen, setCookieOpen] = useState(false)
  const [cookieForm, setCookieForm] = useState<CookieForm>(EMPTY_COOKIE_FORM)
  const [cookieSubmitting, setCookieSubmitting] = useState(false)
  const [cookieError, setCookieError] = useState('')
  const [lastCookieConsent, setLastCookieConsent] = useState<CookieConsent | null>(null)

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const data = await getConsentStats()
      setStats(data)
    } catch {
      // statistics are non-blocking
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const loadRecords = useCallback(async () => {
    setRecordsLoading(true)
    try {
      const params =
        recordFilter === 'all'
          ? { limit: 200 }
          : { is_revoked: recordFilter === 'revoked', limit: 200 }
      const data = await listConsentRecords(params)
      setRecords(data)
    } catch (err) {
      setError(extractErrorMessage(err, t('consents.loadFailed')))
    } finally {
      setRecordsLoading(false)
    }
  }, [recordFilter, t])

  const loadBanners = useCallback(async () => {
    setBannersLoading(true)
    try {
      const data = await listCookieBanners()
      setBanners(data)
    } catch (err) {
      setError(extractErrorMessage(err, t('consents.loadFailed')))
    } finally {
      setBannersLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadStats()
    loadBanners()
  }, [loadStats, loadBanners])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  function openCreateRecord() {
    setRecordForm(EMPTY_RECORD_FORM)
    setRecordError('')
    setCreateRecordOpen(true)
  }

  async function submitRecord(e: FormEvent) {
    e.preventDefault()
    setRecordError('')
    if (!recordForm.data_subject_token.trim() || !recordForm.purpose.trim()) {
      setRecordError(t('consents.records.validation'))
      return
    }
    setRecordSubmitting(true)
    try {
      const tid = recordForm.treatment_activity_id.trim()
      await createConsentRecord({
        data_subject_token: recordForm.data_subject_token.trim(),
        purpose: recordForm.purpose.trim(),
        legal_basis: recordForm.legal_basis,
        treatment_activity_id: tid ? Number(tid) : null,
        is_sensitive: recordForm.is_sensitive,
      })
      setSuccess(t('consents.records.createSuccess'))
      setCreateRecordOpen(false)
      await Promise.all([loadRecords(), loadStats()])
    } catch (err) {
      setRecordError(extractErrorMessage(err, t('common.error')))
    } finally {
      setRecordSubmitting(false)
    }
  }

  function openRevoke(record: ConsentRecord) {
    setRevokingRecord(record)
    setRevokeReason('')
    setRevokeError('')
  }

  async function submitRevoke() {
    if (!revokingRecord) return
    setRevokeError('')
    setRevokeSubmitting(true)
    try {
      await revokeConsentRecord(revokingRecord.id, {
        revocation_reason: revokeReason.trim() || undefined,
      })
      setSuccess(t('consents.records.revokeSuccess'))
      setRevokingRecord(null)
      await Promise.all([loadRecords(), loadStats()])
    } catch (err) {
      setRevokeError(extractErrorMessage(err, t('common.error')))
    } finally {
      setRevokeSubmitting(false)
    }
  }

  function openBannerCreate() {
    setBannerForm(EMPTY_BANNER_FORM)
    setBannerError('')
    setBannerOpen(true)
  }

  async function submitBanner(e: FormEvent) {
    e.preventDefault()
    setBannerError('')
    if (!bannerForm.version.trim() || !bannerForm.content.trim()) {
      setBannerError(t('consents.banners.validation'))
      return
    }
    setBannerSubmitting(true)
    try {
      const effective = bannerForm.effective_date
        ? new Date(bannerForm.effective_date).toISOString()
        : new Date().toISOString()
      await createCookieBanner({
        version: bannerForm.version.trim(),
        content: bannerForm.content.trim(),
        effective_date: effective,
      })
      setSuccess(t('consents.banners.createSuccess'))
      setBannerOpen(false)
      await loadBanners()
    } catch (err) {
      setBannerError(extractErrorMessage(err, t('common.error')))
    } finally {
      setBannerSubmitting(false)
    }
  }

  async function toggleBanner(banner: CookieBanner) {
    setBannerBusy(banner.id)
    setError('')
    try {
      await updateCookieBanner(banner.id, { is_active: !banner.is_active })
      setSuccess(
        !banner.is_active
          ? t('consents.banners.activateSuccess')
          : t('consents.banners.deactivateSuccess')
      )
      await loadBanners()
    } catch (err) {
      setError(extractErrorMessage(err, t('common.error')))
    } finally {
      setBannerBusy(null)
    }
  }

  function openCookieCreate() {
    setCookieForm({
      banner_id: banners.find((b) => b.is_active)?.id?.toString() ?? '',
      data_subject_token: '',
    })
    setCookieError('')
    setLastCookieConsent(null)
    setCookieOpen(true)
  }

  async function submitCookie(e: FormEvent) {
    e.preventDefault()
    setCookieError('')
    if (!cookieForm.banner_id || !cookieForm.data_subject_token.trim()) {
      setCookieError(t('consents.cookies.validation'))
      return
    }
    setCookieSubmitting(true)
    try {
      const created = await createCookieConsent({
        banner_id: Number(cookieForm.banner_id),
        data_subject_token: cookieForm.data_subject_token.trim(),
      })
      setLastCookieConsent(created)
      setSuccess(t('consents.cookies.createSuccess'))
    } catch (err) {
      setCookieError(extractErrorMessage(err, t('common.error')))
    } finally {
      setCookieSubmitting(false)
    }
  }

  async function revokeLastCookie() {
    if (!lastCookieConsent) return
    setCookieSubmitting(true)
    try {
      const revoked = await revokeCookieConsent(lastCookieConsent.id)
      setLastCookieConsent(revoked)
      setSuccess(t('consents.cookies.revokeSuccess'))
    } catch (err) {
      setCookieError(extractErrorMessage(err, t('common.error')))
    } finally {
      setCookieSubmitting(false)
    }
  }

  const recordColumns = useMemo<DataTableColumn<ConsentRecord>[]>(
    () => [
      {
        key: 'subject',
        header: t('consents.records.columns.subject'),
        render: (row) => (
          <div className="min-w-0">
            <p className="font-medium text-ink-50 truncate" title={row.data_subject_token}>
              {row.data_subject_token}
            </p>
            <p className="text-xs text-ink-300 line-clamp-2">{row.purpose}</p>
          </div>
        ),
      },
      {
        key: 'legal_basis',
        header: t('consents.records.columns.legalBasis'),
        render: (row) => <Badge tone="brand">{row.legal_basis}</Badge>,
      },
      {
        key: 'flags',
        header: t('consents.records.columns.flags'),
        render: (row) => (
          <div className="flex flex-wrap gap-1">
            {row.is_sensitive && <Badge tone="warning">{t('consents.records.sensitive')}</Badge>}
            {row.is_revoked ? (
              <Badge tone="danger">{t('consents.records.revoked')}</Badge>
            ) : (
              <Badge tone="success">{t('consents.records.active')}</Badge>
            )}
          </div>
        ),
      },
      {
        key: 'granted',
        header: t('consents.records.columns.granted'),
        render: (row) => (
          <span className="text-xs text-ink-300">{formatDateTime(row.granted_at)}</span>
        ),
      },
      {
        key: 'revoked',
        header: t('consents.records.columns.revoked'),
        render: (row) => (
          <span className="text-xs text-ink-300">
            {row.is_revoked ? formatDateTime(row.revoked_at) : '—'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: t('common.actions'),
        align: 'right',
        render: (row) =>
          row.is_revoked ? (
            <span className="text-xs text-ink-400">{t('consents.records.alreadyRevoked')}</span>
          ) : (
            <IconButton
              label={t('consents.records.revoke')}
              icon={<RotateCcw className="h-4 w-4" />}
              onClick={() => openRevoke(row)}
            />
          ),
      },
    ],
    [t]
  )

  const bannerColumns = useMemo<DataTableColumn<CookieBanner>[]>(
    () => [
      {
        key: 'version',
        header: t('consents.banners.columns.version'),
        render: (row) => (
          <div className="min-w-0">
            <p className="font-medium text-ink-50">v{row.version}</p>
            <p className="text-xs text-ink-300 line-clamp-2">{row.content}</p>
          </div>
        ),
      },
      {
        key: 'effective',
        header: t('consents.banners.columns.effective'),
        render: (row) => (
          <span className="text-xs text-ink-300">{formatDate(row.effective_date)}</span>
        ),
      },
      {
        key: 'state',
        header: t('consents.banners.columns.state'),
        render: (row) =>
          row.is_active ? (
            <Badge tone="success">{t('consents.banners.active')}</Badge>
          ) : (
            <Badge tone="neutral">{t('consents.banners.inactive')}</Badge>
          ),
      },
      {
        key: 'actions',
        header: t('common.actions'),
        align: 'right',
        render: (row) => (
          <IconButton
            label={row.is_active ? t('consents.banners.deactivate') : t('consents.banners.activate')}
            icon={
              row.is_active ? (
                <ToggleLeft className="h-4 w-4" />
              ) : (
                <ToggleRight className="h-4 w-4" />
              )
            }
            loading={bannerBusy === row.id}
            onClick={() => toggleBanner(row)}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, bannerBusy]
  )

  const bannerOptions = useMemo(
    () =>
      banners.map((b) => ({
        value: b.id.toString(),
        label: `v${b.version}${b.is_active ? ' · active' : ''}`,
      })),
    [banners]
  )

  const recordsTab = (
    <div className="space-y-4">
      <GlassCard padded={false} className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grow">
            <Select
              label={t('consents.records.filter')}
              value={recordFilter}
              onChange={(e) => setRecordFilter(e.target.value as typeof recordFilter)}
              options={[
                { value: 'all', label: t('consents.records.filterAll') },
                { value: 'active', label: t('consents.records.filterActive') },
                { value: 'revoked', label: t('consents.records.filterRevoked') },
              ]}
            />
          </div>
          <div className="flex items-center gap-2">
            <IconButton
              label={t('common.refresh')}
              icon={<RefreshCw className="h-4 w-4" />}
              variant="secondary"
              onClick={loadRecords}
            />
            <IconButton
              label={t('consents.records.create')}
              icon={<FilePlus2 className="h-4 w-4" />}
              variant="primary"
              onClick={openCreateRecord}
            />
          </div>
        </div>
      </GlassCard>
      <GlassPanel>
        <DataTable<ConsentRecord>
          columns={recordColumns}
          rows={records}
          rowKey={(r) => r.id}
          loading={recordsLoading}
          emptyTitle={t('consents.records.empty')}
          emptyDescription={t('consents.records.emptyHint')}
          emptyAction={
            <Button onClick={openCreateRecord}>{t('consents.records.create')}</Button>
          }
        />
      </GlassPanel>
    </div>
  )

  const bannersTab = (
    <div className="space-y-4">
      <GlassCard padded={false} className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-ink-300">{t('consents.banners.subtitle')}</div>
        <div className="flex items-center gap-2">
          <IconButton
            label={t('common.refresh')}
            icon={<RefreshCw className="h-4 w-4" />}
            variant="secondary"
            onClick={loadBanners}
          />
          <IconButton
            label={t('consents.banners.create')}
            icon={<FilePlus2 className="h-4 w-4" />}
            variant="primary"
            onClick={openBannerCreate}
          />
        </div>
      </GlassCard>
      <GlassPanel>
        <DataTable<CookieBanner>
          columns={bannerColumns}
          rows={banners}
          rowKey={(b) => b.id}
          loading={bannersLoading}
          emptyTitle={t('consents.banners.empty')}
          emptyDescription={t('consents.banners.emptyHint')}
          emptyAction={<Button onClick={openBannerCreate}>{t('consents.banners.create')}</Button>}
        />
      </GlassPanel>
    </div>
  )

  const cookiesTab = (
    <GlassCard className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-ink-50">{t('consents.cookies.title')}</h3>
        <p className="text-sm text-ink-300 mt-1">{t('consents.cookies.description')}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button onClick={openCookieCreate} disabled={banners.length === 0}>
          {t('consents.cookies.record')}
        </Button>
        {banners.length === 0 && (
          <span className="text-xs text-ink-400 self-center">
            {t('consents.cookies.noBanners')}
          </span>
        )}
      </div>
    </GlassCard>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('consents.title')}
        description={t('consents.description')}
      />

      {error && <AlertBox tone="danger">{error}</AlertBox>}
      {success && (
        <AlertBox tone="success">
          {success}
          <button
            type="button"
            onClick={() => setSuccess('')}
            className="ml-2 underline text-emerald-100/80"
          >
            {t('common.close')}
          </button>
        </AlertBox>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label={t('consents.stats.total')}
          value={stats ? stats.total : '—'}
          loading={statsLoading}
        />
        <KPICard
          label={t('consents.stats.active')}
          value={stats ? stats.active : '—'}
          loading={statsLoading}
        />
        <KPICard
          label={t('consents.stats.revoked')}
          value={stats ? stats.revoked : '—'}
          hint={
            stats ? `${formatPercent(stats.revocation_rate * 100, 1)} ${t('consents.stats.revocationRate')}` : ''
          }
          loading={statsLoading}
        />
        <KPICard
          label={t('consents.stats.sensitive')}
          value={stats ? stats.sensitive : '—'}
          loading={statsLoading}
        />
      </div>

      <Tabs
        tabs={[
          { id: 'records', label: t('consents.tabs.records'), content: recordsTab },
          { id: 'banners', label: t('consents.tabs.banners'), content: bannersTab },
          { id: 'cookies', label: t('consents.tabs.cookies'), content: cookiesTab },
        ]}
      />

      <Modal
        open={createRecordOpen}
        onClose={() => setCreateRecordOpen(false)}
        title={t('consents.records.create')}
        description={t('consents.records.createHint')}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateRecordOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submitRecord} loading={recordSubmitting}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <form onSubmit={submitRecord} className="space-y-3">
          <Input
            label={t('consents.records.fields.subject')}
            value={recordForm.data_subject_token}
            onChange={(e) => setRecordForm({ ...recordForm, data_subject_token: e.target.value })}
            required
          />
          <Textarea
            label={t('consents.records.fields.purpose')}
            value={recordForm.purpose}
            onChange={(e) => setRecordForm({ ...recordForm, purpose: e.target.value })}
            required
            rows={3}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <Select
              label={t('consents.records.fields.legalBasis')}
              value={recordForm.legal_basis}
              onChange={(e) => setRecordForm({ ...recordForm, legal_basis: e.target.value })}
              options={LEGAL_BASES.map((b) => ({ value: b, label: b }))}
            />
            <Input
              label={t('consents.records.fields.treatmentActivityId')}
              type="number"
              value={recordForm.treatment_activity_id}
              onChange={(e) =>
                setRecordForm({ ...recordForm, treatment_activity_id: e.target.value })
              }
              hint={t('consents.records.fields.treatmentActivityHint')}
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-ink-200">
            <input
              type="checkbox"
              checked={recordForm.is_sensitive}
              onChange={(e) =>
                setRecordForm({ ...recordForm, is_sensitive: e.target.checked })
              }
              className="h-4 w-4 rounded border-slate-300 bg-white"
            />
            {t('consents.records.fields.sensitive')}
          </label>
          {recordError && <AlertBox tone="danger">{recordError}</AlertBox>}
        </form>
      </Modal>

      <Modal
        open={revokingRecord !== null}
        onClose={() => setRevokingRecord(null)}
        title={t('consents.records.revoke')}
        description={t('consents.records.revokeHint')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRevokingRecord(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={submitRevoke} loading={revokeSubmitting}>
              {t('consents.records.revoke')}
            </Button>
          </>
        }
      >
        <Textarea
          label={t('consents.records.fields.reason')}
          value={revokeReason}
          onChange={(e) => setRevokeReason(e.target.value)}
          rows={3}
        />
        {revokeError && <AlertBox tone="danger">{revokeError}</AlertBox>}
      </Modal>

      <Modal
        open={bannerOpen}
        onClose={() => setBannerOpen(false)}
        title={t('consents.banners.create')}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setBannerOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submitBanner} loading={bannerSubmitting}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <form onSubmit={submitBanner} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label={t('consents.banners.fields.version')}
              value={bannerForm.version}
              onChange={(e) => setBannerForm({ ...bannerForm, version: e.target.value })}
              required
              placeholder="2026.05"
            />
            <Input
              label={t('consents.banners.fields.effective')}
              type="date"
              value={bannerForm.effective_date}
              onChange={(e) => setBannerForm({ ...bannerForm, effective_date: e.target.value })}
              required
            />
          </div>
          <Textarea
            label={t('consents.banners.fields.content')}
            value={bannerForm.content}
            onChange={(e) => setBannerForm({ ...bannerForm, content: e.target.value })}
            required
            rows={5}
          />
          {bannerError && <AlertBox tone="danger">{bannerError}</AlertBox>}
        </form>
      </Modal>

      <Modal
        open={cookieOpen}
        onClose={() => setCookieOpen(false)}
        title={t('consents.cookies.record')}
        description={t('consents.cookies.modalHint')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCookieOpen(false)}>
              {t('common.close')}
            </Button>
            {lastCookieConsent && !lastCookieConsent.is_revoked && (
              <Button variant="danger" onClick={revokeLastCookie} loading={cookieSubmitting}>
                {t('consents.cookies.revoke')}
              </Button>
            )}
            {!lastCookieConsent && (
              <Button onClick={submitCookie} loading={cookieSubmitting}>
                {t('consents.cookies.record')}
              </Button>
            )}
          </>
        }
      >
        <form onSubmit={submitCookie} className="space-y-3">
          <Select
            label={t('consents.cookies.fields.banner')}
            value={cookieForm.banner_id}
            onChange={(e) => setCookieForm({ ...cookieForm, banner_id: e.target.value })}
            options={bannerOptions}
            placeholder={t('consents.cookies.fields.bannerPlaceholder')}
            required
          />
          <Input
            label={t('consents.cookies.fields.subject')}
            value={cookieForm.data_subject_token}
            onChange={(e) =>
              setCookieForm({ ...cookieForm, data_subject_token: e.target.value })
            }
            required
          />
          {cookieError && <AlertBox tone="danger">{cookieError}</AlertBox>}
          {lastCookieConsent && (
            <AlertBox
              tone={lastCookieConsent.is_revoked ? 'warning' : 'success'}
              title={
                lastCookieConsent.is_revoked
                  ? t('consents.cookies.revoked')
                  : t('consents.cookies.recorded')
              }
            >
              <p className="text-xs text-current/90">
                {t('consents.cookies.acceptedAt')}: {formatDateTime(lastCookieConsent.accepted_at)}
              </p>
              {lastCookieConsent.revoked_at && (
                <p className="text-xs text-current/90">
                  {t('consents.cookies.revokedAt')}: {formatDateTime(lastCookieConsent.revoked_at)}
                </p>
              )}
            </AlertBox>
          )}
        </form>
      </Modal>
    </div>
  )
}
