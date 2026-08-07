import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { FolderPlus, Pencil, Trash2 } from 'lucide-react'
import {
  Alert as AlertBox,
  Badge,
  Button,
  DataTable,
  GlassPanel,
  IconButton,
  Input,
  Modal,
  PageHeader,
  Select,
} from '../components/ui'
import type { DataTableColumn } from '../components/ui'
import {
  createDepartment,
  deleteDepartment,
  listDepartments,
  updateDepartment,
} from '../api/departments'
import { getUsers } from '../api/users'
import type { Department, User } from '../types'
import { formatDate } from '../lib/format'
import { extractErrorMessage } from '../lib/errors'

interface DepartmentForm {
  name: string
  head_user_id: string
}

const EMPTY_FORM: DepartmentForm = { name: '', head_user_id: '' }

export default function DepartmentsPage() {
  const { t } = useTranslation()
  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [success, setSuccess] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
  const [form, setForm] = useState<DepartmentForm>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setPageError('')
    try {
      const [deptList, userList] = await Promise.all([
        listDepartments({ limit: 200 }),
        getUsers({ limit: 200 }).catch(() => [] as User[]),
      ])
      setDepartments(deptList)
      setUsers(userList)
    } catch (err) {
      setPageError(extractErrorMessage(err, t('departments.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setModalOpen(true)
  }

  function openEdit(dept: Department) {
    setEditing(dept)
    setForm({
      name: dept.name,
      head_user_id: dept.head_user_id ? String(dept.head_user_id) : '',
    })
    setFormError('')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)
    try {
      const head_user_id = form.head_user_id ? Number(form.head_user_id) : null
      if (editing) {
        await updateDepartment(editing.id, { name: form.name, head_user_id })
        setSuccess(t('departments.updateSuccess'))
      } else {
        await createDepartment({ name: form.name, head_user_id })
        setSuccess(t('departments.createSuccess'))
      }
      closeModal()
      await loadAll()
    } catch (err) {
      setFormError(extractErrorMessage(err, t('common.error')))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(dept: Department) {
    if (!window.confirm(t('departments.confirmDelete'))) return
    setBusyId(dept.id)
    setPageError('')
    try {
      await deleteDepartment(dept.id)
      setSuccess(t('departments.deleteSuccess'))
      await loadAll()
    } catch (err) {
      setPageError(extractErrorMessage(err, t('common.error')))
    } finally {
      setBusyId(null)
    }
  }

  const usersById = useMemo(() => {
    const map = new Map<number, User>()
    users.forEach((u) => map.set(u.id, u))
    return map
  }, [users])

  const userOptions = useMemo(
    () => [
      { value: '', label: t('departments.noHead') },
      ...users.map((u) => ({ value: String(u.id), label: `${u.full_name} (${u.email})` })),
    ],
    [t, users]
  )

  const columns = useMemo<DataTableColumn<Department>[]>(
    () => [
      {
        key: 'name',
        header: t('departments.fields.name'),
        render: (d) => <span className="font-medium text-ink-50">{d.name}</span>,
      },
      {
        key: 'head',
        header: t('departments.fields.head'),
        render: (d) => {
          if (!d.head_user_id) return <Badge tone="neutral">{t('departments.noHead')}</Badge>
          const head = usersById.get(d.head_user_id)
          return head ? (
            <div className="min-w-0">
              <p className="text-sm text-ink-100 truncate">{head.full_name}</p>
              <p className="text-xs text-ink-400 truncate">{head.email}</p>
            </div>
          ) : (
            <span className="text-xs text-ink-400">ID #{d.head_user_id}</span>
          )
        },
      },
      {
        key: 'created',
        header: t('departments.fields.created'),
        render: (d) => <span className="text-xs text-ink-300">{formatDate(d.created_at)}</span>,
      },
      {
        key: 'actions',
        header: t('common.actions'),
        align: 'right',
        render: (d) => (
          <div className="flex items-center justify-end gap-2">
            <IconButton
              label={t('common.edit')}
              icon={<Pencil className="h-4 w-4" />}
              onClick={() => openEdit(d)}
            />
            <IconButton
              label={t('common.delete')}
              icon={<Trash2 className="h-4 w-4" />}
              variant="danger"
              loading={busyId === d.id}
              onClick={() => handleDelete(d)}
            />
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, usersById, busyId]
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('departments.title')}
        description={t('departments.description')}
        actions={
          <IconButton
            label={t('departments.create')}
            icon={<FolderPlus className="h-5 w-5" />}
            variant="primary"
            size="md"
            onClick={openCreate}
          />
        }
      />

      {pageError && <AlertBox tone="danger">{pageError}</AlertBox>}
      {success && <AlertBox tone="success">{success}</AlertBox>}

      <GlassPanel>
        <DataTable<Department>
          columns={columns}
          rows={departments}
          rowKey={(d) => d.id}
          loading={loading}
          error={pageError && !loading ? pageError : null}
          emptyTitle={t('departments.empty')}
          emptyDescription={t('departments.emptyHint')}
          emptyAction={<Button onClick={openCreate}>{t('departments.create')}</Button>}
        />
      </GlassPanel>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? t('departments.edit') : t('departments.create')}
        size="md"
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
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3">
          <Input
            label={t('departments.fields.name')}
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Select
            label={t('departments.fields.head')}
            value={form.head_user_id}
            onChange={(e) => setForm({ ...form, head_user_id: e.target.value })}
            options={userOptions}
          />
          {formError && <AlertBox tone="danger">{formError}</AlertBox>}
        </form>
      </Modal>
    </div>
  )
}
