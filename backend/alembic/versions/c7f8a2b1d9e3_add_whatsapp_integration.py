"""add whatsapp integration

Revision ID: c7f8a2b1d9e3
Revises: 8342e1314c6e
Create Date: 2026-07-30 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c7f8a2b1d9e3'
down_revision: Union[str, None] = '8342e1314c6e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ─── Tenant : ajout des credentials WhatsApp ─────────────────────
    op.add_column('tenants', sa.Column('whatsapp_phone_number_id', sa.String(length=255), nullable=True))
    op.add_column('tenants', sa.Column('whatsapp_business_account_id', sa.String(length=255), nullable=True))
    op.add_column('tenants', sa.Column('whatsapp_access_token', sa.Text(), nullable=True))
    op.add_column('tenants', sa.Column('whatsapp_enabled', sa.Boolean(), nullable=False, server_default=sa.text('false')))

    # ─── Campaign : ajout du canal et des champs template WhatsApp ───
    op.add_column('campaigns', sa.Column('channel', sa.String(length=20), nullable=False, server_default='sms'))
    op.add_column('campaigns', sa.Column('whatsapp_template_name', sa.String(length=255), nullable=True))
    op.add_column('campaigns', sa.Column('whatsapp_template_language', sa.String(length=10), nullable=True))
    op.add_column('campaigns', sa.Column('whatsapp_template_components', postgresql.JSONB(astext_type=sa.Text()), nullable=True))

    # ─── Message : ajout du canal ────────────────────────────────────
    op.add_column('messages', sa.Column('channel', sa.String(length=20), nullable=False, server_default='sms'))

    # ─── WhatsApp Templates : nouvelle table ─────────────────────────
    op.create_table('whatsapp_templates',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('tenant_id', sa.UUID(), nullable=False),
        sa.Column('meta_template_id', sa.String(length=255), nullable=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('language', sa.String(length=10), nullable=False, server_default='fr'),
        sa.Column('category', sa.String(length=30), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='PENDING'),
        sa.Column('components', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('body_text', sa.Text(), nullable=True),
        sa.Column('header_text', sa.String(length=255), nullable=True),
        sa.Column('footer_text', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('last_synced_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # Index pour recherches fréquentes
    op.create_index('ix_whatsapp_templates_tenant_id', 'whatsapp_templates', ['tenant_id'])
    op.create_index('ix_whatsapp_templates_name', 'whatsapp_templates', ['name'])
    op.create_index('ix_messages_channel', 'messages', ['channel'])
    op.create_index('ix_campaigns_channel', 'campaigns', ['channel'])


def downgrade() -> None:
    # ─── Supprimer les index ─────────────────────────────────────────
    op.drop_index('ix_campaigns_channel', table_name='campaigns')
    op.drop_index('ix_messages_channel', table_name='messages')
    op.drop_index('ix_whatsapp_templates_name', table_name='whatsapp_templates')
    op.drop_index('ix_whatsapp_templates_tenant_id', table_name='whatsapp_templates')

    # ─── Supprimer la table whatsapp_templates ───────────────────────
    op.drop_table('whatsapp_templates')

    # ─── Message : retirer le canal ──────────────────────────────────
    op.drop_column('messages', 'channel')

    # ─── Campaign : retirer les champs WhatsApp ──────────────────────
    op.drop_column('campaigns', 'whatsapp_template_components')
    op.drop_column('campaigns', 'whatsapp_template_language')
    op.drop_column('campaigns', 'whatsapp_template_name')
    op.drop_column('campaigns', 'channel')

    # ─── Tenant : retirer les credentials WhatsApp ───────────────────
    op.drop_column('tenants', 'whatsapp_enabled')
    op.drop_column('tenants', 'whatsapp_access_token')
    op.drop_column('tenants', 'whatsapp_business_account_id')
    op.drop_column('tenants', 'whatsapp_phone_number_id')
