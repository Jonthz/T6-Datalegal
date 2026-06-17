import { lazy } from 'react'
import type { ComponentType } from 'react'
import type { Role } from '../types'

// Note: ModulePlaceholder and `pages/placeholders/index.tsx` remain on disk as a
// historical reference of which modules shipped placeholders pre-Sprint 10. No
// route wires them — every protected route below resolves to a real page.

export interface RouteDef {
  path: string
  Component: ComponentType
  roles?: Role[]
  /** Render outside the AppShell (e.g. login). */
  unauthenticated?: boolean
}

const Login = lazy(() => import('../pages/Login'))
const MFAVerify = lazy(() => import('../pages/MFAVerify'))
const MFASetup = lazy(() => import('../pages/MFASetup'))
const Dashboard = lazy(() => import('../pages/Dashboard'))
const Users = lazy(() => import('../pages/UserManagement'))
const Alerts = lazy(() => import('../pages/Alerts'))

// Sprint 7 — Organization + Data Inventory pages (real, not placeholders).
const Departments = lazy(() => import('../pages/Departments'))
const CompanyProfile = lazy(() => import('../pages/CompanyProfile'))
const Tenants = lazy(() => import('../pages/Tenants'))
const Sectors = lazy(() => import('../pages/Sectors'))
const Catalogs = lazy(() => import('../pages/Catalogs'))
const DataInventory = lazy(() => import('../pages/DataInventory'))
const TreatmentActivities = lazy(() => import('../pages/TreatmentActivities'))
const InformationAssets = lazy(() => import('../pages/InformationAssets'))
const Retention = lazy(() => import('../pages/Retention'))
const ImportExport = lazy(() => import('../pages/ImportExport'))

// Sprint 8 — Risk, DPIA, ARCO, Incidents, Portability (real pages).
const RiskAssessments = lazy(() => import('../pages/RiskAssessments'))
const DPIAs = lazy(() => import('../pages/DPIAs'))
const ARCO = lazy(() => import('../pages/ARCO'))
const Incidents = lazy(() => import('../pages/Incidents'))
const Portability = lazy(() => import('../pages/Portability'))

// Sprint 9 — Documents + transversal operations pages (real, not placeholders).
const Consents = lazy(() => import('../pages/Consents'))
const LegalDocuments = lazy(() => import('../pages/LegalDocuments'))
const ROPA = lazy(() => import('../pages/ROPA'))
const ActionPlans = lazy(() => import('../pages/ActionPlans'))
const AuditPlans = lazy(() => import('../pages/AuditPlans'))
const Remediations = lazy(() => import('../pages/Remediations'))
const Reports = lazy(() => import('../pages/Reports'))
const AuditLog = lazy(() => import('../pages/AuditLog'))
const Training = lazy(() => import('../pages/Training'))
const Backups = lazy(() => import('../pages/Backups'))

// Sprint 10 — Final polish: real settings page (replaces ModulePlaceholder).
const Settings = lazy(() => import('../pages/Settings'))

export const PUBLIC_ROUTES: RouteDef[] = [
  { path: '/login', Component: Login, unauthenticated: true },
  { path: '/mfa-verify', Component: MFAVerify, unauthenticated: true },
]

export const PROTECTED_ROUTES: RouteDef[] = [
  { path: '/mfa-setup', Component: MFASetup },
  { path: '/dashboard', Component: Dashboard },
  { path: '/alerts', Component: Alerts },
  {
    path: '/reports',
    Component: Reports,
    roles: ['SUPER_ADMIN', 'DPO', 'ADMIN', 'DEPT_HEAD', 'AUDITOR'],
  },
  { path: '/users', Component: Users, roles: ['SUPER_ADMIN', 'DPO', 'ADMIN'] },
  {
    path: '/departments',
    Component: Departments,
    roles: ['SUPER_ADMIN', 'DPO', 'ADMIN'],
  },
  {
    path: '/company-profile',
    Component: CompanyProfile,
    roles: ['SUPER_ADMIN', 'DPO', 'ADMIN'],
  },
  {
    path: '/catalogs',
    Component: Catalogs,
    roles: ['SUPER_ADMIN', 'DPO', 'ADMIN'],
  },
  {
    path: '/sectors',
    Component: Sectors,
    roles: ['SUPER_ADMIN', 'DPO', 'ADMIN'],
  },
  {
    path: '/tenants',
    Component: Tenants,
    roles: ['SUPER_ADMIN'],
  },
  {
    path: '/data-inventory',
    Component: DataInventory,
    roles: ['SUPER_ADMIN', 'DPO', 'ADMIN', 'DEPT_HEAD'],
  },
  {
    path: '/treatment-activities',
    Component: TreatmentActivities,
    roles: ['SUPER_ADMIN', 'DPO', 'ADMIN', 'DEPT_HEAD'],
  },
  {
    path: '/information-assets',
    Component: InformationAssets,
    roles: ['SUPER_ADMIN', 'DPO', 'ADMIN', 'DEPT_HEAD'],
  },
  {
    path: '/retention',
    Component: Retention,
    roles: ['SUPER_ADMIN', 'DPO', 'ADMIN'],
  },
  {
    path: '/import-export',
    Component: ImportExport,
    roles: ['SUPER_ADMIN', 'DPO', 'ADMIN'],
  },
  {
    path: '/risk-assessments',
    Component: RiskAssessments,
    roles: ['SUPER_ADMIN', 'DPO', 'ADMIN', 'DEPT_HEAD'],
  },
  {
    path: '/dpias',
    Component: DPIAs,
    roles: ['SUPER_ADMIN', 'DPO'],
  },
  {
    path: '/arco',
    Component: ARCO,
    roles: ['SUPER_ADMIN', 'DPO', 'ADMIN'],
  },
  {
    path: '/portability',
    Component: Portability,
    roles: ['SUPER_ADMIN', 'DPO', 'ADMIN'],
  },
  {
    path: '/incidents',
    Component: Incidents,
    roles: ['SUPER_ADMIN', 'DPO', 'ADMIN', 'DEPT_HEAD'],
  },
  {
    path: '/consents',
    Component: Consents,
    roles: ['SUPER_ADMIN', 'DPO', 'ADMIN'],
  },
  {
    path: '/legal-documents',
    Component: LegalDocuments,
    roles: ['SUPER_ADMIN', 'DPO', 'ADMIN'],
  },
  {
    path: '/ropa',
    Component: ROPA,
    roles: ['SUPER_ADMIN', 'DPO', 'ADMIN', 'AUDITOR'],
  },
  {
    path: '/action-plans',
    Component: ActionPlans,
    roles: ['SUPER_ADMIN', 'DPO', 'ADMIN', 'DEPT_HEAD'],
  },
  {
    path: '/audit-plans',
    Component: AuditPlans,
    roles: ['SUPER_ADMIN', 'DPO', 'AUDITOR'],
  },
  {
    path: '/remediations',
    Component: Remediations,
    roles: ['SUPER_ADMIN', 'DPO', 'ADMIN', 'DEPT_HEAD'],
  },
  {
    path: '/audit-log',
    Component: AuditLog,
    roles: ['SUPER_ADMIN', 'DPO', 'AUDITOR'],
  },
  { path: '/training', Component: Training },
  {
    path: '/backups',
    Component: Backups,
    roles: ['SUPER_ADMIN'],
  },
  { path: '/settings', Component: Settings },
]
