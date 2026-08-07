"""add platform account permissions

Revision ID: c9d1e2f3a4b5
Revises: b1f2b4650c86
Create Date: 2026-08-05 15:35:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c9d1e2f3a4b5"
down_revision: Union[str, Sequence[str], None] = "b1f2b4650c86"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "users",
        sa.Column("account_scope", sa.String(length=20), nullable=False, server_default="TENANT"),
    )
    op.create_table(
        "platform_permissions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("permission", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "permission", name="uq_platform_permissions_user_permission"),
    )
    op.create_index(op.f("ix_platform_permissions_id"), "platform_permissions", ["id"], unique=False)
    op.create_index(
        op.f("ix_platform_permissions_permission"),
        "platform_permissions",
        ["permission"],
        unique=False,
    )
    op.create_index(
        op.f("ix_platform_permissions_user_id"),
        "platform_permissions",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_platform_permissions_user_id"), table_name="platform_permissions")
    op.drop_index(op.f("ix_platform_permissions_permission"), table_name="platform_permissions")
    op.drop_index(op.f("ix_platform_permissions_id"), table_name="platform_permissions")
    op.drop_table("platform_permissions")
    op.drop_column("users", "account_scope")
