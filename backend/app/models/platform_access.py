from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class PlatformPermission(Base, TimestampMixin):
    """Explicit platform-level permissions assigned to platform accounts."""

    __tablename__ = "platform_permissions"
    __table_args__ = (
        UniqueConstraint("user_id", "permission", name="uq_platform_permissions_user_permission"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    permission: Mapped[str] = mapped_column(String(100), nullable=False, index=True)

    user: Mapped["User"] = relationship(  # noqa: F821
        "User",
        back_populates="platform_permissions",
    )
