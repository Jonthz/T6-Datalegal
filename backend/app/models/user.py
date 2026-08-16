from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import TenantBase


class User(TenantBase):
    """User schema/model definition."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        String(50), nullable=False, default="AUDITOR"
    )  # SUPER_ADMIN, DPO, ADMIN, DEPT_HEAD, AUDITOR
    account_scope: Mapped[str] = mapped_column(
        String(20), nullable=False, default="TENANT"
    )  # TENANT, PLATFORM
    department_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("departments.id"), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    failed_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    mfa_secret: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # US-RF02-2: server-side inactivity tracking
    last_activity_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    department: Mapped["Department | None"] = relationship(  # noqa: F821
        "Department",
        foreign_keys=[department_id],
        back_populates="users",
    )
    headed_department: Mapped["Department | None"] = relationship(  # noqa: F821
        "Department",
        foreign_keys="[Department.head_user_id]",
        back_populates="head_user",
    )
    audit_logs: Mapped[list] = relationship("AuditLog", back_populates="user", lazy="noload")
    enrollments: Mapped[list] = relationship("Enrollment", back_populates="user", lazy="noload")
    platform_permissions: Mapped[list["PlatformPermission"]] = relationship(  # noqa: F821
        "PlatformPermission",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
