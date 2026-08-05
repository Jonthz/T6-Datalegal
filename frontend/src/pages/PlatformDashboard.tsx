import { Link } from 'react-router-dom'
import { Building2, CheckCircle2, FilePlus2, KeyRound } from 'lucide-react'
import {
  Badge,
  DataTable,
  ErrorState,
  GlassPanel,
  KPICard,
  LoadingState,
  PageHeader,
} from '../components/ui'
import type { DataTableColumn } from '../components/ui'
import { useEffect, useMemo, useState } from 'react'
import { listTenants } from '../api/tenants'
import type { Tenant } from '../types'
import { formatDate } from '../lib/format'
import { extractErrorMessage } from '../lib/errors'

export default function PlatformDashboardPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const rows = await listTenants()
        if (!cancelled) setTenants(rows)
      } catch (err) {
        if (!cancelled) setError(extractErrorMessage(err, 'Could not load platform tenants.'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const activeTenants = tenants.filter((tenant) => tenant.is_active).length
  const inactiveTenants = tenants.length - activeTenants
  const countries = new Set(tenants.map((tenant) => tenant.country).filter(Boolean)).size

  const recentTenants = useMemo(() => {
    return [...tenants]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6)
  }, [tenants])

  const columns = useMemo<DataTableColumn<Tenant>[]>(
    () => [
      {
        key: 'tenant',
        header: 'Tenant',
        render: (tenant) => (
          <div className="min-w-0">
            <p className="font-medium text-ink-50 truncate">{tenant.name}</p>
            <p className="text-xs text-ink-400 truncate">{tenant.ruc}</p>
          </div>
        ),
      },
      {
        key: 'country',
        header: 'Country',
        render: (tenant) => <span className="text-ink-100">{tenant.country}</span>,
      },
      {
        key: 'sector',
        header: 'Sector',
        render: (tenant) =>
          tenant.sector ? <Badge tone="brand">{tenant.sector}</Badge> : <span>-</span>,
      },
      {
        key: 'status',
        header: 'Status',
        render: (tenant) => (
          <Badge tone={tenant.is_active ? 'success' : 'neutral'}>
            {tenant.is_active ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
      {
        key: 'created',
        header: 'Created',
        render: (tenant) => <span className="text-xs text-ink-300">{formatDate(tenant.created_at)}</span>,
      },
    ],
    []
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform console"
        description="Global DataLegal operations for tenant provisioning and platform oversight."
        actions={
          <Link
            to="/tenants"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand-700 px-4 text-sm font-semibold text-white shadow-glass transition-colors hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:ring-offset-1"
          >
            <FilePlus2 aria-hidden className="h-4 w-4" />
            Manage tenants
          </Link>
        }
      />

      {error && !loading && <ErrorState title="Platform data unavailable" description={error} />}

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          loading={loading}
          label="Total tenants"
          value={tenants.length}
          hint="Provisioned workspaces"
          icon={<Building2 className="h-5 w-5" />}
        />
        <KPICard
          loading={loading}
          label="Active tenants"
          value={activeTenants}
          hint={`${inactiveTenants} inactive`}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <KPICard
          loading={loading}
          label="Countries"
          value={countries}
          hint="Operational footprint"
          icon={<KeyRound className="h-5 w-5" />}
        />
      </section>

      <GlassPanel>
        <header className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink-50">Recent tenants</h2>
            <p className="text-xs text-ink-300 mt-0.5">Newest client workspaces on the platform.</p>
          </div>
          <Link to="/tenants" className="text-xs font-semibold text-brand-700 hover:text-brand-800">
            View all
          </Link>
        </header>
        {loading ? (
          <div className="p-5">
            <LoadingState rows={4} />
          </div>
        ) : (
          <DataTable<Tenant>
            columns={columns}
            rows={recentTenants}
            rowKey={(tenant) => tenant.id}
            emptyTitle="No tenants"
            emptyDescription="Provision the first client tenant from the tenant console."
          />
        )}
      </GlassPanel>
    </div>
  )
}
