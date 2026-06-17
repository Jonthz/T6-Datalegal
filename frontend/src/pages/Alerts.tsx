import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert as AlertBox,
  Badge,
  Button,
  GlassCard,
  GlassPanel,
  Input,
  KPICard,
  Modal,
  PageHeader,
  Select,
  Tabs,
  Textarea,
} from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import {
  createAlert,
  deleteAlert,
  getUnreadCount,
  listAlerts,
  markAlertRead,
} from '../api/alerts'
import type { Alert as AlertType, Role } from '../types'
import { extractErrorMessage } from '../lib/errors'
import { formatDateTime, formatRelative } from '../lib/format'

const SEVERITIES = ['INFO', 'WARNING', 'CRITICAL'] as const
const CREATE_ROLES: Role[] = ['SUPER_ADMIN', 'DPO', 'ADMIN']

interface AlertForm {
  alert_type: string
  title: string
  message: string
  severity: string
  resource_type: string
  resource_id: string
  recipient_id: string
}

const EMPTY_FORM: AlertForm = {
  alert_type: 'INFO',
  title: '',
  message: '',
  severity: 'INFO',
  resource_type: '',
  resource_id: '',
  recipient_id: '',
}

function severityTone(s: string): 'danger' | 'warning' | 'info' | 'neutral' {
  if (s === 'CRITICAL') return 'danger'
  if (s === 'WARNING' || s === 'HIGH') return 'warning'
  if (s === 'INFO') return 'info'
  return 'neutral'
}

export default function AlertsPage() {
  const { t } = useTranslation()
  const { auth } = useAuth()
  const canCreate = auth.role !== null && CREATE_ROLES.includes(auth.role)

  const [activeTab, setActiveTab] = useState<'unread' | 'all'>('unread')
  const [alerts, setAlerts] = useState<AlertType[]>([])
  const [unreadCount, setUnreadCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<AlertForm>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadCount = useCallback(async () => {
    try {
      const data = await getUnreadCount()
      setUnreadCount(data.unread_count)
    } catch {
      setUnreadCount(null)
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listAlerts(
        activeTab === 'unread' ? { is_read: false, limit: 200 } : { limit: 200 }
      )
      setAlerts(data)
    } catch (err) {
      setError(extractErrorMessage(err, t('alerts.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [activeTab, t])

  useEffect(() => {
    loadCount()
  }, [loadCount])

  useEffect(() => {
    load()
  }, [load])

  async function handleMarkRead(id: number) {
    setBusyId(id)
    setError('')
    try {
      await markAlertRead(id)
      await Promise.all([load(), loadCount()])
    } catch (err) {
      setError(extractErrorMessage(err, t('common.error')))
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(id: number) {
    setBusyId(id)
    setError('')
    try {
      await deleteAlert(id)
      await Promise.all([load(), loadCount()])
    } catch (err) {
      setError(extractErrorMessage(err, t('common.error')))
    } finally {
      setBusyId(null)
    }
  }

  function openCreate() {
    setForm(EMPTY_FORM)
    setFormError('')
    setCreateOpen(true)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!form.title.trim() || !form.message.trim() || !form.alert_type.trim()) {
      setFormError(t('alerts.validation'))
      return
    }
    setSubmitting(true)
    try {
      await createAlert({
        alert_type: form.alert_type.trim(),
        title: form.title.trim(),
        message: form.message.trim(),
        severity: form.severity,
        resource_type: form.resource_type.trim() || null,
        resource_id: form.resource_id ? Number(form.resource_id) : null,
        recipient_id: form.recipient_id ? Number(form.recipient_id) : null,
      })
      setSuccess(t('alerts.createSuccess'))
      setCreateOpen(false)
      await Promise.all([load(), loadCount()])
    } catch (err) {
      setFormError(extractErrorMessage(err, t('common.error')))
    } finally {
      setSubmitting(false)
    }
  }

  const sorted = useMemo(
    () => [...alerts].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [alerts]
  )

  const listBody =
    loading ? (
      <p className="text-sm text-ink-300 py-8 text-center">{t('common.loading')}</p>
    ) : sorted.length === 0 ? (
      <p className="text-sm text-ink-300 py-8 text-center">
        {activeTab === 'unread' ? t('alerts.empty') : t('alerts.emptyAll')}
      </p>
    ) : (
      <ul className="divide-y divide-white/5">
        {sorted.map((a) => (
          <li key={a.id} className="p-4 space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-ink-50 truncate">{a.title}</h3>
                  <Badge tone={severityTone(a.severity)}>{a.severity}</Badge>
                  <Badge tone="brand">{a.alert_type}</Badge>
                  {!a.is_read && <Badge tone="warning">{t('alerts.new')}</Badge>}
                </div>
                <p className="text-sm text-ink-200 mt-1 whitespace-pre-line">{a.message}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-ink-400 mt-1">
                  <span>{formatRelative(a.created_at)}</span>
                  <span>{formatDateTime(a.created_at)}</span>
                  {a.resource_type && (
                    <span>
                      {a.resource_type}
                      {a.resource_id !== null ? ` #${a.resource_id}` : ''}
                    </span>
                  )}
                  {a.recipient_id === null && (
                    <Badge tone="info">{t('alerts.broadcast')}</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!a.is_read && (
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={busyId === a.id}
                    onClick={() => handleMarkRead(a.id)}
                  >
                    {t('alerts.markRead')}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  loading={busyId === a.id}
                  onClick={() => handleDelete(a.id)}
                >
                  {t('alerts.delete')}
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    )

  const wrapped = <GlassPanel>{listBody}</GlassPanel>

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={t('alerts.title')}
        description={t('alerts.description')}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => Promise.all([load(), loadCount()])}>
              {t('common.refresh')}
            </Button>
            {canCreate && <Button onClick={openCreate}>{t('alerts.create')}</Button>}
          </div>
        }
      />

      {error && <AlertBox tone="danger">{error}</AlertBox>}
      {success && <AlertBox tone="success">{success}</AlertBox>}

      <div className="grid gap-4 sm:grid-cols-2">
        <KPICard
          label={t('alerts.kpis.unread')}
          value={unreadCount ?? '—'}
          hint={t('alerts.kpis.unreadHint')}
        />
        <KPICard
          label={t('alerts.kpis.shown')}
          value={sorted.length}
          hint={
            activeTab === 'unread'
              ? t('alerts.kpis.shownUnreadHint')
              : t('alerts.kpis.shownAllHint')
          }
        />
      </div>

      <Tabs
        initial={activeTab}
        onChange={(id) => setActiveTab(id as 'unread' | 'all')}
        tabs={[
          {
            id: 'unread',
            label: t('alerts.unread'),
            badge: unreadCount && unreadCount > 0 ? (
              <Badge tone="warning">{unreadCount}</Badge>
            ) : undefined,
            content: wrapped,
          },
          { id: 'all', label: t('alerts.all'), content: wrapped },
        ]}
      />

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t('alerts.create')}
        description={t('alerts.createHint')}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submit} loading={submitting}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label={t('alerts.fields.type')}
              value={form.alert_type}
              onChange={(e) => setForm({ ...form, alert_type: e.target.value })}
              hint={t('alerts.fields.typeHint')}
              required
            />
            <Select
              label={t('alerts.fields.severity')}
              value={form.severity}
              onChange={(e) => setForm({ ...form, severity: e.target.value })}
              options={SEVERITIES.map((s) => ({ value: s, label: s }))}
            />
          </div>
          <Input
            label={t('alerts.fields.title')}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <Textarea
            label={t('alerts.fields.message')}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            required
            rows={3}
          />
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              label={t('alerts.fields.resourceType')}
              value={form.resource_type}
              onChange={(e) => setForm({ ...form, resource_type: e.target.value })}
            />
            <Input
              label={t('alerts.fields.resourceId')}
              type="number"
              value={form.resource_id}
              onChange={(e) => setForm({ ...form, resource_id: e.target.value })}
            />
            <Input
              label={t('alerts.fields.recipientId')}
              type="number"
              value={form.recipient_id}
              onChange={(e) => setForm({ ...form, recipient_id: e.target.value })}
              hint={t('alerts.fields.recipientHint')}
            />
          </div>
          {formError && <AlertBox tone="danger">{formError}</AlertBox>}
        </form>
      </Modal>

      {!canCreate && (
        <GlassCard className="text-xs text-ink-300">
          {t('alerts.creationGated')}
        </GlassCard>
      )}
    </div>
  )
}
