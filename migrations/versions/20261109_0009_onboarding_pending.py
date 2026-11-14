"""onboarding_pending: only the admin who registered an organisation sees the setup

Revision ID: 0009
Revises: 0008
Create Date: 2026-11-09
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("onboarding_pending", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    # Organisations registered but not yet approved: their first admin has not seen the
    # setup yet, so keep it for them. Everyone else (including every existing member of
    # an approved organisation) starts without it.
    op.execute(
        "UPDATE users SET onboarding_pending = true WHERE role = 'admin' AND organisation_id IN "
        "(SELECT id FROM organisations WHERE status = 'pending')"
    )


def downgrade() -> None:
    op.drop_column("users", "onboarding_pending")
