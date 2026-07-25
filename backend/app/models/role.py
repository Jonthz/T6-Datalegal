"""Cycle 6: Custom roles with per-module, configurable access.

Built-in system roles (SUPER_ADMIN, DPO, ADMIN, DEPT_HEAD, AUDITOR) keep living
in the static PERMISSIONS matrix in app/core/permissions.py — they are not
duplicated here. This model only stores tenant-defined custom roles.
"""

from sqlalchemy import JSON, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import TenantBase


class Role(TenantBase):
    """A tenant-defined custom role."""

    __tablename__ = "roles"
    __table_args__ = (UniqueConstraint("tenant_id", "name", name="uq_roles_tenant_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    description: Mapped[str] = mapped_column(String(255), nullable=False, default="")

    permissions: Mapped[list["RolePermission"]] = relationship(
        "RolePermission",
        back_populates="role",
        cascade="all, delete-orphan",
        lazy="joined",
    )


class RolePermission(TenantBase):
    """Allowed actions (subset of c/r/u/d/export) for one module of a custom role."""

    __tablename__ = "role_permissions"
    __table_args__ = (
        UniqueConstraint("role_id", "module", name="uq_role_permissions_role_module"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    role_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("roles.id"), nullable=False, index=True
    )
    module: Mapped[str] = mapped_column(String(100), nullable=False)
    actions: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)

    role: Mapped["Role"] = relationship("Role", back_populates="permissions")
