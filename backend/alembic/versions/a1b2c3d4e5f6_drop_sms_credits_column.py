"""drop sms_credits column from tenants

Revision ID: a1b2c3d4e5f6
Revises: 8342e1314c6e
Create Date: 2026-07-27 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '8342e1314c6e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('tenants', 'sms_credits')


def downgrade() -> None:
    op.add_column('tenants', sa.Column('sms_credits', sa.Integer(), nullable=False, server_default='0'))
