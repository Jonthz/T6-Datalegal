from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import TenantBase


class Department(TenantBase):
    """Department schema/model definition."""
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    head_user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", use_alter=True), nullable=True
    )

    # Relationships
    head_user: Mapped["User | None"] = relationship(  # noqa: F821
        "User",
        foreign_keys=[head_user_id],
        back_populates="headed_department",
        lazy="noload",
    )
    users: Mapped[list] = relationship(
        "User",
        foreign_keys="[User.department_id]",
        back_populates="department",
        lazy="noload",
    )
