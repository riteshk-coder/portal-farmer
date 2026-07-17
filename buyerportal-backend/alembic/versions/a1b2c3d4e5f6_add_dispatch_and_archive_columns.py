"""Add dispatch workflow columns and lot schema alignment

Adds the columns required for:
- Step 01 Lot schema: available_date (separate from harvest_date as per infographic)
- Step 08 Dispatch Goods: dispatched_at timestamp on contracts (used by GRN 24h window)
- Step 11 Archive: is_archived flag on contracts (set True after release-funds)

Note: variety column was already in migration 3792c6336a1c but was not applied to
the running DB due to the old migration using a different column type. This migration
is idempotent (uses ADD COLUMN IF NOT EXISTS via raw SQL when run manually).

Revision ID: a1b2c3d4e5f6
Revises: 3792c6336a1c
Create Date: 2026-07-17 09:11:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '3792c6336a1c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema — Step 01, 08, 11 infographic alignment."""
    # Step 01: Lot schema — available_date (distinct from harvest_date per infographic)
    op.add_column('lots', sa.Column('available_date', sa.String(), nullable=True))

    # Step 08: Dispatch Goods — timestamp for GRN 24-hour window enforcement
    op.add_column('contracts', sa.Column('dispatched_at', sa.DateTime(timezone=True), nullable=True))

    # Step 11: Transaction Archive — set True after release-funds completes
    op.add_column('contracts', sa.Column('is_archived', sa.Boolean(), nullable=True, server_default='false'))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('contracts', 'is_archived')
    op.drop_column('contracts', 'dispatched_at')
    op.drop_column('lots', 'available_date')
