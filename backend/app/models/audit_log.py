from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, Session, mapped_column, relationship

from app.db.base import Base


class AuditLog(Base):
    """Append-only audit log. NO update/delete methods exist by design."""

    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tenant_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True, index=True
    )
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    resource: Mapped[str] = mapped_column(String(100), nullable=False)
    detail: Mapped[str] = mapped_column(Text, nullable=False, default="")
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    # Relationship
    user: Mapped["User | None"] = relationship("User", back_populates="audit_logs")  # noqa: F821

    @classmethod
    def create_log(
        cls,
        db: Session,
        *,
        action: str,
        resource: str,
        tenant_id: int | None = None,
        user_id: int | None = None,
        detail: str = "",
        ip_address: str | None = None,
    ) -> "AuditLog":
        """The ONLY way to write audit entries. Append-only by design."""
        entry = cls(
            tenant_id=tenant_id,
            user_id=user_id,
            action=action,
            resource=resource,
            detail=detail,
            ip_address=ip_address,
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry

    # Intentionally no update() or delete() methods.
