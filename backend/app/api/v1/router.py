from fastapi import APIRouter

from app.api.v1 import (
    action_plans,
    alerts,
    arco,
    audit,
    audit_plans,
    auth,
    backups,
    catalogs,
    company_profile,
    consents,
    data_inventory,
    departments,
    dpia,
    import_export,
    incidents,
    information_assets,
    legal_documents,
    portability,
    remediations,
    reports,
    retention,
    risk_assessments,
    ropa,
    sectors,
    tenants,
    training,
    treatment_activities,
    users,
)

api_router = APIRouter()

# Sprint 1
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(departments.router)
api_router.include_router(tenants.router)
api_router.include_router(catalogs.router)
api_router.include_router(training.router)
api_router.include_router(audit.router)
api_router.include_router(portability.router)

# Sprint 2
api_router.include_router(treatment_activities.router)
api_router.include_router(information_assets.router)
api_router.include_router(risk_assessments.router)
api_router.include_router(incidents.router)
api_router.include_router(retention.router)
api_router.include_router(data_inventory.router)

# Sprint 3
api_router.include_router(company_profile.router)
api_router.include_router(dpia.router)
api_router.include_router(arco.router)
api_router.include_router(ropa.router)
api_router.include_router(action_plans.router)

# Sprint 4
api_router.include_router(consents.router)
api_router.include_router(legal_documents.router)
api_router.include_router(audit_plans.router)
api_router.include_router(remediations.router)
api_router.include_router(sectors.router)
api_router.include_router(reports.router)

# Sprint 5
api_router.include_router(alerts.router)
api_router.include_router(backups.router)
api_router.include_router(import_export.router)
