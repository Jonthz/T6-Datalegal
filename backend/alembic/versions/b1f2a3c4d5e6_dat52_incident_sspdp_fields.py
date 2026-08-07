"""DAT-52: SSPDP incident fields (breach type, delegate/controller, closure report)

Revision ID: b1f2a3c4d5e6
Revises: 9ea2fa322267
Create Date: 2026-07-24 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b1f2a3c4d5e6"
down_revision: Union[str, Sequence[str], None] = "9ea2fa322267"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "incidents",
        sa.Column(
            "vulnerability_types",
            sa.JSON(),
            nullable=False,
            server_default=sa.text("'[]'"),
        ),
    )
    op.add_column("incidents", sa.Column("delegate_name", sa.String(length=255), nullable=True))
    op.add_column("incidents", sa.Column("delegate_email", sa.String(length=255), nullable=True))
    op.add_column("incidents", sa.Column("delegate_phone", sa.String(length=50), nullable=True))
    op.add_column("incidents", sa.Column("controller_name", sa.String(length=255), nullable=True))
    op.add_column("incidents", sa.Column("controller_email", sa.String(length=255), nullable=True))
    op.add_column("incidents", sa.Column("controller_phone", sa.String(length=50), nullable=True))
    op.add_column(
        "incidents",
        sa.Column("closure_summary", sa.Text(), nullable=False, server_default=""),
    )
    op.add_column("incidents", sa.Column("closure_report_pdf", sa.LargeBinary(), nullable=True))
    op.add_column(
        "incidents", sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True)
    )

    # Drop the server defaults now that existing rows are backfilled; the ORM
    # supplies these values on new rows. Wrapped in batch mode so SQLite (which
    # lacks ALTER COLUMN ... DROP DEFAULT) recreates the table instead.
    with op.batch_alter_table("incidents") as batch_op:
        batch_op.alter_column("vulnerability_types", server_default=None)
        batch_op.alter_column("closure_summary", server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("incidents", "closed_at")
    op.drop_column("incidents", "closure_report_pdf")
    op.drop_column("incidents", "closure_summary")
    op.drop_column("incidents", "controller_phone")
    op.drop_column("incidents", "controller_email")
    op.drop_column("incidents", "controller_name")
    op.drop_column("incidents", "delegate_phone")
    op.drop_column("incidents", "delegate_email")
    op.drop_column("incidents", "delegate_name")
    op.drop_column("incidents", "vulnerability_types")
