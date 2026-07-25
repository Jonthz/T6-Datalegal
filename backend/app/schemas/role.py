"""Cycle 6: Pydantic schemas for custom roles and the role-permission query view."""

import re

from pydantic import BaseModel, field_validator

from app.core.permissions import KNOWN_MODULES, SYSTEM_ROLES, VALID_ACTIONS

ROLE_NAME_PATTERN = re.compile(r"^[A-Z][A-Z0-9_]{1,49}$")


class ModulePermission(BaseModel):
    """Allowed actions for a single module."""

    module: str
    actions: list[str]

    @field_validator("module")
    @classmethod
    def module_must_be_known(cls, v: str) -> str:
        """Reject modules outside the system's known module list."""
        if v not in KNOWN_MODULES:
            raise ValueError(f"Unknown module '{v}'. Valid modules: {sorted(KNOWN_MODULES)}")
        return v

    @field_validator("actions")
    @classmethod
    def actions_must_be_valid(cls, v: list[str]) -> list[str]:
        """Reject actions outside c/r/u/d/export."""
        invalid = set(v) - VALID_ACTIONS
        if invalid:
            raise ValueError(f"Invalid action(s) {sorted(invalid)}. Valid: {sorted(VALID_ACTIONS)}")
        return v


class RoleCreate(BaseModel):
    """Fields required to create a custom role."""

    name: str
    description: str = ""
    permissions: list[ModulePermission] = []

    @field_validator("name")
    @classmethod
    def name_must_be_valid(cls, v: str) -> str:
        """Normalize and reject names colliding with a built-in system role."""
        v = v.strip().upper()
        if not ROLE_NAME_PATTERN.match(v):
            raise ValueError(
                "Role name must be 2-50 characters, uppercase letters/digits/underscores, "
                "starting with a letter (e.g. AUDITOR_JR)."
            )
        if v in SYSTEM_ROLES:
            raise ValueError(f"'{v}' is a built-in system role name and cannot be reused.")
        return v


class RoleUpdate(BaseModel):
    """Fields allowed when updating a custom role."""

    description: str | None = None
    permissions: list[ModulePermission] | None = None


class RolePermissionRead(BaseModel):
    """A single module's allowed actions, as returned by the API."""

    module: str
    actions: list[str]


class RoleRead(BaseModel):
    """A role (system or custom) with its full permission matrix."""

    id: int | None = None  # None for built-in system roles
    name: str
    description: str
    is_custom: bool
    permissions: list[RolePermissionRead]
