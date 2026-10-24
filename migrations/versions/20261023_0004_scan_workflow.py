"""scan workflow: clinical fields, review state, activity feed

Adds to `scans`: priority, projection, exam_date, clinical_notes, assigned_to_id,
review_status, reviewed_at, reviewed_by_id. Existing scans become priority
'routine' and review_status 'pending' (server defaults). Creates `activities`.

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-23
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel  # noqa: F401

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("scans") as batch:
        batch.add_column(sa.Column("priority", sa.String(length=10), server_default="routine", nullable=False))
        batch.add_column(sa.Column("projection", sa.String(length=10), nullable=True))
        batch.add_column(sa.Column("exam_date", sa.Date(), nullable=True))
        batch.add_column(sa.Column("clinical_notes", sa.String(length=2000), nullable=True))
        batch.add_column(sa.Column("assigned_to_id", sa.Uuid(), nullable=True))
        batch.add_column(sa.Column("review_status", sa.String(length=10), server_default="pending", nullable=False))
        batch.add_column(sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True))
        batch.add_column(sa.Column("reviewed_by_id", sa.Uuid(), nullable=True))
        batch.create_foreign_key("fk_scans_assigned_to_id", "users", ["assigned_to_id"], ["id"], ondelete="SET NULL")
        batch.create_foreign_key("fk_scans_reviewed_by_id", "users", ["reviewed_by_id"], ["id"], ondelete="SET NULL")
        batch.create_index("ix_scans_assigned_to_id", ["assigned_to_id"])
        batch.create_index("ix_scans_org_review", ["organisation_id", "review_status"])

    op.create_table(
        "activities",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organisation_id", sa.Uuid(), nullable=False),
        sa.Column("type", sa.String(length=30), nullable=False),
        sa.Column("message", sa.String(length=300), nullable=False),
        sa.Column("actor_id", sa.Uuid(), nullable=False),
        sa.Column("scan_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organisation_id"], ["organisations.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["scan_id"], ["scans.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_activities_org_created", "activities", ["organisation_id", "created_at"])
    op.create_index("ix_activities_actor_id", "activities", ["actor_id"])
    op.create_index("ix_activities_scan_id", "activities", ["scan_id"])


def downgrade() -> None:
    op.drop_table("activities")  # its indexes go with it
    with op.batch_alter_table("scans") as batch:
        batch.drop_index("ix_scans_org_review")
        batch.drop_index("ix_scans_assigned_to_id")
        batch.drop_constraint("fk_scans_reviewed_by_id", type_="foreignkey")
        batch.drop_constraint("fk_scans_assigned_to_id", type_="foreignkey")
        for col in ("reviewed_by_id", "reviewed_at", "review_status", "assigned_to_id",
                    "clinical_notes", "exam_date", "projection", "priority"):
            batch.drop_column(col)
