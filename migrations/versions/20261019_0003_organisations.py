"""organisations: multi-tenancy foundation

Creates `organisations`, adds `organisation_id` to users/patients/scans and
`users.is_platform_admin`, backfills every existing row into one default
organisation, then makes `organisation_id` NOT NULL.

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-19
"""
import uuid
from datetime import datetime, timezone
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel  # noqa: F401

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLES = ("users", "patients", "scans")
DEFAULT_ORG_NAME = "Default Organisation"  # keep equal to DEFAULT_ORGANISATION_NAME


def upgrade() -> None:
    orgs = op.create_table(
        "organisations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("type", sa.String(length=30), nullable=False),
        sa.Column("state", sa.String(length=50), nullable=True),
        sa.Column("phone_number", sa.String(length=20), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    default_id = uuid.uuid4()
    op.bulk_insert(orgs, [{
        "id": default_id, "name": DEFAULT_ORG_NAME, "type": "clinic",
        "state": None, "phone_number": None, "status": "active",
        "created_at": datetime.now(timezone.utc),
    }])

    # 1) add nullable column + FK. batch mode so SQLite (table rebuild) works too.
    for table in TABLES:
        with op.batch_alter_table(table) as batch:
            batch.add_column(sa.Column("organisation_id", sa.Uuid(), nullable=True))
            batch.create_foreign_key(
                f"fk_{table}_organisation_id", "organisations",
                ["organisation_id"], ["id"], ondelete="RESTRICT",
            )
    with op.batch_alter_table("users") as batch:
        batch.add_column(sa.Column(
            "is_platform_admin", sa.Boolean(), server_default=sa.false(), nullable=False
        ))

    # 2) backfill everything into the default organisation.
    for table in TABLES:
        op.execute(
            sa.text(f"UPDATE {table} SET organisation_id = :oid").bindparams(
                sa.bindparam("oid", default_id, type_=sa.Uuid())
            )
        )

    # 3) NOT NULL + indexes.
    for table in TABLES:
        with op.batch_alter_table(table) as batch:
            batch.alter_column("organisation_id", existing_type=sa.Uuid(), nullable=False)
            batch.create_index(f"ix_{table}_organisation_id", ["organisation_id"])
    op.create_index("ix_scans_org_created", "scans", ["organisation_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_scans_org_created", table_name="scans")
    with op.batch_alter_table("users") as batch:
        batch.drop_column("is_platform_admin")
    for table in reversed(TABLES):
        with op.batch_alter_table(table) as batch:
            batch.drop_index(f"ix_{table}_organisation_id")
            batch.drop_constraint(f"fk_{table}_organisation_id", type_="foreignkey")
            batch.drop_column("organisation_id")
    op.drop_table("organisations")
