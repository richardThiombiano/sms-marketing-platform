"""add billing tables (subscriptions, payments, credit_recharges)

Revision ID: d4f5a6b7c8e9
Revises: c8e118107502
Create Date: 2026-08-01 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = "d4f5a6b7c8e9"
down_revision: Union[str, None] = "c8e118107502"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Table des paiements (créée en premier car référencée par subscriptions)
    op.create_table(
        "payments",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.String(20), nullable=False),  # subscription, recharge
        sa.Column("amount", sa.Integer, nullable=False),
        sa.Column("currency", sa.String(5), server_default="XOF"),
        sa.Column("method", sa.String(30), server_default="orange_money"),
        sa.Column("status", sa.String(20), server_default="pending"),  # pending, confirmed, rejected
        sa.Column("reference", sa.String(255)),
        sa.Column("confirmed_by", UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("confirmed_at", sa.DateTime),
        sa.Column("notes", sa.Text),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("ix_payments_tenant_id", "payments", ["tenant_id"])
    op.create_index("ix_payments_status", "payments", ["status"])

    # Table des abonnements
    op.create_table(
        "subscriptions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(20), server_default="active"),  # active, expired, cancelled
        sa.Column("amount", sa.Integer, server_default="25000"),
        sa.Column("currency", sa.String(5), server_default="XOF"),
        sa.Column("start_date", sa.DateTime, nullable=False),
        sa.Column("end_date", sa.DateTime, nullable=False),
        sa.Column("auto_renew", sa.Boolean, server_default="false"),
        sa.Column("payment_id", UUID(as_uuid=True), sa.ForeignKey("payments.id")),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("ix_subscriptions_tenant_id", "subscriptions", ["tenant_id"])
    op.create_index("ix_subscriptions_status", "subscriptions", ["status"])
    op.create_index("ix_subscriptions_end_date", "subscriptions", ["end_date"])

    # Table des rechargements de crédits SMS
    op.create_table(
        "credit_recharges",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("amount", sa.Integer, nullable=False),
        sa.Column("method", sa.String(30), server_default="orange_money"),
        sa.Column("reference", sa.String(255)),
        sa.Column("status", sa.String(20), server_default="pending"),  # pending, credited, rejected
        sa.Column("credited_by", UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("credited_at", sa.DateTime),
        sa.Column("notes", sa.Text),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("ix_credit_recharges_tenant_id", "credit_recharges", ["tenant_id"])
    op.create_index("ix_credit_recharges_status", "credit_recharges", ["status"])


def downgrade() -> None:
    op.drop_table("credit_recharges")
    op.drop_table("subscriptions")
    op.drop_table("payments")
