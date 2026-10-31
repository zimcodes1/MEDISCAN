"""profiles, organisation settings and logo, invitations

users:          job_title, phone_number, avatar_key
organisations:  logo_key, radiologist_count, default_priority, auto_assign_to_id,
                report_disclaimer
invites:        new table (token stored as a hash)

Revision ID: 0006
Revises: 0005
Create Date: 2026-10-30
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel  # noqa: F401

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch:
        batch.add_column(sa.Column("job_title", sa.String(length=100), nullable=True))
        batch.add_column(sa.Column("phone_number", sa.String(length=20), nullable=True))
        batch.add_column(sa.Column("avatar_key", sa.String(length=200), nullable=True))

    with op.batch_alter_table("organisations") as batch:
        batch.add_column(sa.Column("logo_key", sa.String(length=200), nullable=True))
        batch.add_column(sa.Column("radiologist_count", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("default_priority", sa.String(length=10), server_default="routine", nullable=False))
        batch.add_column(sa.Column("auto_assign_to_id", sa.Uuid(), nullable=True))
        batch.add_column(sa.Column("report_disclaimer", sa.Text(), server_default="", nullable=False))

    op.create_table(
        "invites",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organisation_id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("created_by_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("accepted_user_id", sa.Uuid(), nullable=True),
        sa.ForeignKeyConstraint(["organisation_id"], ["organisations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["accepted_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index("ix_invites_org_email", "invites", ["organisation_id", "email"])


def downgrade() -> None:
    op.drop_table("invites")
    with op.batch_alter_table("organisations") as batch:
        for col in ("report_disclaimer", "auto_assign_to_id", "default_priority",
                    "radiologist_count", "logo_key"):
            batch.drop_column(col)
    with op.batch_alter_table("users") as batch:
        for col in ("avatar_key", "phone_number", "job_title"):
            batch.drop_column(col)
