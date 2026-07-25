PERMISSIONS: dict[str, dict[str, list[str]]] = {
    "SUPER_ADMIN": {
        "tenants": ["c", "r", "u", "d"],
        "users": ["c", "r", "u", "d"],
        "departments": ["c", "r", "u", "d"],
        "audit": ["r", "export"],
        "catalogs": ["c", "r", "u", "d"],
        "training": ["c", "r", "u", "d"],
        "portability": ["c", "r", "u", "d", "export"],
        "permissions": ["c", "r", "u", "d"],
        "treatment_activities": ["c", "r", "u", "d"],
        "information_assets": ["c", "r", "u", "d"],
        "risk_assessments": ["c", "r", "u", "d"],
        "incidents": ["c", "r", "u", "d"],
        "retention": ["c", "r", "u", "d"],
        "data_inventory": ["r"],
        "dpias": ["c", "r", "u", "d"],
        "arco": ["c", "r", "u", "d"],
        "ropa": ["r"],
        "action_plans": ["c", "r", "u", "d"],
        "consents": ["c", "r", "u", "d"],
        "legal_documents": ["c", "r", "u", "d"],
        "audit_plans": ["c", "r", "u", "d"],
        "remediations": ["c", "r", "u", "d"],
        "sectors": ["r", "u"],
        "reports": ["r"],
        "alerts": ["c", "r", "u", "d"],
        "backups": ["c", "r", "u", "d"],
    },
    "DPO": {
        "users": ["c", "r", "u", "d"],
        "departments": ["c", "r", "u", "d"],
        "audit": ["r", "export"],
        "catalogs": ["c", "r", "u", "d"],
        "training": ["c", "r", "u", "d"],
        "portability": ["c", "r", "u", "d", "export"],
        "treatment_activities": ["c", "r", "u", "d"],
        "information_assets": ["c", "r", "u", "d"],
        "risk_assessments": ["c", "r", "u", "d"],
        "incidents": ["c", "r", "u", "d"],
        "retention": ["c", "r", "u", "d"],
        "data_inventory": ["r"],
        "dpias": ["c", "r", "u", "d"],
        "arco": ["c", "r", "u", "d"],
        "ropa": ["r"],
        "action_plans": ["c", "r", "u", "d"],
        "consents": ["c", "r", "u", "d"],
        "legal_documents": ["c", "r", "u", "d"],
        "audit_plans": ["c", "r", "u", "d"],
        "remediations": ["c", "r", "u", "d"],
        "sectors": ["r", "u"],
        "reports": ["r"],
        "alerts": ["c", "r", "u", "d"],
        "backups": ["r"],
        "permissions": ["c", "r", "u", "d"],
    },
    "ADMIN": {
        "users": ["c", "r", "u", "d"],
        "departments": ["c", "r", "u"],
        "audit": ["r"],
        "catalogs": ["r"],
        "training": ["c", "r", "u", "d"],
        "portability": ["c", "r"],
        "treatment_activities": ["c", "r", "u"],
        "information_assets": ["c", "r", "u"],
        "risk_assessments": ["c", "r", "u"],
        "incidents": ["c", "r", "u"],
        "retention": ["c", "r", "u"],
        "data_inventory": ["r"],
        "dpias": ["c", "r", "u"],
        "arco": ["c", "r", "u"],
        "ropa": ["r"],
        "action_plans": ["c", "r", "u"],
        "consents": ["c", "r", "u"],
        "legal_documents": ["r"],
        "audit_plans": ["r"],
        "remediations": ["c", "r", "u"],
        "sectors": ["r", "u"],
        "reports": ["r"],
        "alerts": ["c", "r", "u", "d"],
        "backups": ["c", "r", "u"],
        "permissions": ["c", "r", "u"],
    },
    "DEPT_HEAD": {
        "users": ["r"],
        "departments": ["r"],
        "training": ["r", "u"],
        "portability": ["r"],
        "treatment_activities": ["c", "r", "u"],
        "information_assets": ["c", "r", "u"],
        "risk_assessments": ["c", "r"],
        "incidents": ["c", "r"],
        "retention": ["r"],
        "data_inventory": ["r"],
        "dpias": ["c", "r"],
        "arco": ["c", "r"],
        "ropa": ["r"],
        "action_plans": ["r"],
        "consents": ["r"],
        "legal_documents": ["r"],
        "audit_plans": ["r"],
        "remediations": ["r"],
        "sectors": ["r"],
        "reports": ["r"],
        "alerts": ["r", "u"],
        "permissions": ["r"],
    },
    "AUDITOR": {
        "audit": ["r", "export"],
        "users": ["r"],
        "departments": ["r"],
        "portability": ["r"],
        "treatment_activities": ["r"],
        "information_assets": ["r"],
        "risk_assessments": ["r"],
        "incidents": ["r"],
        "retention": ["r"],
        "data_inventory": ["r"],
        "dpias": ["r"],
        "arco": ["r"],
        "ropa": ["r"],
        "action_plans": ["r"],
        "consents": ["r"],
        "legal_documents": ["r"],
        "audit_plans": ["c", "r", "u"],
        "remediations": ["r"],
        "sectors": ["r"],
        "reports": ["r"],
        "alerts": ["r"],
        "permissions": ["r"],
    },
}

SYSTEM_ROLES = set(PERMISSIONS.keys())
# The full universe of modules a custom role may be granted access to.
KNOWN_MODULES = set(PERMISSIONS["SUPER_ADMIN"].keys())
VALID_ACTIONS = {"c", "r", "u", "d", "export"}


def has_permission(role: str, module: str, action: str) -> bool:
    """Check if a built-in system role has permission to perform action on module."""
    role_perms = PERMISSIONS.get(role, {})
    module_perms = role_perms.get(module, [])
    return action in module_perms


def has_custom_role_permission(db, tenant_id: int, role: str, module: str, action: str) -> bool:
    """Check whether a tenant-defined custom role grants this module action (Cycle 6).

    System roles are never looked up here — has_permission() already covers
    them from the static matrix, cheaply and without a DB round-trip.
    """
    if role in SYSTEM_ROLES:
        return False

    from app.models.role import Role, RolePermission  # local import avoids a core->models cycle

    row = (
        db.query(RolePermission)
        .join(Role, Role.id == RolePermission.role_id)
        .filter(
            Role.tenant_id == tenant_id,
            Role.name == role,
            RolePermission.module == module,
        )
        .first()
    )
    return row is not None and action in row.actions
