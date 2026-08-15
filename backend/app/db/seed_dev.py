"""Idempotent development seed data for Docker Compose."""
# pylint: disable=too-many-lines

from __future__ import annotations

import hashlib
import os
from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_password_hash
from app.db import init_db  # noqa: F401  # register all model relationships
from app.db.session import SessionLocal
from app.models.action_plan import ActionPlan, ActionPlanTemplate
from app.models.alert import Alert
from app.models.arco_request import ARCORequest
from app.models.audit_log import AuditLog
from app.models.audit_plan import AuditFinding, AuditPlan
from app.models.backup import BackupRecord
from app.models.catalog import CatalogEntry
from app.models.consent import ConsentRecord, CookieBanner, CookieConsent
from app.models.department import Department
from app.models.dpia import DPIAssessment
from app.models.incident import Incident
from app.models.information_asset import InformationAsset
from app.models.legal_document import LegalDocument
from app.models.platform_access import PlatformPermission
from app.models.portability import PortabilityRequest
from app.models.remediation import Remediation
from app.models.retention import RetentionExecutionLog, RetentionPolicy, RetentionRecord
from app.models.risk_assessment import RiskAssessment
from app.models.tenant import Tenant
from app.models.training import Enrollment, TrainingMaterial, TrainingModule, TrainingProgram
from app.models.treatment_activity import TreatmentActivity
from app.models.user import User

DEFAULT_TENANT_NAME = "DataLegal Demo"
DEFAULT_TENANT_RUC = "9999999999001"
DEFAULT_ADMIN_EMAIL = "admin@datalegal.local"
DEFAULT_ADMIN_PASSWORD = "Admin123!"
DEFAULT_PLATFORM_OWNER_EMAIL = "owner@datalegal.local"
DEFAULT_PLATFORM_OWNER_PASSWORD = "Owner123!"
DEMO_PASSWORD = "Admin123!"
PLATFORM_TENANT_PERMISSIONS = ("tenants:read", "tenants:provision")


def _env_flag(name: str) -> bool:
    """Return true when an env var is set to a truthy value."""
    return os.getenv(name, "").strip().lower() in {"1", "true", "yes", "on"}


def _now() -> datetime:
    """Return timezone-aware current datetime."""
    return datetime.now(timezone.utc)


def _days_from_now(days: int) -> date:
    """Return a date offset from today."""
    return (_now() + timedelta(days=days)).date()


def _dt_days_from_now(days: int) -> datetime:
    """Return a datetime offset from now."""
    return _now() + timedelta(days=days)


def _checksum(label: str) -> str:
    """Return deterministic sha256 text for demo backup records."""
    return hashlib.sha256(label.encode("utf-8")).hexdigest()


def _get_or_create(
    db: Session,
    model,
    filters: dict[str, Any],
    defaults: dict[str, Any] | None = None,
):
    """Create a row if one matching filters does not already exist."""
    row = db.query(model).filter_by(**filters).first()
    if row is not None:
        return row
    row = model(**filters, **(defaults or {}))
    db.add(row)
    db.flush()
    return row


def _fill_missing(obj, values: dict[str, Any]) -> None:
    """Set optional fields only when they are currently empty."""
    for field, value in values.items():
        if getattr(obj, field, None) in {None, ""}:
            setattr(obj, field, value)


def _risk_level(score: int) -> str:
    """Return risk level for the app's 1-25 scoring scale."""
    if score <= 8:
        return "LOW"
    if score <= 16:
        return "MEDIUM"
    return "HIGH"


def _seed_tenant_and_admin(db: Session) -> tuple[Tenant, User]:
    """Create the base demo tenant and admin user."""
    tenant_ruc = os.getenv("DEV_TENANT_RUC", DEFAULT_TENANT_RUC)
    tenant = db.query(Tenant).filter(Tenant.ruc == tenant_ruc).first()
    if tenant is None:
        tenant = Tenant(
            name=os.getenv("DEV_TENANT_NAME", DEFAULT_TENANT_NAME),
            ruc=tenant_ruc,
            country="Ecuador",
            sector="TECHNOLOGY",
            is_active=True,
            address="Av. Republica y Portugal, Quito, Ecuador",
            website="https://datalegal.local",
            dpo_name="Camila Andrade",
            dpo_email="dpo@datalegal.local",
            dpo_phone="+593 2 400 1200",
        )
        db.add(tenant)
        db.flush()
    else:
        _fill_missing(
            tenant,
            {
                "country": "Ecuador",
                "sector": "TECHNOLOGY",
                "address": "Av. Republica y Portugal, Quito, Ecuador",
                "website": "https://datalegal.local",
                "dpo_name": "Camila Andrade",
                "dpo_email": "dpo@datalegal.local",
                "dpo_phone": "+593 2 400 1200",
            },
        )

    admin_email = os.getenv("DEV_ADMIN_EMAIL", DEFAULT_ADMIN_EMAIL)
    admin = db.query(User).filter(User.email == admin_email).first()
    if admin is None:
        admin = User(
            tenant_id=tenant.id,
            email=admin_email,
            hashed_password=get_password_hash(
                os.getenv("DEV_ADMIN_PASSWORD", DEFAULT_ADMIN_PASSWORD)
            ),
            full_name=os.getenv("DEV_ADMIN_NAME", "DataLegal Admin"),
            role=os.getenv("DEV_ADMIN_ROLE", "SUPER_ADMIN"),
            is_active=True,
            last_activity_at=_now(),
        )
        db.add(admin)
        db.flush()
    elif admin.account_scope != "TENANT":
        admin.account_scope = "TENANT"

    return tenant, admin


def _seed_platform_owner(db: Session, tenant: Tenant) -> User:
    """Create the DataLegal platform owner account for local development."""
    owner_email = os.getenv("DEV_PLATFORM_OWNER_EMAIL", DEFAULT_PLATFORM_OWNER_EMAIL)
    owner = db.query(User).filter(User.email == owner_email).first()
    if owner is None:
        owner = User(
            tenant_id=tenant.id,
            email=owner_email,
            hashed_password=get_password_hash(
                os.getenv("DEV_PLATFORM_OWNER_PASSWORD", DEFAULT_PLATFORM_OWNER_PASSWORD)
            ),
            full_name=os.getenv("DEV_PLATFORM_OWNER_NAME", "DataLegal Platform Owner"),
            role="SUPER_ADMIN",
            account_scope="PLATFORM",
            is_active=True,
            last_activity_at=_now(),
        )
        db.add(owner)
        db.flush()
    else:
        owner.account_scope = "PLATFORM"
        owner.role = "SUPER_ADMIN"

    existing = {permission.permission for permission in owner.platform_permissions}
    for permission in PLATFORM_TENANT_PERMISSIONS:
        if permission not in existing:
            db.add(PlatformPermission(user_id=owner.id, permission=permission))
    db.flush()
    return owner


def seed_dev_data(db: Session) -> None:
    """Create development seed data when enabled."""
    if settings.ENVIRONMENT == "production" or not _env_flag("SEED_DEV_DATA"):
        return

    tenant, admin = _seed_tenant_and_admin(db)
    _seed_platform_owner(db, tenant)
    if _env_flag("SEED_MOCK_DATA"):
        _seed_mock_data(db, tenant, admin)
    db.commit()


def _seed_mock_data(db: Session, tenant: Tenant, admin: User) -> None:
    """Create a coherent medium-sized demo dataset."""
    _ = os.getenv("DEV_MOCK_DATASET", "medium").strip().lower()

    departments = _seed_departments(db, tenant)
    users = _seed_users(db, tenant, departments, admin)
    _assign_department_heads(departments, users)
    catalogs = _seed_catalogs(db, tenant, admin)
    activities = _seed_treatment_activities(db, tenant, departments, users)
    assets = _seed_information_assets(db, tenant, departments, users, catalogs, activities)
    retention_policies = _seed_retention(db, tenant, users, assets)
    risks = _seed_risks(db, tenant, users, activities)
    _seed_dpias(db, tenant, users, activities)
    remediations = _seed_remediations(db, tenant, users, risks)
    _seed_action_plans(db, tenant, users, risks)
    _seed_audits(db, tenant, users)
    _seed_rights_and_incidents(db, tenant, departments, users)
    _seed_consents(db, tenant, users, activities)
    _seed_documents(db, tenant, users)
    _seed_training(db, tenant, users)
    _seed_alerts(db, tenant, users, risks, remediations)
    _seed_audit_logs(db, tenant, users)
    _seed_backups(db, tenant)
    _seed_retention_logs(db, tenant, users, retention_policies)


def _seed_departments(db: Session, tenant: Tenant) -> dict[str, Department]:
    departments = {}
    for name in [
        "Legal y Cumplimiento",
        "Tecnologia",
        "Talento Humano",
        "Atencion al Cliente",
        "Marketing",
    ]:
        departments[name] = _get_or_create(db, Department, {"tenant_id": tenant.id, "name": name})
    return departments


def _seed_users(
    db: Session,
    tenant: Tenant,
    departments: dict[str, Department],
    admin: User,
) -> dict[str, User]:
    users = {"admin": admin}
    demo_users = [
        (
            "dpo@datalegal.local",
            "Camila Andrade",
            "DPO",
            departments["Legal y Cumplimiento"],
            "dpo",
        ),
        (
            "admin.ops@datalegal.local",
            "Mateo Rivas",
            "ADMIN",
            departments["Legal y Cumplimiento"],
            "ops",
        ),
        (
            "tech@datalegal.local",
            "Sofia Molina",
            "DEPT_HEAD",
            departments["Tecnologia"],
            "tech",
        ),
        (
            "rrhh@datalegal.local",
            "Daniel Paredes",
            "DEPT_HEAD",
            departments["Talento Humano"],
            "hr",
        ),
        (
            "auditor@datalegal.local",
            "Valeria Torres",
            "AUDITOR",
            departments["Legal y Cumplimiento"],
            "auditor",
        ),
    ]
    for email, full_name, role, department, key in demo_users:
        users[key] = _get_or_create(
            db,
            User,
            {"email": email},
            {
                "tenant_id": tenant.id,
                "hashed_password": get_password_hash(DEMO_PASSWORD),
                "full_name": full_name,
                "role": role,
                "department_id": department.id,
                "is_active": True,
                "last_activity_at": _now(),
            },
        )
    return users


def _assign_department_heads(departments: dict[str, Department], users: dict[str, User]) -> None:
    departments["Legal y Cumplimiento"].head_user_id = users["dpo"].id
    departments["Tecnologia"].head_user_id = users["tech"].id
    departments["Talento Humano"].head_user_id = users["hr"].id
    departments["Atencion al Cliente"].head_user_id = users["ops"].id
    departments["Marketing"].head_user_id = users["ops"].id


def _seed_catalogs(db: Session, tenant: Tenant, admin: User) -> dict[tuple[str, str], CatalogEntry]:
    entries = [
        ("PERSONAL_DATA_TYPE", "NATIONAL_ID", "Cedula", "Identificador nacional"),
        ("PERSONAL_DATA_TYPE", "EMAIL", "Correo electronico", "Contacto digital"),
        ("PERSONAL_DATA_TYPE", "PHONE", "Telefono", "Contacto telefonico"),
        ("PERSONAL_DATA_TYPE", "ADDRESS", "Direccion", "Domicilio o envio"),
        ("PERSONAL_DATA_TYPE", "HEALTH_DATA", "Datos de salud", "Dato sensible"),
        ("PERSONAL_DATA_TYPE", "PURCHASE_HISTORY", "Historial de compras", "Consumo"),
        ("PERSONAL_DATA_TYPE", "COOKIE_ID", "Cookie ID", "Identificador web"),
        ("ASSET_TYPE", "DATABASE", "Base de datos", "Repositorio estructurado"),
        ("ASSET_TYPE", "DOCUMENT_REPOSITORY", "Repositorio documental", "Archivos"),
        ("ASSET_TYPE", "SAAS_PLATFORM", "Plataforma SaaS", "Servicio cloud"),
        ("ASSET_TYPE", "HELPDESK", "Mesa de ayuda", "Tickets y soporte"),
        ("ASSET_FORMAT", "STRUCTURED_DB", "Base estructurada", "SQL o similar"),
        ("ASSET_FORMAT", "PDF", "PDF", "Documentos PDF"),
        ("ASSET_FORMAT", "CSV", "CSV", "Datos tabulares"),
        ("ASSET_FORMAT", "TICKET", "Ticket", "Registro de solicitud"),
        ("STORAGE_MEDIUM", "POSTGRES", "PostgreSQL", "Base transaccional"),
        ("STORAGE_MEDIUM", "CLOUD_STORAGE", "Cloud storage", "Almacenamiento cloud"),
        ("STORAGE_MEDIUM", "SAAS_VENDOR", "Proveedor SaaS", "Aplicacion externa"),
        ("CLASSIFICATION_LEVEL", "PUBLICA_USO_INTERNO", "Publica de uso interno", ""),
        ("CLASSIFICATION_LEVEL", "PUBLICA_CLASIFICADA", "Publica clasificada", ""),
        ("CLASSIFICATION_LEVEL", "PUBLICA_RESERVADA", "Publica reservada", ""),
        ("LEGAL_BASIS", "CONSENT", "Consentimiento", "Base LOPDP"),
        ("LEGAL_BASIS", "CONTRACT", "Ejecucion contractual", "Base LOPDP"),
        ("LEGAL_BASIS", "LEGAL_OBLIGATION", "Obligacion legal", "Base LOPDP"),
        ("LEGAL_BASIS", "LEGITIMATE_INTEREST", "Interes legitimo", "Base LOPDP"),
    ]
    sensitivity = {
        "HEALTH_DATA": ("SENSITIVE", "HIGH"),
        "NATIONAL_ID": ("ORDINARY", "HIGH"),
        "EMAIL": ("ORDINARY", "MEDIUM"),
        "PHONE": ("ORDINARY", "MEDIUM"),
        "ADDRESS": ("ORDINARY", "MEDIUM"),
        "PURCHASE_HISTORY": ("ORDINARY", "MEDIUM"),
        "COOKIE_ID": ("ORDINARY", "LOW"),
    }
    out = {}
    for cat_type, code, label, description in entries:
        sens, crit = sensitivity.get(code, (None, None))
        out[(cat_type, code)] = _get_or_create(
            db,
            CatalogEntry,
            {"tenant_id": tenant.id, "type": cat_type, "code": code},
            {
                "label": label,
                "description": description,
                "sensitivity": sens,
                "criticality": crit,
                "version": 1,
                "updated_by_id": admin.id,
                "is_active": True,
            },
        )
    return out


def _seed_treatment_activities(
    db: Session,
    tenant: Tenant,
    departments: dict[str, Department],
    users: dict[str, User],
) -> dict[str, TreatmentActivity]:
    data = [
        (
            "Gestion de clientes y contratos",
            "Administrar clientes, contratos, facturacion y comunicaciones.",
            "CONTRACT",
            ["NATIONAL_ID", "EMAIL", "PHONE", "ADDRESS"],
            ["Clientes", "Representantes legales"],
            departments["Legal y Cumplimiento"],
            users["ops"],
            "ACTIVE",
            -150,
        ),
        (
            "Gestion de colaboradores",
            "Gestionar expedientes laborales, beneficios y obligaciones patronales.",
            "LEGAL_OBLIGATION",
            ["NATIONAL_ID", "EMAIL", "HEALTH_DATA"],
            ["Colaboradores", "Candidatos"],
            departments["Talento Humano"],
            users["hr"],
            "ACTIVE",
            -120,
        ),
        (
            "Soporte y atencion de solicitudes",
            "Atender tickets, reclamos y solicitudes de titulares.",
            "LEGITIMATE_INTEREST",
            ["EMAIL", "PHONE", "PURCHASE_HISTORY"],
            ["Clientes", "Prospectos"],
            departments["Atencion al Cliente"],
            users["ops"],
            "ACTIVE",
            -95,
        ),
        (
            "Campanas informativas",
            "Enviar comunicaciones y medicion basica de campanas.",
            "CONSENT",
            ["EMAIL", "COOKIE_ID"],
            ["Prospectos", "Clientes"],
            departments["Marketing"],
            users["ops"],
            "DRAFT",
            -62,
        ),
        (
            "Gestion de proveedores tecnologicos",
            "Administrar accesos, soporte cloud y evidencias de seguridad.",
            "CONTRACT",
            ["EMAIL", "NATIONAL_ID"],
            ["Proveedores", "Usuarios internos"],
            departments["Tecnologia"],
            users["tech"],
            "ACTIVE",
            -28,
        ),
    ]
    out = {}
    for item in data:
        (
            name,
            purpose,
            legal_basis,
            data_types,
            subjects,
            department,
            owner,
            status,
            created_offset,
        ) = item
        activity = _get_or_create(
            db,
            TreatmentActivity,
            {"tenant_id": tenant.id, "name": name},
            {
                "purpose": purpose,
                "legal_basis": legal_basis,
                "personal_data_types": data_types,
                "data_subjects": subjects,
                "retention_period_days": 1095,
                "is_cross_border": name
                in {
                    "Campanas informativas",
                    "Gestion de proveedores tecnologicos",
                },
                "destination_countries": ["Estados Unidos"] if name.startswith("Campanas") else [],
                "processor_name": "CloudOps Ecuador S.A.",
                "processor_country": "Ecuador",
                "department_id": department.id,
                "owner_id": owner.id,
                "status": status,
                "created_at": _dt_days_from_now(created_offset),
            },
        )
        out[name] = activity
    return out


def _seed_information_assets(
    db: Session,
    tenant: Tenant,
    departments: dict[str, Department],
    users: dict[str, User],
    catalogs: dict[tuple[str, str], CatalogEntry],
    activities: dict[str, TreatmentActivity],
) -> dict[str, InformationAsset]:
    _ = catalogs
    data = [
        (
            "CRM clientes",
            "Base de clientes, contactos, contratos y seguimiento comercial.",
            "DATABASE",
            "STRUCTURED_DB",
            "POSTGRES",
            "PUBLICA_CLASIFICADA",
            departments["Legal y Cumplimiento"],
            users["ops"],
            activities["Gestion de clientes y contratos"],
        ),
        (
            "Expedientes laborales digitales",
            "Documentos laborales, beneficios, certificados y respaldos.",
            "DOCUMENT_REPOSITORY",
            "PDF",
            "CLOUD_STORAGE",
            "PUBLICA_RESERVADA",
            departments["Talento Humano"],
            users["hr"],
            activities["Gestion de colaboradores"],
        ),
        (
            "Mesa de ayuda",
            "Tickets de soporte y evidencias de atencion al titular.",
            "HELPDESK",
            "TICKET",
            "SAAS_VENDOR",
            "PUBLICA_CLASIFICADA",
            departments["Atencion al Cliente"],
            users["ops"],
            activities["Soporte y atencion de solicitudes"],
        ),
        (
            "Repositorio documental legal",
            "Politicas, clausulas, contratos y versiones vigentes.",
            "DOCUMENT_REPOSITORY",
            "PDF",
            "CLOUD_STORAGE",
            "PUBLICA_CLASIFICADA",
            departments["Legal y Cumplimiento"],
            users["dpo"],
            activities["Gestion de clientes y contratos"],
        ),
        (
            "Plataforma de consentimientos",
            "Registro de consentimientos web y preferencias.",
            "SAAS_PLATFORM",
            "STRUCTURED_DB",
            "SAAS_VENDOR",
            "PUBLICA_RESERVADA",
            departments["Marketing"],
            users["ops"],
            activities["Campanas informativas"],
        ),
    ]
    out = {}
    for row in data:
        name, description, asset_type, fmt, storage, classification, dept, owner, activity = row
        out[name] = _get_or_create(
            db,
            InformationAsset,
            {"tenant_id": tenant.id, "name": name},
            {
                "description": description,
                "asset_type_code": asset_type,
                "format_code": fmt,
                "storage_medium_code": storage,
                "classification_level_code": classification,
                "department_id": dept.id,
                "owner_id": owner.id,
                "treatment_activity_id": activity.id,
            },
        )
    return out


def _seed_retention(
    db: Session,
    tenant: Tenant,
    users: dict[str, User],
    assets: dict[str, InformationAsset],
) -> dict[str, RetentionPolicy]:
    policies = {}
    policy_data = [
        ("Retencion contractual clientes", "CONTRACT_DATA", 1825, "REVIEW"),
        ("Retencion laboral", "HR_RECORDS", 2555, "REVIEW"),
        ("Retencion soporte", "SUPPORT_TICKETS", 730, "ANONYMIZE"),
    ]
    for name, category, days, action in policy_data:
        policies[name] = _get_or_create(
            db,
            RetentionPolicy,
            {"tenant_id": tenant.id, "name": name},
            {
                "data_category": category,
                "retention_days": days,
                "action_on_expiry": action,
                "legal_basis": "LOPDP y normativa sectorial aplicable.",
                "is_active": True,
            },
        )
    record_rows = [
        ("CRM clientes", "Retencion contractual clientes", 320, "ACTIVE", False),
        ("Expedientes laborales digitales", "Retencion laboral", 1200, "ACTIVE", True),
        ("Mesa de ayuda", "Retencion soporte", -15, "UNDER_REVIEW", False),
        ("Plataforma de consentimientos", "Retencion soporte", 90, "ACTIVE", False),
    ]
    for asset_name, policy_name, offset, status, legal_hold in record_rows:
        _get_or_create(
            db,
            RetentionRecord,
            {
                "tenant_id": tenant.id,
                "information_asset_id": assets[asset_name].id,
            },
            {
                "policy_id": policies[policy_name].id,
                "expiry_date": _days_from_now(offset),
                "status": status,
                "legal_hold": legal_hold,
                "hold_justification": "Proceso laboral activo" if legal_hold else "",
                "reviewed_by_id": users["dpo"].id if status == "UNDER_REVIEW" else None,
            },
        )
    return policies


def _seed_risks(
    db: Session,
    tenant: Tenant,
    users: dict[str, User],
    activities: dict[str, TreatmentActivity],
) -> dict[str, RiskAssessment]:
    rows = [
        ("Gestion de clientes y contratos", 3, 4, "ACTIVE", -140),
        ("Gestion de colaboradores", 4, 5, "ACTIVE", -105),
        ("Soporte y atencion de solicitudes", 2, 3, "CLOSED", -80),
        ("Campanas informativas", 3, 3, "DRAFT", -45),
        ("Gestion de proveedores tecnologicos", 5, 4, "ACCEPTED", -20),
    ]
    out = {}
    for activity_name, probability, impact, status, offset in rows:
        score = probability * impact
        activity = activities[activity_name]
        out[activity_name] = _get_or_create(
            db,
            RiskAssessment,
            {"tenant_id": tenant.id, "treatment_activity_id": activity.id},
            {
                "analyst_id": users["dpo"].id,
                "responses": {
                    "cross_border": activity.is_cross_border,
                    "sensitive_data": "HEALTH_DATA" in activity.personal_data_types,
                    "third_party_processor": bool(activity.processor_name),
                },
                "probability": probability,
                "impact": impact,
                "risk_score": score,
                "risk_level": _risk_level(score),
                "status": status,
                "notes": "Evaluacion demo para trazabilidad de cumplimiento.",
                "created_at": _dt_days_from_now(offset),
            },
        )
    return out


def _seed_dpias(
    db: Session,
    tenant: Tenant,
    users: dict[str, User],
    activities: dict[str, TreatmentActivity],
) -> None:
    rows = [
        ("Gestion de colaboradores", "SIGNED", -70),
        ("Gestion de proveedores tecnologicos", "COMPLETED", -18),
        ("Campanas informativas", "DRAFT", None),
    ]
    for activity_name, status, signed_offset in rows:
        signed_at = _dt_days_from_now(signed_offset) if signed_offset is not None else None
        _get_or_create(
            db,
            DPIAssessment,
            {"tenant_id": tenant.id, "treatment_activity_id": activities[activity_name].id},
            {
                "step1_description": "Descripcion del tratamiento y partes involucradas.",
                "step2_risk_analysis": "Analisis de confidencialidad, integridad y disponibilidad.",
                "step3_mitigations": "Controles organizativos y tecnicos aplicados.",
                "status": status,
                "signed_at": signed_at,
                "signed_by_id": users["dpo"].id if signed_at else None,
                "version": 1,
            },
        )


def _seed_remediations(
    db: Session,
    tenant: Tenant,
    users: dict[str, User],
    risks: dict[str, RiskAssessment],
) -> dict[str, Remediation]:
    rows = [
        (
            "Fortalecer control de accesos RRHH",
            "Gestion de colaboradores",
            "IN_PROGRESS",
            45,
            None,
            20,
            12,
        ),
        (
            "Revisar anexos de proveedores cloud",
            "Gestion de proveedores tecnologicos",
            "OPEN",
            30,
            None,
            20,
            None,
        ),
        (
            "Cerrar brecha de tickets antiguos",
            "Soporte y atencion de solicitudes",
            "COMPLETED",
            -10,
            -5,
            6,
            4,
        ),
    ]
    out = {}
    for title, risk_key, status, due_offset, done_offset, before, after in rows:
        risk = risks[risk_key]
        out[title] = _get_or_create(
            db,
            Remediation,
            {"tenant_id": tenant.id, "title": title},
            {
                "risk_assessment_id": risk.id,
                "description": "Accion correctiva demo vinculada al riesgo.",
                "responsible_id": users["tech"].id,
                "due_date": _days_from_now(due_offset),
                "completed_date": _days_from_now(done_offset) if done_offset else None,
                "status": status,
                "risk_score_before": before,
                "risk_score_after": after,
                "risk_level_before": _risk_level(before),
                "risk_level_after": _risk_level(after) if after else None,
                "created_by_id": users["dpo"].id,
            },
        )
    return out


def _seed_action_plans(
    db: Session,
    tenant: Tenant,
    users: dict[str, User],
    risks: dict[str, RiskAssessment],
) -> None:
    template = _get_or_create(
        db,
        ActionPlanTemplate,
        {"tenant_id": tenant.id, "name": "Plan de mitigacion LOPDP"},
        {
            "description": "Checklist base para riesgos medios y altos.",
            "applies_to_level": "ANY",
            "default_tasks": [
                "Validar responsable",
                "Documentar controles",
                "Registrar evidencia",
                "Revisar riesgo residual",
            ],
            "is_active": True,
        },
    )
    rows = [
        ("Mitigacion accesos RRHH", "Gestion de colaboradores", "ACTIVE", 60),
        ("Aceptacion riesgo proveedor cloud", "Gestion de proveedores tecnologicos", "DRAFT", 45),
        ("Cierre evidencias soporte", "Soporte y atencion de solicitudes", "COMPLETED", -5),
    ]
    for title, risk_key, status, target_offset in rows:
        _get_or_create(
            db,
            ActionPlan,
            {"tenant_id": tenant.id, "title": title},
            {
                "risk_assessment_id": risks[risk_key].id,
                "template_id": template.id,
                "description": "Plan demo para seguimiento de tratamiento de riesgo.",
                "status": status,
                "tasks": template.default_tasks,
                "target_date": _days_from_now(target_offset),
                "created_by_id": users["dpo"].id,
                "auto_generated": True,
            },
        )


def _seed_audits(db: Session, tenant: Tenant, users: dict[str, User]) -> None:
    plan = _get_or_create(
        db,
        AuditPlan,
        {"tenant_id": tenant.id, "name": "Auditoria LOPDP Q2"},
        {
            "scope": "Revision de actividades criticas, riesgos y derechos ARCO.",
            "period_start": _days_from_now(-45),
            "period_end": _days_from_now(15),
            "auditor_id": users["auditor"].id,
            "status": "IN_PROGRESS",
            "notes": "Auditoria interna demo.",
        },
    )
    findings = [
        ("Evidencia incompleta de proveedor cloud", "HIGH", "OPEN"),
        ("Matriz de retencion pendiente de aprobacion", "MEDIUM", "IN_REMEDIATION"),
        ("Bitacora de capacitacion actualizada", "LOW", "RESOLVED"),
    ]
    for title, severity, status in findings:
        _get_or_create(
            db,
            AuditFinding,
            {"tenant_id": tenant.id, "audit_plan_id": plan.id, "title": title},
            {
                "description": "Hallazgo demo generado para evidencia visual.",
                "evidence": "Captura interna y registro de sistema.",
                "severity": severity,
                "status": status,
                "remediation_notes": "Asignado a responsable del proceso.",
                "remediation_date": (
                    _days_from_now(30) if status != "RESOLVED" else _days_from_now(-3)
                ),
                "created_by_id": users["auditor"].id,
            },
        )


def _seed_rights_and_incidents(
    db: Session,
    tenant: Tenant,
    departments: dict[str, Department],
    users: dict[str, User],
) -> None:
    # pylint: disable=too-many-locals
    arco_rows = [
        ("ARCO-2026-001", "ACCESS", "Ana Vera", "RECEIVED", -5, 10, None),
        ("ARCO-2026-002", "RECTIFICATION", "Luis Mora", "VERIFYING", -18, -3, None),
        ("ARCO-2026-003", "CANCELLATION", "Paula Diaz", "RESPONDED", -40, -25, -28),
        ("ARCO-2026-004", "OPPOSITION", "Carlos Navas", "CLOSED", -70, -55, -58),
    ]
    for ticket, request_type, name, status, received, deadline, responded in arco_rows:
        _get_or_create(
            db,
            ARCORequest,
            {"tenant_id": tenant.id, "ticket_number": ticket},
            {
                "request_type": request_type,
                "requester_name": name,
                "requester_email": f"{name.lower().replace(' ', '.')}@example.com",
                "requester_id_number": f"17{abs(received):08d}",
                "description": "Solicitud demo de derechos del titular.",
                "status": status,
                "received_date": _days_from_now(received),
                "deadline_date": _days_from_now(deadline),
                "assigned_dpo_id": users["dpo"].id,
                "response_text": "Respuesta enviada." if responded else "",
                "responded_at": _dt_days_from_now(responded) if responded else None,
            },
        )

    portability_rows = [
        ("Maria Suarez", "maria.suarez@example.com", "PENDING", -6, None),
        ("Jorge Hidalgo", "jorge.hidalgo@example.com", "IN_PROGRESS", -14, None),
        ("Elena Ponce", "elena.ponce@example.com", "COMPLETED", -32, -25),
    ]
    for name, email, status, request_offset, completed_offset in portability_rows:
        _get_or_create(
            db,
            PortabilityRequest,
            {"tenant_id": tenant.id, "subject_email": email},
            {
                "subject_name": name,
                "request_date": _dt_days_from_now(request_offset),
                "status": status,
                "response_data": '{"format":"json","records":12}' if completed_offset else None,
                "completed_at": _dt_days_from_now(completed_offset) if completed_offset else None,
                "notes": "Solicitud demo de portabilidad.",
            },
        )

    incident_rows = [
        ("Acceso fallido recurrente", "UNAUTHORIZED_ACCESS", "MEDIUM", "INVESTIGATING", False),
        ("Exposicion temporal de ticket", "DATA_BREACH", "HIGH", "OPEN", True),
        ("Error en integracion CRM", "SYSTEM_FAILURE", "LOW", "RESOLVED", False),
        ("Descarga no autorizada de expediente", "DATA_BREACH", "CRITICAL", "OPEN", True),
    ]
    for idx, row in enumerate(incident_rows):
        title, incident_type, severity, status, notify = row
        _get_or_create(
            db,
            Incident,
            {"tenant_id": tenant.id, "title": title},
            {
                "description": "Incidente demo para seguimiento operativo.",
                "incident_type": incident_type,
                "severity": severity,
                "status": status,
                "regulatory_notification_required": notify,
                "regulatory_notified_at": _dt_days_from_now(-1) if notify and idx == 1 else None,
                "reporter_id": users["ops"].id,
                "assigned_to_id": users["dpo"].id,
                "resolved_at": _dt_days_from_now(-2) if status == "RESOLVED" else None,
                "affected_data_types": "EMAIL,NATIONAL_ID",
                "department_id": departments["Tecnologia"].id,
                "created_at": _dt_days_from_now(-20 + idx * 5),
            },
        )


def _seed_consents(
    db: Session,
    tenant: Tenant,
    users: dict[str, User],
    activities: dict[str, TreatmentActivity],
) -> None:
    banner = _get_or_create(
        db,
        CookieBanner,
        {"tenant_id": tenant.id, "version": "2026.06"},
        {
            "content": "Banner demo de cookies necesarias, analiticas y preferencias.",
            "effective_date": _dt_days_from_now(-60),
            "is_active": True,
            "created_by_id": users["dpo"].id,
        },
    )
    consent_rows = [
        ("ds-token-001", "CONSENT", False, False, -90),
        ("ds-token-002", "CONSENT", True, False, -50),
        ("ds-token-003", "CONSENT", False, True, -30),
        ("ds-token-004", "CONTRACT", False, False, -12),
    ]
    for token, basis, sensitive, revoked, offset in consent_rows:
        _get_or_create(
            db,
            ConsentRecord,
            {"tenant_id": tenant.id, "data_subject_token": token},
            {
                "treatment_activity_id": activities["Campanas informativas"].id,
                "legal_basis": basis,
                "purpose": "Consentimiento demo para comunicaciones y trazabilidad.",
                "is_sensitive": sensitive,
                "granted_at": _dt_days_from_now(offset),
                "is_revoked": revoked,
                "revoked_at": _dt_days_from_now(-5) if revoked else None,
                "revocation_reason": "Retiro de consentimiento" if revoked else "",
                "created_by_id": users["ops"].id,
            },
        )
        _get_or_create(
            db,
            CookieConsent,
            {"tenant_id": tenant.id, "banner_id": banner.id, "data_subject_token": token},
            {
                "accepted_at": _dt_days_from_now(offset),
                "is_revoked": revoked,
                "revoked_at": _dt_days_from_now(-5) if revoked else None,
            },
        )


def _seed_documents(db: Session, tenant: Tenant, users: dict[str, User]) -> None:
    rows = [
        ("PRIVACY_POLICY", "Politica de privacidad", "1.0"),
        ("COOKIE_NOTICE", "Aviso de cookies", "1.0"),
        ("PROCESSOR_CONTRACT", "Contrato encargado de tratamiento", "1.0"),
        ("CUSTOMER_NOTICE", "Aviso para clientes", "1.1"),
    ]
    for doc_type, title, version in rows:
        _get_or_create(
            db,
            LegalDocument,
            {"tenant_id": tenant.id, "doc_type": doc_type, "version": version},
            {
                "title": title,
                "effective_date": _days_from_now(-20),
                "parameters": {"company": tenant.name, "country": "Ecuador"},
                "content": f"{title} demo vigente para evidenciar cumplimiento LOPDP.",
                "is_current": True,
                "created_by_id": users["dpo"].id,
            },
        )


def _seed_training(db: Session, tenant: Tenant, users: dict[str, User]) -> None:
    program = _get_or_create(
        db,
        TrainingProgram,
        {"tenant_id": tenant.id, "title": "Fundamentos LOPDP para equipos"},
        {
            "description": "Programa demo para privacidad, incidentes y derechos.",
            "is_active": True,
        },
    )
    modules = []
    for order, title in enumerate(
        ["Principios LOPDP", "Gestion de incidentes", "Derechos de titulares"],
        start=1,
    ):
        module = _get_or_create(
            db,
            TrainingModule,
            {"tenant_id": tenant.id, "program_id": program.id, "title": title},
            {"description": "Modulo demo de capacitacion.", "order": order},
        )
        modules.append(module)
        _get_or_create(
            db,
            TrainingMaterial,
            {"tenant_id": tenant.id, "module_id": module.id, "title": f"Guia {title}"},
            {
                "content_type": "text",
                "url": None,
                "content": "Contenido demo para capacitacion interna.",
            },
        )
    enrollment_rows = [("dpo", 100), ("tech", 65), ("hr", 40), ("auditor", 100)]
    for key, progress in enrollment_rows:
        _get_or_create(
            db,
            Enrollment,
            {"tenant_id": tenant.id, "user_id": users[key].id, "program_id": program.id},
            {
                "enrolled_at": _dt_days_from_now(-35),
                "completed_at": _dt_days_from_now(-10) if progress == 100 else None,
                "progress_pct": progress,
            },
        )
    _ = modules


def _seed_alerts(
    db: Session,
    tenant: Tenant,
    users: dict[str, User],
    risks: dict[str, RiskAssessment],
    remediations: dict[str, Remediation],
) -> None:
    rows = [
        (
            "ARCO_DEADLINE_APPROACHING",
            "Solicitud ARCO por vencer",
            "Revisar ticket ARCO-2026-002 antes del cierre del plazo.",
            "WARNING",
            "arco_requests",
            None,
        ),
        (
            "HIGH_RISK_ASSESSMENT",
            "Riesgo alto pendiente",
            "La actividad de proveedores tecnologicos requiere seguimiento.",
            "CRITICAL",
            "risk_assessments",
            risks["Gestion de proveedores tecnologicos"].id,
        ),
        (
            "TASK_ASSIGNED",
            "Remediacion asignada",
            "Fortalecer controles de acceso de RRHH esta en progreso.",
            "INFO",
            "remediations",
            remediations["Fortalecer control de accesos RRHH"].id,
        ),
    ]
    for alert_type, title, message, severity, resource_type, resource_id in rows:
        _get_or_create(
            db,
            Alert,
            {"tenant_id": tenant.id, "alert_type": alert_type, "title": title},
            {
                "message": message,
                "severity": severity,
                "resource_type": resource_type,
                "resource_id": resource_id,
                "recipient_id": users["dpo"].id,
                "is_read": severity == "INFO",
            },
        )


def _seed_audit_logs(db: Session, tenant: Tenant, users: dict[str, User]) -> None:
    rows = [
        ("LOGIN", "auth", "Demo admin login"),
        ("TREATMENT_ACTIVITY_CREATED", "treatment_activities", "Seed demo activity"),
        ("RISK_ASSESSMENT_UPDATED", "risk_assessments", "Seed demo risk review"),
        ("REPORT_EXPORTED", "reports", "Seed demo report export"),
    ]
    for action, resource, detail in rows:
        _get_or_create(
            db,
            AuditLog,
            {"tenant_id": tenant.id, "action": action, "resource": resource, "detail": detail},
            {"user_id": users["admin"].id, "ip_address": "127.0.0.1"},
        )


def _seed_backups(db: Session, tenant: Tenant) -> None:
    rows = [
        ("datalegal-demo-full-20260601.sql.gz", None, "VERIFIED", 2048000),
        ("datalegal-demo-tenant-20260615.sql.gz", tenant.id, "COMPLETED", 824000),
    ]
    for filename, tenant_id, status, size in rows:
        _get_or_create(
            db,
            BackupRecord,
            {"filename": filename},
            {
                "tenant_id": tenant_id,
                "checksum_sha256": _checksum(filename),
                "size_bytes": size,
                "status": status,
                "notes": "Registro demo de respaldo.",
                "verified_at": _dt_days_from_now(-5) if status == "VERIFIED" else None,
            },
        )


def _seed_retention_logs(
    db: Session,
    tenant: Tenant,
    users: dict[str, User],
    policies: dict[str, RetentionPolicy],
) -> None:
    for name, processed, exceptions, status in [
        ("Retencion soporte", 14, 1, "PARTIAL"),
        ("Retencion contractual clientes", 32, 0, "SUCCESS"),
    ]:
        policy = policies[name]
        _get_or_create(
            db,
            RetentionExecutionLog,
            {"tenant_id": tenant.id, "policy_id": policy.id, "run_type": "MANUAL"},
            {
                "executed_by_id": users["dpo"].id,
                "records_processed": processed,
                "records_exceptions": exceptions,
                "status": status,
                "log_details": {"source": "seed_demo", "policy": name},
            },
        )


def main() -> None:
    """Run development seed data creation."""
    db = SessionLocal()
    try:
        seed_dev_data(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
