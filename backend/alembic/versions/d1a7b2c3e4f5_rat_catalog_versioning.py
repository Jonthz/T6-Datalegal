"""RAT enrichment + catalog versioning (B2)

Merge de las dos cabezas previas y esquema del incremento B2:
  - treatment_activities: identificador estructurado (rat_code), bases de licitud
    múltiples y variables adicionales del Art. 38 RGLOPDP / Res. SPDP-SPD-2026-0009-R.
  - catalog_entry_versions: historial de versiones de catálogo (US-RF20-1).

Revision ID: d1a7b2c3e4f5
Revises: b1f2a3c4d5e6, c9d1e2f3a4b5
Create Date: 2026-08-06 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d1a7b2c3e4f5"
down_revision: Union[str, Sequence[str], None] = ("b1f2a3c4d5e6", "c9d1e2f3a4b5")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ── treatment_activities: RAT enrichment ────────────────────────────────
    op.add_column("treatment_activities", sa.Column("rat_code", sa.String(length=20), nullable=True))
    op.create_index(
        "ix_treatment_activities_rat_code", "treatment_activities", ["rat_code"]
    )
    op.add_column(
        "treatment_activities", sa.Column("legal_bases", sa.JSON(), nullable=True)
    )
    op.add_column(
        "treatment_activities",
        sa.Column("complementary_legal_bases", sa.JSON(), nullable=True),
    )
    op.add_column("treatment_activities", sa.Column("area", sa.String(length=120), nullable=True))
    op.create_index("ix_treatment_activities_area", "treatment_activities", ["area"])
    op.add_column(
        "treatment_activities", sa.Column("operational_owner", sa.String(length=255), nullable=True)
    )
    op.add_column("treatment_activities", sa.Column("data_categories", sa.JSON(), nullable=True))
    op.add_column("treatment_activities", sa.Column("data_origin", sa.Text(), nullable=True))
    op.add_column("treatment_activities", sa.Column("treatment_operations", sa.JSON(), nullable=True))
    op.add_column(
        "treatment_activities",
        sa.Column("uses_profiling", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "treatment_activities",
        sa.Column("uses_ai", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "treatment_activities",
        sa.Column("automated_decision", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "treatment_activities",
        sa.Column("requires_dpia", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "treatment_activities",
        sa.Column("has_special_data", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "treatment_activities",
        sa.Column("involves_minors", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("treatment_activities", sa.Column("recipients", sa.JSON(), nullable=True))
    op.add_column("treatment_activities", sa.Column("processors", sa.JSON(), nullable=True))
    op.add_column(
        "treatment_activities", sa.Column("system_platform", sa.String(length=255), nullable=True)
    )
    op.add_column("treatment_activities", sa.Column("technical_measures", sa.Text(), nullable=True))
    op.add_column(
        "treatment_activities", sa.Column("organizational_measures", sa.Text(), nullable=True)
    )
    op.add_column("treatment_activities", sa.Column("physical_measures", sa.Text(), nullable=True))
    op.add_column("treatment_activities", sa.Column("legal_measures", sa.Text(), nullable=True))
    op.add_column("treatment_activities", sa.Column("mtge_score", sa.Float(), nullable=True))
    op.add_column(
        "treatment_activities", sa.Column("mtge_result", sa.String(length=60), nullable=True)
    )

    # ── catalog_entry_versions: version history ─────────────────────────────
    op.create_table(
        "catalog_entry_versions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("catalog_entry_id", sa.Integer(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("sensitivity", sa.String(length=20), nullable=True),
        sa.Column("criticality", sa.String(length=20), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("changed_by_id", sa.Integer(), nullable=True),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["catalog_entry_id"], ["catalog_entries.id"]),
        sa.ForeignKeyConstraint(["changed_by_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_catalog_entry_versions_id", "catalog_entry_versions", ["id"]
    )
    op.create_index(
        "ix_catalog_entry_versions_catalog_entry_id",
        "catalog_entry_versions",
        ["catalog_entry_id"],
    )
    op.create_index(
        "ix_catalog_entry_versions_tenant_id", "catalog_entry_versions", ["tenant_id"]
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_catalog_entry_versions_tenant_id", table_name="catalog_entry_versions")
    op.drop_index(
        "ix_catalog_entry_versions_catalog_entry_id", table_name="catalog_entry_versions"
    )
    op.drop_index("ix_catalog_entry_versions_id", table_name="catalog_entry_versions")
    op.drop_table("catalog_entry_versions")

    op.drop_column("treatment_activities", "mtge_result")
    op.drop_column("treatment_activities", "mtge_score")
    op.drop_column("treatment_activities", "legal_measures")
    op.drop_column("treatment_activities", "physical_measures")
    op.drop_column("treatment_activities", "organizational_measures")
    op.drop_column("treatment_activities", "technical_measures")
    op.drop_column("treatment_activities", "system_platform")
    op.drop_column("treatment_activities", "processors")
    op.drop_column("treatment_activities", "recipients")
    op.drop_column("treatment_activities", "involves_minors")
    op.drop_column("treatment_activities", "has_special_data")
    op.drop_column("treatment_activities", "requires_dpia")
    op.drop_column("treatment_activities", "automated_decision")
    op.drop_column("treatment_activities", "uses_ai")
    op.drop_column("treatment_activities", "uses_profiling")
    op.drop_column("treatment_activities", "treatment_operations")
    op.drop_column("treatment_activities", "data_origin")
    op.drop_column("treatment_activities", "data_categories")
    op.drop_index("ix_treatment_activities_area", table_name="treatment_activities")
    op.drop_column("treatment_activities", "operational_owner")
    op.drop_column("treatment_activities", "area")
    op.drop_column("treatment_activities", "complementary_legal_bases")
    op.drop_column("treatment_activities", "legal_bases")
    op.drop_index("ix_treatment_activities_rat_code", table_name="treatment_activities")
    op.drop_column("treatment_activities", "rat_code")
