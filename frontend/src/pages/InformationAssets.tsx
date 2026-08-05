import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import { Database, Pencil, RefreshCw, Trash2 } from 'lucide-react'
import {
  Alert as AlertBox,
  Badge,
  Button,
  DataTable,
  GlassCard,
  GlassPanel,
  IconButton,
  Input,
  Modal,
  PageHeader,
  Select,
  Textarea,
} from '../components/ui'
import type { DataTableColumn } from '../components/ui'
import {
  createInformationAsset,
  deleteInformationAsset,
  listInformationAssets,
  updateInformationAsset,
} from '../api/informationAssets'
import { listCatalogByType } from '../api/catalogs'
import { listDepartments } from '../api/departments'
import { listTreatmentActivities } from '../api/treatmentActivities'
import type {
  CatalogEntry,
  Department,
  InformationAsset,
  TreatmentActivity,
} from '../types'
import { extractErrorMessage } from '../lib/errors'

const ASSET_CATALOG_TYPES = ['ASSET_TYPE', 'ASSET_FORMAT', 'STORAGE_MEDIUM', 'CLASSIFICATION_LEVEL'] as const

const FALLBACK_CLASSIFICATIONS: CatalogEntry[] = [
  {
    id: -1,
    tenant_id: 0,
    type: 'CLASSIFICATION_LEVEL',
    code: 'PUBLICA_USO_INTERNO',
    label: 'Public / Internal use',
    description: 'LOPDP default',
    is_active: true,
    sensitivity: null,
    criticality: null,
    version: 1,
    created_at: '',
  },
  {
    id: -2,
    tenant_id: 0,
    type: 'CLASSIFICATION_LEVEL',
    code: 'PUBLICA_CLASIFICADA',
    label: 'Classified',
    description: 'LOPDP default',
    is_active: true,
    sensitivity: null,
    criticality: null,
    version: 1,
    created_at: '',
  },
  {
    id: -3,
    tenant_id: 0,
    type: 'CLASSIFICATION_LEVEL',
    code: 'PUBLICA_RESERVADA',
    label: 'Reserved',
    description: 'LOPDP default',
    is_active: true,
    sensitivity: null,
    criticality: null,
    version: 1,
    created_at: '',
  },
]

interface AssetForm {
  name: string
  description: string
  asset_type_code: string
  format_code: string
  storage_medium_code: string
  classification_level_code: string
  treatment_activity_id: string
  department_id: string
}

const EMPTY: AssetForm = {
  name: '',
  description: '',
  asset_type_code: '',
  format_code: '',
  storage_medium_code: '',
  classification_level_code: '',
  treatment_activity_id: '',
  department_id: '',
}

export default function InformationAssetsPage() {
  const { t } = useTranslation()
  const [assets, setAssets] = useState<InformationAsset[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [activities, setActivities] = useState<TreatmentActivity[]>([])
  const [catalogs, setCatalogs] = useState<Record<string, CatalogEntry[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<InformationAsset | null>(null)
  const [form, setForm] = useState<AssetForm>(EMPTY)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [assetList, deptList, activityList, ...catLists] = await Promise.all([
        listInformationAssets({ classification: classFilter || undefined, limit: 200 }),
        listDepartments({ limit: 200 }).catch(() => [] as Department[]),
        listTreatmentActivities({ limit: 200 }).catch(() => [] as TreatmentActivity[]),
        ...ASSET_CATALOG_TYPES.map((type) =>
          listCatalogByType(type).catch(() => [] as CatalogEntry[])
        ),
      ])
      const map: Record<string, CatalogEntry[]> = {}
      ASSET_CATALOG_TYPES.forEach((type, idx) => {
        map[type] = catLists[idx] ?? []
      })
      if (map.CLASSIFICATION_LEVEL.length === 0) {
        map.CLASSIFICATION_LEVEL = FALLBACK_CLASSIFICATIONS
      }
      setAssets(assetList)
      setDepartments(deptList)
      setActivities(activityList)
      setCatalogs(map)
    } catch (err) {
      setError(extractErrorMessage(err, t('informationAssets.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [classFilter, t])

  useEffect(() => {
    load()
  }, [load])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY)
    setFormError('')
    setModalOpen(true)
  }

  function openEdit(asset: InformationAsset) {
    setEditing(asset)
    setForm({
      name: asset.name ?? '',
      description: asset.description ?? '',
      asset_type_code: asset.asset_type_code,
      format_code: asset.format_code,
      storage_medium_code: asset.storage_medium_code,
      classification_level_code: asset.classification_level_code,
      treatment_activity_id: asset.treatment_activity_id
        ? String(asset.treatment_activity_id)
        : '',
      department_id: asset.department_id ? String(asset.department_id) : '',
    })
    setFormError('')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
    setForm(EMPTY)
    setFormError('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)
    try {
      const payload = {
        name: form.name,
        description: form.description,
        asset_type_code: form.asset_type_code,
        format_code: form.format_code,
        storage_medium_code: form.storage_medium_code,
        classification_level_code: form.classification_level_code,
        treatment_activity_id: form.treatment_activity_id
          ? Number(form.treatment_activity_id)
          : null,
        department_id: form.department_id ? Number(form.department_id) : null,
      }
      if (editing) {
        await updateInformationAsset(editing.id, payload)
        setSuccess(t('informationAssets.updateSuccess'))
      } else {
        await createInformationAsset(payload)
        setSuccess(t('informationAssets.createSuccess'))
      }
      closeModal()
      await load()
    } catch (err) {
      setFormError(extractErrorMessage(err, t('common.error')))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(asset: InformationAsset) {
    if (!window.confirm(t('informationAssets.confirmDelete'))) return
    setBusyId(asset.id)
    try {
      await deleteInformationAsset(asset.id)
      setSuccess(t('informationAssets.deleteSuccess'))
      await load()
    } catch (err) {
      setError(extractErrorMessage(err, t('common.error')))
    } finally {
      setBusyId(null)
    }
  }

  const deptById = useMemo(() => {
    const map = new Map<number, Department>()
    departments.forEach((d) => map.set(d.id, d))
    return map
  }, [departments])

  const activityById = useMemo(() => {
    const map = new Map<number, TreatmentActivity>()
    activities.forEach((a) => map.set(a.id, a))
    return map
  }, [activities])

  const classOptions = useMemo(
    () => [
      { value: '', label: t('informationAssets.filterAll') },
      ...(catalogs.CLASSIFICATION_LEVEL ?? FALLBACK_CLASSIFICATIONS).map((c) => ({
        value: c.code,
        label: c.label,
      })),
    ],
    [catalogs, t]
  )

  const formCatalogOptions = useCallback(
    (type: string) => {
      const list = catalogs[type] ?? (type === 'CLASSIFICATION_LEVEL' ? FALLBACK_CLASSIFICATIONS : [])
      return [
        { value: '', label: t('common.optional') },
        ...list.map((c) => ({ value: c.code, label: c.label })),
      ]
    },
    [catalogs, t]
  )

  const columns = useMemo<DataTableColumn<InformationAsset>[]>(
    () => [
      {
        key: 'name',
        header: t('informationAssets.fields.name'),
        render: (a) => (
          <div className="min-w-0">
            <p className="font-medium text-ink-50 truncate">{a.name}</p>
            <p className="text-xs text-ink-400 line-clamp-2">{a.description ?? '—'}</p>
          </div>
        ),
      },
      {
        key: 'classification',
        header: t('informationAssets.fields.classification'),
        render: (a) => (
          <Badge
            tone={
              a.classification_level_code === 'PUBLICA_RESERVADA' ? 'danger' : 'brand'
            }
          >
            {a.classification_level_code}
          </Badge>
        ),
      },
      {
        key: 'assetType',
        header: t('informationAssets.fields.assetType'),
        render: (a) => <code className="text-xs text-ink-100">{a.asset_type_code}</code>,
      },
      {
        key: 'format',
        header: t('informationAssets.fields.format'),
        render: (a) => <code className="text-xs text-ink-100">{a.format_code}</code>,
      },
      {
        key: 'storage',
        header: t('informationAssets.fields.storageMedium'),
        render: (a) => <code className="text-xs text-ink-100">{a.storage_medium_code}</code>,
      },
      {
        key: 'activity',
        header: t('informationAssets.fields.treatmentActivity'),
        render: (a) => {
          if (!a.treatment_activity_id) return <span className="text-xs text-ink-400">—</span>
          const act = activityById.get(a.treatment_activity_id)
          return <span className="text-xs text-ink-200">{act?.name ?? `#${a.treatment_activity_id}`}</span>
        },
      },
      {
        key: 'department',
        header: t('informationAssets.fields.department'),
        render: (a) => {
          if (!a.department_id) return <span className="text-xs text-ink-400">—</span>
          const dept = deptById.get(a.department_id)
          return <span className="text-xs text-ink-200">{dept?.name ?? `#${a.department_id}`}</span>
        },
      },
      {
        key: 'actions',
        header: t('common.actions'),
        align: 'right',
        render: (a) => (
          <div className="flex items-center justify-end gap-2">
            <IconButton
              label={t('common.edit')}
              icon={<Pencil className="h-4 w-4" />}
              onClick={() => openEdit(a)}
            />
            <IconButton
              label={t('common.delete')}
              icon={<Trash2 className="h-4 w-4" />}
              variant="danger"
              loading={busyId === a.id}
              onClick={() => handleDelete(a)}
            />
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, deptById, activityById, busyId]
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('informationAssets.title')}
        description={t('informationAssets.description')}
        actions={
          <IconButton
            label={t('informationAssets.create')}
            icon={<Database className="h-5 w-5" />}
            variant="primary"
            size="md"
            onClick={openCreate}
          />
        }
      />

      {error && <AlertBox tone="danger">{error}</AlertBox>}
      {success && <AlertBox tone="success">{success}</AlertBox>}

      <GlassCard>
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <Select
            label={t('informationAssets.filterByClass')}
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            options={classOptions}
            className="sm:w-72"
          />
          <IconButton
            label={t('common.refresh')}
            icon={<RefreshCw className="h-4 w-4" />}
            variant="secondary"
            onClick={() => load()}
          />
        </div>
      </GlassCard>

      <GlassPanel>
        <DataTable<InformationAsset>
          columns={columns}
          rows={assets}
          rowKey={(a) => a.id}
          loading={loading}
          error={error && !loading ? error : null}
          emptyTitle={t('informationAssets.empty')}
          emptyDescription={t('informationAssets.emptyHint')}
          emptyAction={<Button onClick={openCreate}>{t('informationAssets.create')}</Button>}
        />
      </GlassPanel>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? t('informationAssets.edit') : t('informationAssets.create')}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            label={t('informationAssets.fields.name')}
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Textarea
            label={t('informationAssets.fields.description')}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label={t('informationAssets.fields.assetType')}
              required
              value={form.asset_type_code}
              onChange={(e) => setForm({ ...form, asset_type_code: e.target.value })}
              options={formCatalogOptions('ASSET_TYPE')}
              hint={
                (catalogs.ASSET_TYPE ?? []).length === 0
                  ? t('informationAssets.missingCatalogs', { type: 'ASSET_TYPE' })
                  : undefined
              }
            />
            <Select
              label={t('informationAssets.fields.format')}
              required
              value={form.format_code}
              onChange={(e) => setForm({ ...form, format_code: e.target.value })}
              options={formCatalogOptions('ASSET_FORMAT')}
              hint={
                (catalogs.ASSET_FORMAT ?? []).length === 0
                  ? t('informationAssets.missingCatalogs', { type: 'ASSET_FORMAT' })
                  : undefined
              }
            />
            <Select
              label={t('informationAssets.fields.storageMedium')}
              required
              value={form.storage_medium_code}
              onChange={(e) => setForm({ ...form, storage_medium_code: e.target.value })}
              options={formCatalogOptions('STORAGE_MEDIUM')}
              hint={
                (catalogs.STORAGE_MEDIUM ?? []).length === 0
                  ? t('informationAssets.missingCatalogs', { type: 'STORAGE_MEDIUM' })
                  : undefined
              }
            />
            <Select
              label={t('informationAssets.fields.classification')}
              required
              value={form.classification_level_code}
              onChange={(e) =>
                setForm({ ...form, classification_level_code: e.target.value })
              }
              options={formCatalogOptions('CLASSIFICATION_LEVEL')}
            />
            <Select
              label={t('informationAssets.fields.treatmentActivity')}
              value={form.treatment_activity_id}
              onChange={(e) =>
                setForm({ ...form, treatment_activity_id: e.target.value })
              }
              options={[
                { value: '', label: t('common.optional') },
                ...activities.map((a) => ({ value: String(a.id), label: a.name })),
              ]}
            />
            <Select
              label={t('informationAssets.fields.department')}
              value={form.department_id}
              onChange={(e) => setForm({ ...form, department_id: e.target.value })}
              options={[
                { value: '', label: t('common.optional') },
                ...departments.map((d) => ({ value: String(d.id), label: d.name })),
              ]}
            />
          </div>
          {formError && <AlertBox tone="danger">{formError}</AlertBox>}
        </form>
      </Modal>
    </div>
  )
}
