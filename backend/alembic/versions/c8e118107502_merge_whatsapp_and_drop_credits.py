"""merge whatsapp and drop_credits

Revision ID: c8e118107502
Revises: a1b2c3d4e5f6, c7f8a2b1d9e3
Create Date: 2026-08-01 08:53:10.693550

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c8e118107502'
down_revision: Union[str, None] = ('a1b2c3d4e5f6', 'c7f8a2b1d9e3')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
