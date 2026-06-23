from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import TenantBase


class TrainingProgram(TenantBase):
    """TrainingProgram schema/model definition."""
    __tablename__ = "training_programs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    modules: Mapped[list["TrainingModule"]] = relationship(
        "TrainingModule", back_populates="program", lazy="noload"
    )
    enrollments: Mapped[list["Enrollment"]] = relationship(
        "Enrollment", back_populates="program", lazy="noload"
    )


class TrainingModule(TenantBase):
    """TrainingModule schema/model definition."""
    __tablename__ = "training_modules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    program_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("training_programs.id"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    program: Mapped["TrainingProgram"] = relationship("TrainingProgram", back_populates="modules")
    materials: Mapped[list["TrainingMaterial"]] = relationship(
        "TrainingMaterial", back_populates="module", lazy="noload"
    )


class TrainingMaterial(TenantBase):
    """TrainingMaterial schema/model definition."""
    __tablename__ = "training_materials"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    module_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("training_modules.id"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(50), nullable=False, default="text")
    url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")

    module: Mapped["TrainingModule"] = relationship("TrainingModule", back_populates="materials")


class Enrollment(TenantBase):
    """Enrollment schema/model definition."""
    __tablename__ = "enrollments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    program_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("training_programs.id"), nullable=False, index=True
    )
    enrolled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    progress_pct: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="enrollments")  # noqa: F821
    program: Mapped["TrainingProgram"] = relationship(
        "TrainingProgram", back_populates="enrollments"
    )
