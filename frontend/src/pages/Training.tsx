import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert as AlertBox,
  Badge,
  Button,
  DataTable,
  GlassCard,
  GlassPanel,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  Select,
  Tabs,
  Textarea,
} from '../components/ui'
import type { DataTableColumn } from '../components/ui'
import {
  createEnrollment,
  createMaterial,
  createModule,
  createProgram,
  listEnrollments,
  listMaterials,
  listModules,
  listPrograms,
  updateEnrollment,
  updateMaterial,
  updateModule,
  updateProgram,
} from '../api/training'
import { getUsers } from '../api/users'
import type {
  TrainingEnrollment,
  TrainingMaterial,
  TrainingModule,
  TrainingProgram,
  User,
} from '../types'
import { extractErrorMessage } from '../lib/errors'
import { formatDateTime } from '../lib/format'

const CONTENT_TYPES = ['text', 'video', 'pdf', 'link'] as const

interface ProgramForm {
  title: string
  description: string
  is_active: boolean
}

const EMPTY_PROGRAM_FORM: ProgramForm = {
  title: '',
  description: '',
  is_active: true,
}

interface ModuleForm {
  title: string
  description: string
  order: number
}

const EMPTY_MODULE_FORM: ModuleForm = {
  title: '',
  description: '',
  order: 0,
}

interface MaterialForm {
  title: string
  content_type: string
  url: string
  content: string
}

const EMPTY_MATERIAL_FORM: MaterialForm = {
  title: '',
  content_type: 'text',
  url: '',
  content: '',
}

export default function TrainingPage() {
  const { t } = useTranslation()

  const [programs, setPrograms] = useState<TrainingProgram[]>([])
  const [selectedProgram, setSelectedProgram] = useState<TrainingProgram | null>(null)
  const [modules, setModules] = useState<TrainingModule[]>([])
  const [selectedModule, setSelectedModule] = useState<TrainingModule | null>(null)
  const [materials, setMaterials] = useState<TrainingMaterial[]>([])
  const [enrollments, setEnrollments] = useState<TrainingEnrollment[]>([])
  const [users, setUsers] = useState<User[]>([])

  const [programsLoading, setProgramsLoading] = useState(true)
  const [modulesLoading, setModulesLoading] = useState(false)
  const [materialsLoading, setMaterialsLoading] = useState(false)
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [programOpen, setProgramOpen] = useState(false)
  const [editingProgram, setEditingProgram] = useState<TrainingProgram | null>(null)
  const [programForm, setProgramForm] = useState<ProgramForm>(EMPTY_PROGRAM_FORM)
  const [programError, setProgramError] = useState('')
  const [programSubmitting, setProgramSubmitting] = useState(false)

  const [moduleOpen, setModuleOpen] = useState(false)
  const [editingModule, setEditingModule] = useState<TrainingModule | null>(null)
  const [moduleForm, setModuleForm] = useState<ModuleForm>(EMPTY_MODULE_FORM)
  const [moduleError, setModuleError] = useState('')
  const [moduleSubmitting, setModuleSubmitting] = useState(false)

  const [materialOpen, setMaterialOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<TrainingMaterial | null>(null)
  const [materialForm, setMaterialForm] = useState<MaterialForm>(EMPTY_MATERIAL_FORM)
  const [materialError, setMaterialError] = useState('')
  const [materialSubmitting, setMaterialSubmitting] = useState(false)

  const [enrollOpen, setEnrollOpen] = useState(false)
  const [enrollForm, setEnrollForm] = useState<{ user_id: string; program_id: string }>({
    user_id: '',
    program_id: '',
  })
  const [enrollError, setEnrollError] = useState('')
  const [enrollSubmitting, setEnrollSubmitting] = useState(false)

  const [progressUpdating, setProgressUpdating] = useState<number | null>(null)

  const loadPrograms = useCallback(async () => {
    setProgramsLoading(true)
    try {
      const data = await listPrograms({ limit: 200 })
      setPrograms(data)
    } catch (err) {
      setError(extractErrorMessage(err, t('training.loadFailed')))
    } finally {
      setProgramsLoading(false)
    }
  }, [t])

  const loadModules = useCallback(async (programId: number) => {
    setModulesLoading(true)
    try {
      const data = await listModules(programId)
      setModules(data)
    } catch {
      // non-blocking
    } finally {
      setModulesLoading(false)
    }
  }, [])

  const loadMaterials = useCallback(async (moduleId: number) => {
    setMaterialsLoading(true)
    try {
      const data = await listMaterials(moduleId)
      setMaterials(data)
    } catch {
      // non-blocking
    } finally {
      setMaterialsLoading(false)
    }
  }, [])

  const loadEnrollments = useCallback(async () => {
    setEnrollmentsLoading(true)
    try {
      const data = await listEnrollments()
      setEnrollments(data)
    } catch {
      // non-blocking
    } finally {
      setEnrollmentsLoading(false)
    }
  }, [])

  const loadUsers = useCallback(async () => {
    try {
      const data = await getUsers({ limit: 200 })
      setUsers(data)
    } catch {
      // non-blocking
    }
  }, [])

  useEffect(() => {
    loadPrograms()
    loadEnrollments()
    loadUsers()
  }, [loadPrograms, loadEnrollments, loadUsers])

  useEffect(() => {
    if (selectedProgram) {
      setModules([])
      setMaterials([])
      setSelectedModule(null)
      loadModules(selectedProgram.id)
    } else {
      setModules([])
      setMaterials([])
      setSelectedModule(null)
    }
  }, [selectedProgram, loadModules])

  useEffect(() => {
    if (selectedModule) {
      loadMaterials(selectedModule.id)
    } else {
      setMaterials([])
    }
  }, [selectedModule, loadMaterials])

  function openProgramCreate() {
    setEditingProgram(null)
    setProgramForm(EMPTY_PROGRAM_FORM)
    setProgramError('')
    setProgramOpen(true)
  }

  function openProgramEdit(program: TrainingProgram) {
    setEditingProgram(program)
    setProgramForm({
      title: program.title,
      description: program.description,
      is_active: program.is_active,
    })
    setProgramError('')
    setProgramOpen(true)
  }

  async function submitProgram(e: FormEvent) {
    e.preventDefault()
    setProgramError('')
    if (!programForm.title.trim()) {
      setProgramError(t('training.programs.validation'))
      return
    }
    setProgramSubmitting(true)
    try {
      if (editingProgram) {
        await updateProgram(editingProgram.id, {
          title: programForm.title.trim(),
          description: programForm.description,
          is_active: programForm.is_active,
        })
        setSuccess(t('training.programs.updateSuccess'))
      } else {
        await createProgram({
          title: programForm.title.trim(),
          description: programForm.description,
        })
        setSuccess(t('training.programs.createSuccess'))
      }
      setProgramOpen(false)
      await loadPrograms()
    } catch (err) {
      setProgramError(extractErrorMessage(err, t('common.error')))
    } finally {
      setProgramSubmitting(false)
    }
  }

  function openModuleCreate() {
    setEditingModule(null)
    setModuleForm({ ...EMPTY_MODULE_FORM, order: modules.length })
    setModuleError('')
    setModuleOpen(true)
  }

  function openModuleEdit(mod: TrainingModule) {
    setEditingModule(mod)
    setModuleForm({
      title: mod.title,
      description: mod.description,
      order: mod.order,
    })
    setModuleError('')
    setModuleOpen(true)
  }

  async function submitModule(e: FormEvent) {
    e.preventDefault()
    if (!selectedProgram) return
    setModuleError('')
    if (!moduleForm.title.trim()) {
      setModuleError(t('training.modules.validation'))
      return
    }
    setModuleSubmitting(true)
    try {
      if (editingModule) {
        await updateModule(editingModule.id, {
          title: moduleForm.title.trim(),
          description: moduleForm.description,
          order: moduleForm.order,
        })
        setSuccess(t('training.modules.updateSuccess'))
      } else {
        await createModule(selectedProgram.id, {
          title: moduleForm.title.trim(),
          description: moduleForm.description,
          order: moduleForm.order,
        })
        setSuccess(t('training.modules.createSuccess'))
      }
      setModuleOpen(false)
      await loadModules(selectedProgram.id)
    } catch (err) {
      setModuleError(extractErrorMessage(err, t('common.error')))
    } finally {
      setModuleSubmitting(false)
    }
  }

  function openMaterialCreate() {
    setEditingMaterial(null)
    setMaterialForm(EMPTY_MATERIAL_FORM)
    setMaterialError('')
    setMaterialOpen(true)
  }

  function openMaterialEdit(material: TrainingMaterial) {
    setEditingMaterial(material)
    setMaterialForm({
      title: material.title,
      content_type: material.content_type,
      url: material.url ?? '',
      content: material.content,
    })
    setMaterialError('')
    setMaterialOpen(true)
  }

  async function submitMaterial(e: FormEvent) {
    e.preventDefault()
    if (!selectedModule) return
    setMaterialError('')
    if (!materialForm.title.trim()) {
      setMaterialError(t('training.materials.validation'))
      return
    }
    setMaterialSubmitting(true)
    try {
      if (editingMaterial) {
        await updateMaterial(editingMaterial.id, {
          title: materialForm.title.trim(),
          content_type: materialForm.content_type,
          url: materialForm.url || null,
          content: materialForm.content,
        })
        setSuccess(t('training.materials.updateSuccess'))
      } else {
        await createMaterial(selectedModule.id, {
          title: materialForm.title.trim(),
          content_type: materialForm.content_type,
          url: materialForm.url || null,
          content: materialForm.content,
        })
        setSuccess(t('training.materials.createSuccess'))
      }
      setMaterialOpen(false)
      await loadMaterials(selectedModule.id)
    } catch (err) {
      setMaterialError(extractErrorMessage(err, t('common.error')))
    } finally {
      setMaterialSubmitting(false)
    }
  }

  function openEnroll() {
    setEnrollForm({
      user_id: users[0]?.id?.toString() ?? '',
      program_id: programs[0]?.id?.toString() ?? '',
    })
    setEnrollError('')
    setEnrollOpen(true)
  }

  async function submitEnroll(e: FormEvent) {
    e.preventDefault()
    setEnrollError('')
    if (!enrollForm.user_id || !enrollForm.program_id) {
      setEnrollError(t('training.enrollments.validation'))
      return
    }
    setEnrollSubmitting(true)
    try {
      await createEnrollment({
        user_id: Number(enrollForm.user_id),
        program_id: Number(enrollForm.program_id),
      })
      setSuccess(t('training.enrollments.createSuccess'))
      setEnrollOpen(false)
      await loadEnrollments()
    } catch (err) {
      setEnrollError(extractErrorMessage(err, t('common.error')))
    } finally {
      setEnrollSubmitting(false)
    }
  }

  async function updateProgress(enrollment: TrainingEnrollment, delta: number) {
    setProgressUpdating(enrollment.id)
    setError('')
    try {
      const next = Math.min(100, Math.max(0, enrollment.progress_pct + delta))
      const body: { progress_pct: number; completed_at?: string | null } = { progress_pct: next }
      if (next >= 100 && !enrollment.completed_at) {
        body.completed_at = new Date().toISOString()
      }
      if (next < 100 && enrollment.completed_at) {
        body.completed_at = null
      }
      await updateEnrollment(enrollment.id, body)
      await loadEnrollments()
    } catch (err) {
      setError(extractErrorMessage(err, t('common.error')))
    } finally {
      setProgressUpdating(null)
    }
  }

  const userMap = useMemo(() => {
    const map = new Map<number, User>()
    users.forEach((u) => map.set(u.id, u))
    return map
  }, [users])

  const programMap = useMemo(() => {
    const map = new Map<number, TrainingProgram>()
    programs.forEach((p) => map.set(p.id, p))
    return map
  }, [programs])

  const enrollmentColumns = useMemo<DataTableColumn<TrainingEnrollment>[]>(
    () => [
      {
        key: 'user',
        header: t('training.enrollments.columns.user'),
        render: (e) => {
          const user = userMap.get(e.user_id)
          return (
            <div className="min-w-0">
              <p className="font-medium text-ink-50 truncate">
                {user?.full_name ?? `#${e.user_id}`}
              </p>
              <p className="text-xs text-ink-300 truncate">{user?.email ?? ''}</p>
            </div>
          )
        },
      },
      {
        key: 'program',
        header: t('training.enrollments.columns.program'),
        render: (e) => {
          const program = programMap.get(e.program_id)
          return (
            <span className="text-sm text-ink-200">
              {program?.title ?? `#${e.program_id}`}
            </span>
          )
        },
      },
      {
        key: 'progress',
        header: t('training.enrollments.columns.progress'),
        render: (e) => (
          <div className="space-y-1">
            <div className="relative h-2 w-32 rounded-full bg-slate-200 overflow-hidden">
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 bg-brand-500/70"
                style={{ width: `${e.progress_pct}%` }}
              />
            </div>
            <p className="text-xs text-ink-300">{e.progress_pct}%</p>
          </div>
        ),
      },
      {
        key: 'completed',
        header: t('training.enrollments.columns.completed'),
        render: (e) =>
          e.completed_at ? (
            <Badge tone="success">{formatDateTime(e.completed_at)}</Badge>
          ) : (
            <Badge tone="neutral">{t('training.enrollments.inProgress')}</Badge>
          ),
      },
      {
        key: 'actions',
        header: t('common.actions'),
        align: 'right',
        render: (e) => (
          <div className="flex justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              loading={progressUpdating === e.id}
              disabled={e.progress_pct <= 0}
              onClick={() => updateProgress(e, -25)}
            >
              -25%
            </Button>
            <Button
              size="sm"
              variant="ghost"
              loading={progressUpdating === e.id}
              disabled={e.progress_pct >= 100}
              onClick={() => updateProgress(e, 25)}
            >
              +25%
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, userMap, programMap, progressUpdating]
  )

  const catalogTab = (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="lg:col-span-4 space-y-3">
        <GlassPanel>
          <header className="p-3 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink-50">{t('training.programs.title')}</h3>
            <Button size="sm" onClick={openProgramCreate}>
              {t('training.programs.create')}
            </Button>
          </header>
          {programsLoading ? (
            <div className="p-3">
              <LoadingState rows={3} />
            </div>
          ) : programs.length === 0 ? (
            <p className="p-3 text-sm text-ink-300">{t('training.programs.empty')}</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {programs.map((p) => {
                const selected = selectedProgram?.id === p.id
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedProgram(p)}
                      className={`w-full text-left p-3 transition-colors ${
                        selected ? 'bg-slate-100' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-ink-50 truncate">{p.title}</p>
                        <Badge tone={p.is_active ? 'success' : 'neutral'}>
                          {p.is_active ? t('common.active') : t('common.inactive')}
                        </Badge>
                      </div>
                      <p className="text-xs text-ink-300 line-clamp-2 mt-1">{p.description}</p>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </GlassPanel>
      </div>

      <div className="lg:col-span-4 space-y-3">
        <GlassPanel>
          <header className="p-3 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink-50">{t('training.modules.title')}</h3>
            <div className="flex items-center gap-2">
              {selectedProgram && (
                <Button size="sm" variant="ghost" onClick={() => openProgramEdit(selectedProgram)}>
                  {t('training.programs.edit')}
                </Button>
              )}
              <Button
                size="sm"
                onClick={openModuleCreate}
                disabled={!selectedProgram}
              >
                {t('training.modules.create')}
              </Button>
            </div>
          </header>
          {!selectedProgram ? (
            <p className="p-3 text-sm text-ink-300">{t('training.modules.selectProgram')}</p>
          ) : modulesLoading ? (
            <div className="p-3">
              <LoadingState rows={3} />
            </div>
          ) : modules.length === 0 ? (
            <p className="p-3 text-sm text-ink-300">{t('training.modules.empty')}</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {[...modules]
                .sort((a, b) => a.order - b.order)
                .map((m) => {
                  const selected = selectedModule?.id === m.id
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedModule(m)}
                        className={`w-full text-left p-3 transition-colors ${
                          selected ? 'bg-slate-100' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-ink-50 truncate">{m.title}</p>
                          <Badge tone="brand">#{m.order}</Badge>
                        </div>
                        <p className="text-xs text-ink-300 line-clamp-2 mt-1">{m.description}</p>
                      </button>
                    </li>
                  )
                })}
            </ul>
          )}
        </GlassPanel>
      </div>

      <div className="lg:col-span-4 space-y-3">
        <GlassPanel>
          <header className="p-3 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink-50">{t('training.materials.title')}</h3>
            <div className="flex items-center gap-2">
              {selectedModule && (
                <Button size="sm" variant="ghost" onClick={() => openModuleEdit(selectedModule)}>
                  {t('training.modules.edit')}
                </Button>
              )}
              <Button size="sm" onClick={openMaterialCreate} disabled={!selectedModule}>
                {t('training.materials.create')}
              </Button>
            </div>
          </header>
          {!selectedModule ? (
            <p className="p-3 text-sm text-ink-300">{t('training.materials.selectModule')}</p>
          ) : materialsLoading ? (
            <div className="p-3">
              <LoadingState rows={3} />
            </div>
          ) : materials.length === 0 ? (
            <p className="p-3 text-sm text-ink-300">{t('training.materials.empty')}</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {materials.map((mat) => (
                <li key={mat.id}>
                  <button
                    type="button"
                    onClick={() => openMaterialEdit(mat)}
                    className="w-full text-left p-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-ink-50 truncate">{mat.title}</p>
                      <Badge tone="info">{mat.content_type}</Badge>
                    </div>
                    {mat.url && (
                      <p className="text-xs text-ink-300 truncate mt-1">{mat.url}</p>
                    )}
                    {mat.content && (
                      <p className="text-xs text-ink-400 line-clamp-2 mt-1">{mat.content}</p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </GlassPanel>
      </div>
    </div>
  )

  const enrollmentsTab = (
    <div className="space-y-4">
      <GlassCard padded={false} className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-ink-300">{t('training.enrollments.description')}</div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={loadEnrollments}>
            {t('common.refresh')}
          </Button>
          <Button onClick={openEnroll} disabled={programs.length === 0 || users.length === 0}>
            {t('training.enrollments.create')}
          </Button>
        </div>
      </GlassCard>
      <GlassPanel>
        <DataTable<TrainingEnrollment>
          columns={enrollmentColumns}
          rows={enrollments}
          rowKey={(e) => e.id}
          loading={enrollmentsLoading}
          emptyTitle={t('training.enrollments.empty')}
          emptyDescription={t('training.enrollments.emptyHint')}
          emptyAction={
            <Button onClick={openEnroll}>{t('training.enrollments.create')}</Button>
          }
        />
      </GlassPanel>
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader title={t('training.title')} description={t('training.description')} />

      {error && <AlertBox tone="danger">{error}</AlertBox>}
      {success && <AlertBox tone="success">{success}</AlertBox>}

      <Tabs
        tabs={[
          { id: 'catalog', label: t('training.tabs.catalog'), content: catalogTab },
          { id: 'enrollments', label: t('training.tabs.enrollments'), content: enrollmentsTab },
        ]}
      />

      <Modal
        open={programOpen}
        onClose={() => setProgramOpen(false)}
        title={editingProgram ? t('training.programs.edit') : t('training.programs.create')}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setProgramOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submitProgram} loading={programSubmitting}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <form onSubmit={submitProgram} className="space-y-3">
          <Input
            label={t('training.programs.fields.title')}
            value={programForm.title}
            onChange={(e) => setProgramForm({ ...programForm, title: e.target.value })}
            required
          />
          <Textarea
            label={t('training.programs.fields.description')}
            value={programForm.description}
            onChange={(e) => setProgramForm({ ...programForm, description: e.target.value })}
            rows={3}
          />
          {editingProgram && (
            <label className="inline-flex items-center gap-2 text-sm text-ink-200">
              <input
                type="checkbox"
                checked={programForm.is_active}
                onChange={(e) =>
                  setProgramForm({ ...programForm, is_active: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300 bg-white"
              />
              {t('training.programs.fields.active')}
            </label>
          )}
          {programError && <AlertBox tone="danger">{programError}</AlertBox>}
        </form>
      </Modal>

      <Modal
        open={moduleOpen}
        onClose={() => setModuleOpen(false)}
        title={editingModule ? t('training.modules.edit') : t('training.modules.create')}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModuleOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submitModule} loading={moduleSubmitting}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <form onSubmit={submitModule} className="space-y-3">
          <Input
            label={t('training.modules.fields.title')}
            value={moduleForm.title}
            onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
            required
          />
          <Textarea
            label={t('training.modules.fields.description')}
            value={moduleForm.description}
            onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
            rows={3}
          />
          <Input
            label={t('training.modules.fields.order')}
            type="number"
            min={0}
            value={moduleForm.order.toString()}
            onChange={(e) =>
              setModuleForm({ ...moduleForm, order: Number(e.target.value) || 0 })
            }
          />
          {moduleError && <AlertBox tone="danger">{moduleError}</AlertBox>}
        </form>
      </Modal>

      <Modal
        open={materialOpen}
        onClose={() => setMaterialOpen(false)}
        title={editingMaterial ? t('training.materials.edit') : t('training.materials.create')}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setMaterialOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submitMaterial} loading={materialSubmitting}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <form onSubmit={submitMaterial} className="space-y-3">
          <Input
            label={t('training.materials.fields.title')}
            value={materialForm.title}
            onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
            required
          />
          <div className="grid gap-3 md:grid-cols-2">
            <Select
              label={t('training.materials.fields.contentType')}
              value={materialForm.content_type}
              onChange={(e) =>
                setMaterialForm({ ...materialForm, content_type: e.target.value })
              }
              options={CONTENT_TYPES.map((c) => ({ value: c, label: c }))}
            />
            <Input
              label={t('training.materials.fields.url')}
              value={materialForm.url}
              onChange={(e) => setMaterialForm({ ...materialForm, url: e.target.value })}
              placeholder="https://"
            />
          </div>
          <Textarea
            label={t('training.materials.fields.content')}
            value={materialForm.content}
            onChange={(e) => setMaterialForm({ ...materialForm, content: e.target.value })}
            rows={5}
          />
          {materialError && <AlertBox tone="danger">{materialError}</AlertBox>}
        </form>
      </Modal>

      <Modal
        open={enrollOpen}
        onClose={() => setEnrollOpen(false)}
        title={t('training.enrollments.create')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEnrollOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submitEnroll} loading={enrollSubmitting}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <form onSubmit={submitEnroll} className="space-y-3">
          <Select
            label={t('training.enrollments.fields.user')}
            value={enrollForm.user_id}
            onChange={(e) => setEnrollForm({ ...enrollForm, user_id: e.target.value })}
            options={users.map((u) => ({
              value: u.id.toString(),
              label: `${u.full_name} (${u.email})`,
            }))}
            placeholder={t('training.enrollments.fields.userPlaceholder')}
            required
          />
          <Select
            label={t('training.enrollments.fields.program')}
            value={enrollForm.program_id}
            onChange={(e) => setEnrollForm({ ...enrollForm, program_id: e.target.value })}
            options={programs.map((p) => ({
              value: p.id.toString(),
              label: p.title,
            }))}
            placeholder={t('training.enrollments.fields.programPlaceholder')}
            required
          />
          {enrollError && <AlertBox tone="danger">{enrollError}</AlertBox>}
        </form>
      </Modal>
    </div>
  )
}
