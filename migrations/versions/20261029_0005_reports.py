"""reports: one structured report per scan

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-29
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel  # noqa: F401

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "reports",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("scan_id", sa.Uuid(), nullable=False),
        sa.Column("organisation_id", sa.Uuid(), nullable=False),
        sa.Column("author_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.String(length=10), nullable=False),
        sa.Column("lung_fields", sa.JSON(), nullable=False),
        sa.Column("affected_side", sa.String(length=10), nullable=True),
        sa.Column("severity", sa.String(length=10), nullable=True),
        sa.Column("detailed_findings", sa.Text(), nullable=False),
        sa.Column("primary_impression", sa.String(length=30), nullable=True),
        sa.Column("secondary_findings", sa.Text(), nullable=False),
        sa.Column("impression_narrative", sa.Text(), nullable=False),
        sa.Column("recommended_action", sa.String(length=30), nullable=True),
        sa.Column("follow_up_timeframe", sa.Integer(), nullable=True),
        sa.Column("follow_up_unit", sa.String(length=10), nullable=True),
        sa.Column("additional_notes", sa.Text(), nullable=False),
        sa.Column("ai_agreement", sa.String(length=20), nullable=True),
        sa.Column("ai_disagreement_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finalised_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["scan_id"], ["scans.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["organisation_id"], ["organisations.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("scan_id"),
    )
    op.create_index("ix_reports_org_updated", "reports", ["organisation_id", "updated_at"])


def downgrade() -> None:
    op.drop_table("reports")  # its index goes with it
