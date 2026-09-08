"""add sms_pricing table for multi-country SMS tarification

Revision ID: g7h8i9j0k1l2
Revises: f6a7b8c9d0e1
Create Date: 2026-08-07 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = "g7h8i9j0k1l2"
down_revision: Union[str, None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "sms_pricing",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("mcc", sa.String(10), nullable=False),
        sa.Column("mnc", sa.String(10), nullable=False),
        sa.Column("mccmnc", sa.String(10), nullable=False),
        sa.Column("operator", sa.String(255), nullable=False),
        sa.Column("country_code", sa.String(10), nullable=False),
        sa.Column("country_name", sa.String(255), nullable=False),
        sa.Column("unit_price", sa.Float, nullable=False),
        sa.Column("route", sa.String(10)),
        sa.Column("is_default", sa.Boolean, server_default="false"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("ix_sms_pricing_country_code", "sms_pricing", ["country_code"])
    op.create_index("ix_sms_pricing_mccmnc", "sms_pricing", ["mccmnc"])


def downgrade() -> None:
    op.drop_table("sms_pricing")
