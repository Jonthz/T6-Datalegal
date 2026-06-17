import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Badge,
  Button,
  DataTable,
  GlassPanel,
  Input,
  Modal,
  PageHeader,
  Select,
  Alert as AlertBox,
} from '../components/ui'
import type { DataTableColumn } from '../components/ui'
import { getUsers, createUser, deleteUser } from '../api/users'
import type { Role, User } from '../types'
import { formatDate } from '../lib/format'

const ROLE_OPTIONS: Array<{ value: Role; label: string }> = [
  { value: 'SUPER_ADMIN', label: 'Super admin' },
  { value: 'DPO', label: 'DPO' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'DEPT_HEAD', label: 'Department head' },
  { value: 'AUDITOR', label: 'Auditor' },
]

interface NewUserForm {
  email: string
  password: string
  full_name: string
  role: Role
}

const EMPTY_FORM: NewUserForm = {
  email: '',
  password: '',
  full_name: '',
  role: 'AUDITOR',
}

export default function UserManagementPage() {
  const { t } = useTranslation()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [success, setSuccess] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<NewUserForm>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)

  const loadUsers = async () => {
    setLoading(true)
    setPageError('')
    try {
      const data = await getUsers()
      setUsers(data)
    } catch {
      setPageError(t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  function resetForm() {
    setForm(EMPTY_FORM)
    setFormError('')
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    setFormSubmitting(true)
    try {
      await createUser({
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        role: form.role,
      })
      setSuccess(t('users.createSuccess'))
      setModalOpen(false)
      resetForm()
      await loadUsers()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } }
      setFormError(axiosErr.response?.data?.detail ?? t('common.error'))
    } finally {
      setFormSubmitting(false)
    }
  }

  async function handleDelete(user: User) {
    if (!window.confirm(t('users.confirmDelete'))) return
    setBusyId(user.id)
    try {
      await deleteUser(user.id)
      setSuccess(t('users.deleteSuccess'))
      await loadUsers()
    } catch {
      setPageError(t('common.error'))
    } finally {
      setBusyId(null)
    }
  }

  const columns = useMemo<DataTableColumn<User>[]>(
    () => [
      {
        key: 'name',
        header: t('users.fullName'),
        render: (u) => (
          <div className="min-w-0">
            <p className="font-medium text-ink-50 truncate">{u.full_name}</p>
            <p className="text-xs text-ink-300 truncate">{u.email}</p>
          </div>
        ),
      },
      {
        key: 'role',
        header: t('users.role'),
        render: (u) => <Badge tone="brand">{u.role}</Badge>,
      },
      {
        key: 'status',
        header: t('users.status'),
        render: (u) => (
          <Badge tone={u.is_active ? 'success' : 'neutral'}>
            {u.is_active ? t('users.active') : t('users.inactive')}
          </Badge>
        ),
      },
      {
        key: 'mfa',
        header: t('users.mfaEnabled'),
        render: (u) => (
          <Badge tone={u.mfa_enabled ? 'success' : 'warning'}>
            {u.mfa_enabled ? t('common.yes') : t('common.no')}
          </Badge>
        ),
      },
      {
        key: 'created',
        header: 'Created',
        render: (u) => (
          <span className="text-xs text-ink-300">{formatDate(u.created_at)}</span>
        ),
      },
      {
        key: 'actions',
        header: t('users.actions'),
        align: 'right',
        render: (u) => (
          <Button
            size="sm"
            variant="ghost"
            loading={busyId === u.id}
            onClick={() => handleDelete(u)}
          >
            {t('users.delete')}
          </Button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, busyId]
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('users.title')}
        description={t('users.description')}
        actions={
          <Button onClick={() => setModalOpen(true)}>{t('users.create')}</Button>
        }
      />

      {pageError && <AlertBox tone="danger">{pageError}</AlertBox>}
      {success && <AlertBox tone="success">{success}</AlertBox>}

      <GlassPanel>
        <DataTable<User>
          columns={columns}
          rows={users}
          rowKey={(u) => u.id}
          loading={loading}
          emptyTitle={t('common.noData')}
        />
      </GlassPanel>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          resetForm()
        }}
        title={t('users.create')}
        size="md"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setModalOpen(false)
                resetForm()
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreate} loading={formSubmitting}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label={t('users.fullName')}
            required
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            autoComplete="name"
          />
          <Input
            label={t('users.email')}
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            autoComplete="email"
          />
          <Input
            label={t('auth.password')}
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            autoComplete="new-password"
          />
          <Select
            label={t('users.role')}
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            options={ROLE_OPTIONS}
          />
          {formError && (
            <div className="sm:col-span-2">
              <AlertBox tone="danger">{formError}</AlertBox>
            </div>
          )}
        </form>
      </Modal>
    </div>
  )
}
