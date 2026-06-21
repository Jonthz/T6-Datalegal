import ModulePlaceholder from './ModulePlaceholder'

/* Placeholders for modules whose UI ships in Sprints 7-9.
   Endpoints below mirror the live backend, so a curious user
   can verify the API exists by visiting /api/docs. */

export const DepartmentsPlaceholder = () => (
  <ModulePlaceholder
    i18nKey="placeholder.modules.departments"
    scheduledFor="Sprint 7"
    endpoints={[
      { method: 'GET', path: '/api/v1/departments' },
      { method: 'POST', path: '/api/v1/departments' },
      { method: 'PUT', path: '/api/v1/departments/{id}' },
      { method: 'DELETE', path: '/api/v1/departments/{id}' },
    ]}
  />
)

export const CompanyProfilePlaceholder = () => (
  <ModulePlaceholder
    i18nKey="placeholder.modules.companyProfile"
    scheduledFor="Sprint 7"
    endpoints={[
      { method: 'GET', path: '/api/v1/company-profile' },
      { method: 'PUT', path: '/api/v1/company-profile' },
    ]}
  />
)

export const TenantsPlaceholder = () => (
  <ModulePlaceholder
    i18nKey="placeholder.modules.tenants"
    scheduledFor="Sprint 7"
    endpoints={[
      { method: 'GET', path: '/api/v1/tenants' },
      { method: 'POST', path: '/api/v1/tenants/provision' },
    ]}
  />
)

export const CatalogsPlaceholder = () => (
  <ModulePlaceholder
    i18nKey="placeholder.modules.catalogs"
    scheduledFor="Sprint 7"
    endpoints={[
      { method: 'GET', path: '/api/v1/catalogs' },
      { method: 'GET', path: '/api/v1/catalogs/{type}' },
      { method: 'POST', path: '/api/v1/catalogs/bulk-load' },
      { method: 'PATCH', path: '/api/v1/catalogs/{id}' },
      { method: 'DELETE', path: '/api/v1/catalogs/{id}' },
    ]}
  />
)

export const DataInventoryPlaceholder = () => (
  <ModulePlaceholder
    i18nKey="placeholder.modules.dataInventory"
    scheduledFor="Sprint 7"
    endpoints={[{ method: 'GET', path: '/api/v1/data-inventory/progress' }]}
  />
)

export const TreatmentActivitiesPlaceholder = () => (
  <ModulePlaceholder
    i18nKey="placeholder.modules.treatmentActivities"
    scheduledFor="Sprint 7"
    endpoints={[
      { method: 'GET', path: '/api/v1/treatment-activities' },
      { method: 'POST', path: '/api/v1/treatment-activities' },
      { method: 'POST', path: '/api/v1/treatment-activities/wizard/start' },
      { method: 'PATCH', path: '/api/v1/treatment-activities/wizard/{id}/legal-basis' },
      { method: 'PATCH', path: '/api/v1/treatment-activities/wizard/{id}/transfers' },
      { method: 'POST', path: '/api/v1/treatment-activities/wizard/{id}/finalize' },
    ]}
  />
)

export const InformationAssetsPlaceholder = () => (
  <ModulePlaceholder
    i18nKey="placeholder.modules.informationAssets"
    scheduledFor="Sprint 7"
    endpoints={[
      { method: 'GET', path: '/api/v1/information-assets' },
      { method: 'POST', path: '/api/v1/information-assets' },
      { method: 'PATCH', path: '/api/v1/information-assets/{id}' },
    ]}
  />
)

export const RetentionPlaceholder = () => (
  <ModulePlaceholder
    i18nKey="placeholder.modules.retention"
    scheduledFor="Sprint 7"
    endpoints={[
      { method: 'GET', path: '/api/v1/retention/policies' },
      { method: 'GET', path: '/api/v1/retention/records' },
      { method: 'GET', path: '/api/v1/retention/expired-under-review' },
      { method: 'POST', path: '/api/v1/retention/execute' },
      { method: 'GET', path: '/api/v1/retention/execution-logs' },
    ]}
  />
)

export const ImportExportPlaceholder = () => (
  <ModulePlaceholder
    i18nKey="placeholder.modules.importExport"
    scheduledFor="Sprint 7"
    endpoints={[
      { method: 'POST', path: '/api/v1/import/treatment-activities' },
      { method: 'GET', path: '/api/v1/export/treatment-activities' },
      { method: 'GET', path: '/api/v1/export/compliance-report' },
    ]}
  />
)

export const RiskAssessmentsPlaceholder = () => (
  <ModulePlaceholder
    i18nKey="placeholder.modules.riskAssessments"
    scheduledFor="Sprint 8"
    endpoints={[
      { method: 'GET', path: '/api/v1/risk-assessments/questionnaire' },
      { method: 'GET', path: '/api/v1/risk-assessments/dashboard' },
      { method: 'GET', path: '/api/v1/risk-assessments' },
      { method: 'POST', path: '/api/v1/risk-assessments' },
      { method: 'PATCH', path: '/api/v1/risk-assessments/{id}' },
    ]}
  />
)

export const DPIAsPlaceholder = () => (
  <ModulePlaceholder
    i18nKey="placeholder.modules.dpias"
    scheduledFor="Sprint 8"
    endpoints={[
      { method: 'GET', path: '/api/v1/dpias' },
      { method: 'POST', path: '/api/v1/dpias' },
      { method: 'POST', path: '/api/v1/dpias/{id}/sign' },
      { method: 'GET', path: '/api/v1/dpias/{id}/pdf' },
    ]}
  />
)

export const ARCOPlaceholder = () => (
  <ModulePlaceholder
    i18nKey="placeholder.modules.arco"
    scheduledFor="Sprint 8"
    endpoints={[
      { method: 'GET', path: '/api/v1/arco-requests/dashboard' },
      { method: 'GET', path: '/api/v1/arco-requests' },
      { method: 'POST', path: '/api/v1/arco-requests' },
      { method: 'PATCH', path: '/api/v1/arco-requests/{id}' },
      { method: 'GET', path: '/api/v1/arco-requests/{id}/sla-status' },
    ]}
  />
)

export const PortabilityPlaceholder = () => (
  <ModulePlaceholder
    i18nKey="placeholder.modules.portability"
    scheduledFor="Sprint 8"
    endpoints={[
      { method: 'GET', path: '/api/v1/portability' },
      { method: 'POST', path: '/api/v1/portability' },
      { method: 'PUT', path: '/api/v1/portability/{id}/complete' },
      { method: 'GET', path: '/api/v1/portability/{id}/export' },
    ]}
  />
)

export const IncidentsPlaceholder = () => (
  <ModulePlaceholder
    i18nKey="placeholder.modules.incidents"
    scheduledFor="Sprint 8"
    endpoints={[
      { method: 'GET', path: '/api/v1/incidents' },
      { method: 'POST', path: '/api/v1/incidents' },
      { method: 'PATCH', path: '/api/v1/incidents/{id}' },
      { method: 'POST', path: '/api/v1/incidents/{id}/notify' },
    ]}
  />
)

export const ConsentsPlaceholder = () => (
  <ModulePlaceholder
    i18nKey="placeholder.modules.consents"
    scheduledFor="Sprint 9"
    endpoints={[
      { method: 'GET', path: '/api/v1/consents' },
      { method: 'POST', path: '/api/v1/consents' },
      { method: 'POST', path: '/api/v1/consents/{id}/revoke' },
      { method: 'GET', path: '/api/v1/cookie-banners' },
      { method: 'POST', path: '/api/v1/cookie-banners' },
      { method: 'POST', path: '/api/v1/cookie-consents' },
    ]}
  />
)

export const LegalDocumentsPlaceholder = () => (
  <ModulePlaceholder
    i18nKey="placeholder.modules.legalDocuments"
    scheduledFor="Sprint 9"
    endpoints={[
      { method: 'GET', path: '/api/v1/legal-documents/template-types' },
      { method: 'GET', path: '/api/v1/legal-documents' },
      { method: 'POST', path: '/api/v1/legal-documents' },
      { method: 'GET', path: '/api/v1/legal-documents/{id}/pdf' },
    ]}
  />
)

export const ROPAPlaceholder = () => (
  <ModulePlaceholder
    i18nKey="placeholder.modules.ropa"
    scheduledFor="Sprint 9"
    endpoints={[
      { method: 'GET', path: '/api/v1/ropa' },
      { method: 'GET', path: '/api/v1/ropa/pdf' },
    ]}
  />
)

export const ActionPlansPlaceholder = () => (
  <ModulePlaceholder
    i18nKey="placeholder.modules.actionPlans"
    scheduledFor="Sprint 9"
    endpoints={[
      { method: 'GET', path: '/api/v1/action-plans' },
      { method: 'POST', path: '/api/v1/action-plans' },
      { method: 'POST', path: '/api/v1/action-plans/auto-generate' },
      { method: 'GET', path: '/api/v1/action-plans/templates' },
    ]}
  />
)

export const AuditPlansPlaceholder = () => (
  <ModulePlaceholder
    i18nKey="placeholder.modules.auditPlans"
    scheduledFor="Sprint 9"
    endpoints={[
      { method: 'GET', path: '/api/v1/audit-plans' },
      { method: 'POST', path: '/api/v1/audit-plans' },
      { method: 'POST', path: '/api/v1/audit-plans/findings' },
      { method: 'GET', path: '/api/v1/audit-plans/{id}/report' },
    ]}
  />
)

export const RemediationsPlaceholder = () => (
  <ModulePlaceholder
    i18nKey="placeholder.modules.remediations"
    scheduledFor="Sprint 9"
    endpoints={[
      { method: 'GET', path: '/api/v1/remediations' },
      { method: 'POST', path: '/api/v1/remediations' },
      { method: 'PATCH', path: '/api/v1/remediations/{id}' },
    ]}
  />
)

export const ReportsPlaceholder = () => (
  <ModulePlaceholder
    i18nKey="placeholder.modules.reports"
    scheduledFor="Sprint 9"
    endpoints={[
      { method: 'GET', path: '/api/v1/reports/kpis' },
      { method: 'GET', path: '/api/v1/reports/trends' },
      { method: 'GET', path: '/api/v1/reports/summary' },
      { method: 'GET', path: '/api/v1/reports/summary/pdf' },
      { method: 'GET', path: '/api/v1/reports/summary/csv' },
    ]}
  />
)

export const AuditLogPlaceholder = () => (
  <ModulePlaceholder
    i18nKey="placeholder.modules.auditLog"
    scheduledFor="Sprint 9"
    endpoints={[
      { method: 'GET', path: '/api/v1/audit' },
      { method: 'GET', path: '/api/v1/audit/export' },
    ]}
  />
)

export const TrainingPlaceholder = () => (
  <ModulePlaceholder
    i18nKey="placeholder.modules.training"
    scheduledFor="Sprint 9"
    endpoints={[
      { method: 'GET', path: '/api/v1/training/programs' },
      { method: 'POST', path: '/api/v1/training/programs' },
      { method: 'GET', path: '/api/v1/training/enrollments' },
    ]}
  />
)

export const BackupsPlaceholder = () => (
  <ModulePlaceholder
    i18nKey="placeholder.modules.backups"
    scheduledFor="Sprint 9"
    notes="POST /backups/create requires SUPER_ADMIN when DATABASE_URL is SQLite (cross-tenant snapshot)."
    endpoints={[
      { method: 'GET', path: '/api/v1/backups' },
      { method: 'POST', path: '/api/v1/backups/create' },
      { method: 'POST', path: '/api/v1/backups/{id}/verify' },
    ]}
  />
)

export const SettingsPlaceholder = () => (
  <ModulePlaceholder
    i18nKey="placeholder.modules.settings"
    scheduledFor="Sprint 10"
  />
)

export const AlertsPlaceholder = () => (
  <ModulePlaceholder
    i18nKey="placeholder.modules.reports"
    scheduledFor="Sprint 9"
    endpoints={[
      { method: 'GET', path: '/api/v1/alerts' },
      { method: 'GET', path: '/api/v1/alerts/unread-count' },
      { method: 'PATCH', path: '/api/v1/alerts/{id}/read' },
      { method: 'DELETE', path: '/api/v1/alerts/{id}' },
    ]}
  />
)
