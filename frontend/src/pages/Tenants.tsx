import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert as AlertBox,
  Badge,
  Button,
  DataTable,
  GlassPanel,
  Input,
  Modal,
  PageHeader,
  Select,
} from '../components/ui'
import type { DataTableColumn } from '../components/ui'
import { listTenants, provisionTenant } from '../api/tenants'
import { listSectors } from '../api/sectors'
import type { SectorSuggestions, Tenant } from '../types'
import { formatDate } from '../lib/format'
import { extractErrorMessage } from '../lib/errors'

interface ProvisionForm {
  tenantName: string
  ruc: string
  country: string
  sector: string
  adminEmail: string
  adminFullName: string
  adminPassword: string
  adminRole: 'ADMIN' | 'DPO'
}

const EMPTY: ProvisionForm = {
  tenantName: '',
  ruc: '',
  country: 'Ecuador',
  sector: '',
  adminEmail: '',
  adminFullName: '',
  adminPassword: '',
  adminRole: 'ADMIN',
}

export default function TenantsPage() {
  const { t } = useTranslation()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [sectors, setSectors] = useState<SectorSuggestions[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [success, setSuccess] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<ProvisionForm>(EMPTY)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setPageError('')
    try {
      const [list, sectorList] = await Promise.all([
        listTenants(),
        listSectors().catch(() => [] as SectorSuggestions[]),
      ])
      setTenants(list)
      setSectors(sectorList)
    } catch (err) {
      setPageError(extractErrorMessage(err, t('tenants.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  function openModal() {
    setForm(EMPTY)
    setFormError('')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setForm(EMPTY)
    setFormError('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)
    try {
      await provisionTenant({
        tenant: {
          name: form.tenantName,
          ruc: form.ruc,
          country: form.country || 'Ecuador',
          sector: form.sector || null,
        },
        admin_user: {
          email: form.adminEmail,
          password: form.adminPassword,
          full_name: form.adminFullName,
          role: form.adminRole,
        },
      })
      setSuccess(t('tenants.provisionSuccess'))
      closeModal()
      await load()
    } catch (err) {
      setFormError(extractErrorMessage(err, t('common.error')))
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

  const columns = useMemo<DataTableColumn<Tenant>[]>(
    () => [
      {
        key: 'name',
        header: t('tenants.fields.name'),
        render: (tenant) => (
          <div className="min-w-0">
            <p className="font-medium text-ink-50 truncate">{tenant.name}</p>
            <p className="text-xs text-ink-400 truncate">{tenant.address ?? '—'}</p>
          </div>
        ),
      },
      {
        key: 'ruc',
        header: t('tenants.fields.ruc'),
        render: (tenant) => <span className="text-ink-100">{tenant.ruc}</span>,
      },
      {
        key: 'country',
        header: t('tenants.fields.country'),
        render: (tenant) => <span className="text-ink-100">{tenant.country}</span>,
      },
      {
        key: 'sector',
        header: t('tenants.fields.sector'),
        render: (tenant) =>
          tenant.sector ? <Badge tone="brand">{tenant.sector}</Badge> : <span className="text-ink-400">—</span>,
      },
      {
        key: 'status',
        header: t('tenants.fields.status'),
        render: (tenant) => (
          <Badge tone={tenant.is_active ? 'success' : 'neutral'}>
            {tenant.is_active ? t('common.active') : t('common.inactive')}
          </Badge>
        ),
      },
      {
        key: 'created',
        header: t('tenants.fields.created'),
        render: (tenant) => <span className="text-xs text-ink-300">{formatDate(tenant.created_at)}</span>,
      },
    ],
    [t]
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('tenants.title')}
        description={t('tenants.description')}
        actions={<Button onClick={openModal}>{t('tenants.create')}</Button>}
      />

      {pageError && <AlertBox tone="danger">{pageError}</AlertBox>}
      {success && <AlertBox tone="success">{success}</AlertBox>}

      <GlassPanel>
        <DataTable<Tenant>
          columns={columns}
          rows={tenants}
          rowKey={(tenant) => tenant.id}
          loading={loading}
          error={pageError && !loading ? pageError : null}
          emptyTitle={t('tenants.empty')}
          emptyDescription={t('tenants.emptyHint')}
          emptyAction={<Button onClick={openModal}>{t('tenants.create')}</Button>}
        />
      </GlassPanel>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={t('tenants.create')}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              {t('common.create')}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-ink-200 mb-3">
              {t('companyProfile.sections.company')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label={t('tenants.fields.name')}
                required
                value={form.tenantName}
                onChange={(e) => setForm({ ...form, tenantName: e.target.value })}
              />
              <Input
                label={t('tenants.fields.ruc')}
                required
                value={form.ruc}
                onChange={(e) => setForm({ ...form, ruc: e.target.value })}
              />
              <Input
                label={t('tenants.fields.country')}
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
              <Select
                label={t('tenants.fields.sector')}
                value={form.sector}
                onChange={(e) => setForm({ ...form, sector: e.target.value })}
                options={sectorOptions}
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink-200 mb-3">{t('tenants.newAdmin')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label={t('tenants.adminFields.fullName')}
                required
                value={form.adminFullName}
                onChange={(e) => setForm({ ...form, adminFullName: e.target.value })}
              />
              <Input
                label={t('tenants.adminFields.email')}
                type="email"
                required
                value={form.adminEmail}
                onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
              />
              <Input
                label={t('tenants.adminFields.password')}
                type="password"
                required
                value={form.adminPassword}
                onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                hint={t('tenants.passwordHint')}
              />
              <Select
                label={t('tenants.adminFields.role')}
                value={form.adminRole}
                onChange={(e) =>
                  setForm({ ...form, adminRole: e.target.value as ProvisionForm['adminRole'] })
                }
                options={[
                  { value: 'ADMIN', label: 'Admin' },
                  { value: 'DPO', label: 'DPO' },
                ]}
              />
            </div>
          </div>

          {formError && <AlertBox tone="danger">{formError}</AlertBox>}
        </form>
      </Modal>
    </div>
  )
}
