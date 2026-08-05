import type { AccountScope, PlatformPermission, Role } from '../types'

export interface NavItem {
  id: string
  path: string
  labelKey: string
  /** When omitted, route is visible to every authenticated user. */
  roles?: Role[]
  accountScopes?: AccountScope[]
  platformPermissions?: PlatformPermission[]
  /** Hide from the sidebar but still register the route. */
  hidden?: boolean
}

export interface NavGroup {
  id: string
  labelKey: string
  items: NavItem[]
}

/** Sidebar navigation tree. Renders top-down in the order declared here. */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'overview',
    labelKey: 'nav.groups.overview',
    items: [
      {
        id: 'platform',
        path: '/platform',
        labelKey: 'nav.platform',
        accountScopes: ['PLATFORM'],
        platformPermissions: ['tenants:read'],
      },
      { id: 'dashboard', path: '/dashboard', labelKey: 'nav.dashboard' },
      {
        id: 'alerts',
        path: '/alerts',
        labelKey: 'nav.alerts',
      },
      {
        id: 'reports',
        path: '/reports',
        labelKey: 'nav.reports',
        roles: ['SUPER_ADMIN', 'DPO', 'ADMIN', 'DEPT_HEAD', 'AUDITOR'],
      },
    ],
  },
  {
    id: 'organization',
    labelKey: 'nav.groups.organization',
    items: [
      {
        id: 'company-profile',
        path: '/company-profile',
        labelKey: 'nav.companyProfile',
        roles: ['SUPER_ADMIN', 'DPO', 'ADMIN'],
      },
      {
        id: 'users',
        path: '/users',
        labelKey: 'nav.users',
        roles: ['SUPER_ADMIN', 'DPO', 'ADMIN'],
      },
      {
        id: 'departments',
        path: '/departments',
        labelKey: 'nav.departments',
        roles: ['SUPER_ADMIN', 'DPO', 'ADMIN'],
      },
      {
        id: 'catalogs',
        path: '/catalogs',
        labelKey: 'nav.catalogs',
        roles: ['SUPER_ADMIN', 'DPO', 'ADMIN'],
      },
      {
        id: 'sectors',
        path: '/sectors',
        labelKey: 'nav.sectors',
        roles: ['SUPER_ADMIN', 'DPO', 'ADMIN'],
      },
      {
        id: 'tenants',
        path: '/tenants',
        labelKey: 'nav.tenants',
        accountScopes: ['PLATFORM'],
        platformPermissions: ['tenants:read'],
      },
    ],
  },
  {
    id: 'data-registry',
    labelKey: 'nav.groups.dataRegistry',
    items: [
      {
        id: 'data-inventory',
        path: '/data-inventory',
        labelKey: 'nav.dataInventory',
        roles: ['SUPER_ADMIN', 'DPO', 'ADMIN', 'DEPT_HEAD'],
      },
      {
        id: 'treatment-activities',
        path: '/treatment-activities',
        labelKey: 'nav.treatmentActivities',
        roles: ['SUPER_ADMIN', 'DPO', 'ADMIN', 'DEPT_HEAD'],
      },
      {
        id: 'information-assets',
        path: '/information-assets',
        labelKey: 'nav.informationAssets',
        roles: ['SUPER_ADMIN', 'DPO', 'ADMIN', 'DEPT_HEAD'],
      },
      {
        id: 'retention',
        path: '/retention',
        labelKey: 'nav.retention',
        roles: ['SUPER_ADMIN', 'DPO', 'ADMIN'],
      },
      {
        id: 'import-export',
        path: '/import-export',
        labelKey: 'nav.importExport',
        roles: ['SUPER_ADMIN', 'DPO', 'ADMIN'],
      },
    ],
  },
  {
    id: 'risk',
    labelKey: 'nav.groups.risk',
    items: [
      {
        id: 'risk-assessments',
        path: '/risk-assessments',
        labelKey: 'nav.riskAssessments',
        roles: ['SUPER_ADMIN', 'DPO', 'ADMIN', 'DEPT_HEAD'],
      },
      {
        id: 'dpias',
        path: '/dpias',
        labelKey: 'nav.dpias',
        roles: ['SUPER_ADMIN', 'DPO'],
      },
    ],
  },
  {
    id: 'rights',
    labelKey: 'nav.groups.rights',
    items: [
      {
        id: 'arco',
        path: '/arco',
        labelKey: 'nav.arco',
        roles: ['SUPER_ADMIN', 'DPO', 'ADMIN'],
      },
      {
        id: 'portability',
        path: '/portability',
        labelKey: 'nav.portability',
        roles: ['SUPER_ADMIN', 'DPO', 'ADMIN'],
      },
      {
        id: 'incidents',
        path: '/incidents',
        labelKey: 'nav.incidents',
        roles: ['SUPER_ADMIN', 'DPO', 'ADMIN', 'DEPT_HEAD'],
      },
      {
        id: 'consents',
        path: '/consents',
        labelKey: 'nav.consents',
        roles: ['SUPER_ADMIN', 'DPO', 'ADMIN'],
      },
    ],
  },
  {
    id: 'documents',
    labelKey: 'nav.groups.documents',
    items: [
      {
        id: 'legal-documents',
        path: '/legal-documents',
        labelKey: 'nav.legalDocuments',
        roles: ['SUPER_ADMIN', 'DPO', 'ADMIN'],
      },
      {
        id: 'ropa',
        path: '/ropa',
        labelKey: 'nav.ropa',
        roles: ['SUPER_ADMIN', 'DPO', 'ADMIN', 'AUDITOR'],
      },
    ],
  },
  {
    id: 'operations',
    labelKey: 'nav.groups.operations',
    items: [
      {
        id: 'action-plans',
        path: '/action-plans',
        labelKey: 'nav.actionPlans',
        roles: ['SUPER_ADMIN', 'DPO', 'ADMIN', 'DEPT_HEAD'],
      },
      {
        id: 'audit-plans',
        path: '/audit-plans',
        labelKey: 'nav.auditPlans',
        roles: ['SUPER_ADMIN', 'DPO', 'AUDITOR'],
      },
      {
        id: 'remediations',
        path: '/remediations',
        labelKey: 'nav.remediations',
        roles: ['SUPER_ADMIN', 'DPO', 'ADMIN', 'DEPT_HEAD'],
      },
    ],
  },
  {
    id: 'transversal',
    labelKey: 'nav.groups.transversal',
    items: [
      {
        id: 'audit-log',
        path: '/audit-log',
        labelKey: 'nav.auditLog',
        roles: ['SUPER_ADMIN', 'DPO', 'AUDITOR'],
      },
      {
        id: 'training',
        path: '/training',
        labelKey: 'nav.training',
      },
      {
        id: 'backups',
        path: '/backups',
        labelKey: 'nav.backups',
        roles: ['SUPER_ADMIN'],
      },
      {
        id: 'settings',
        path: '/settings',
        labelKey: 'nav.settings',
      },
    ],
  },
]

const ROUTE_LABELS = new Map<string, string>()
NAV_GROUPS.forEach((g) => g.items.forEach((i) => ROUTE_LABELS.set(i.path, i.labelKey)))

export function getNavLabelKey(path: string): string | undefined {
  return ROUTE_LABELS.get(path)
}
