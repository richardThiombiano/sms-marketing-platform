"""add username to users

Revision ID: e5f6a7b8c9d0
Revises: d4f5a6b7c8e9
Create Date: 2026-08-01 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, None] = "d4f5a6b7c8e9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Ajouter la colonne username (nullable d'abord pour les users existants)
    op.add_column("users", sa.Column("username", sa.String(30), nullable=True))

    # Générer un username pour les utilisateurs existants (basé sur l'email)
    op.execute("""
        UPDATE users
        SET username = LOWER(REPLACE(SPLIT_PART(email, '@', 1), '.', '_'))
        WHERE username IS NULL
    """)

    # Dédupliquer les usernames générés en ajoutant un suffixe
    op.execute("""
        WITH duplicates AS (
            SELECT id, username,
                   ROW_NUMBER() OVER (PARTITION BY username ORDER BY created_at) as rn
            FROM users
        )
        UPDATE users
        SET username = users.username || duplicates.rn::text
        FROM duplicates
        WHERE users.id = duplicates.id AND duplicates.rn > 1
    """)

    # Rendre la colonne NOT NULL et ajouter l'index unique
    op.alter_column("users", "username", nullable=False)
    op.create_index("ix_users_username", "users", ["username"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_username", table_name="users")
    op.drop_column("users", "username")
