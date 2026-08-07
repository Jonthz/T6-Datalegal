export type {
  AccountScope,
  PlatformPermission,
  Role,
  AuthState,
  TokenResponse,
  MFAPendingResponse,
  MFASetupResponse,
} from './auth'
export type {
  User,
  Tenant,
  TenantProvisionRequest,
  Department,
  CatalogEntry,
  SectorSuggestions,
} from './organization'
export type {
  TreatmentActivity,
  InformationAsset,
  RetentionPolicy,
  RetentionRecord,
  RetentionExecutionLog,
  ExpiredUnderReviewReport,
  DataInventoryProgress,
  TreatmentActivityProgress,
} from './dataRegistry'
export type {
  QuestionnaireQuestion,
  QuestionnaireSchema,
  RiskAssessment,
  RiskDashboard,
  RiskDashboardHighRiskItem,
  DPIA,
} from './risk'
export type {
  ARCORequest,
  ARCODashboard,
  ARCOSLAStatus,
  Incident,
  PortabilityRequest,
  PortabilityExport,
  ConsentRecord,
  CookieBanner,
  CookieConsent,
  ConsentStats,
} from './rights'
export type { LegalDocument, TemplateTypeInfo, ROPAReport, ROPAActivity } from './documents'
export type {
  ActionPlan,
  ActionPlanTask,
  ActionPlanTemplate,
  AuditPlan,
  AuditFinding,
  Remediation,
} from './operations'
export type {
  Alert,
  AuditLog,
  BackupRecord,
  BackupVerifyResult,
  TrainingProgram,
  TrainingModule,
  TrainingMaterial,
  TrainingEnrollment,
  ReportKPIs,
  ReportKPIAlerts,
  ReportTrendPoint,
  ReportTrends,
  RiskSummary,
  ARCOSummary,
  IncidentSummary,
  ActionPlanSummary,
  AuditSummary,
  ConsentSummary,
  ConsolidatedSummaryReport,
} from './transversal'
