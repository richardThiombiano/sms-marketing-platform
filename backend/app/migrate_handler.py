"""
Lambda handler to run database migrations and seed super admin.
No dependency on psycopg2 or alembic CLI needed.

Invoke from CloudShell:
  # Run migrations:
  aws lambda invoke --function-name sms-marketing-api-MigrateFunction-xxx --payload '{}' /tmp/response.json && cat /tmp/response.json

  # Create super admin:
  aws lambda invoke --function-name sms-marketing-api-MigrateFunction-xxx --payload '{"action":"create_superadmin"}' /tmp/response.json && cat /tmp/response.json

  # Seed SMS pricing:
  aws lambda invoke --function-name sms-marketing-api-MigrateFunction-xxx --payload '{"action":"seed_pricing"}' /tmp/response.json && cat /tmp/response.json
"""
import asyncio
import os
import json
import uuid
import asyncpg


MIGRATIONS_SQL = """
-- ============================================================
-- SMS Marketing Platform — Full Schema
-- Last updated: 2026-08-09
-- ============================================================

-- ─── Tenants ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    logo_url TEXT,
    plan VARCHAR(50) NOT NULL DEFAULT 'starter',
    sms_provider VARCHAR(30) NOT NULL DEFAULT '3mi',
    smsbus_username VARCHAR(255),
    smsbus_password VARCHAR(255),
    smsbus_id VARCHAR(255),
    smsbus_sender_id VARCHAR(18),
    whatsapp_phone_number_id VARCHAR(255),
    whatsapp_business_account_id VARCHAR(255),
    whatsapp_access_token TEXT,
    whatsapp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ─── Users ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    username VARCHAR(30) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    token_version INTEGER NOT NULL DEFAULT 0,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ─── Contacts ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    phone VARCHAR(20) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    birth_date TIMESTAMP,
    gender VARCHAR(10),
    city VARCHAR(100),
    country VARCHAR(100),
    tags TEXT[] NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    is_subscribed BOOLEAN NOT NULL DEFAULT TRUE,
    subscribed_at TIMESTAMP,
    unsubscribed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ─── Contact Groups ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_dynamic BOOLEAN NOT NULL DEFAULT FALSE,
    filters JSONB,
    contact_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ─── Contact Group Members ───────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_group_members (
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES contact_groups(id) ON DELETE CASCADE,
    added_at TIMESTAMP NOT NULL DEFAULT now(),
    PRIMARY KEY (contact_id, group_id)
);

-- ─── Templates ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50),
    variables TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ─── Campaigns ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id),
    template_id UUID REFERENCES templates(id),
    name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'immediate',
    channel VARCHAR(20) NOT NULL DEFAULT 'sms',
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    target_group_id UUID REFERENCES contact_groups(id),
    target_filters JSONB,
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    total_recipients INTEGER NOT NULL DEFAULT 0,
    total_sent INTEGER NOT NULL DEFAULT 0,
    total_delivered INTEGER NOT NULL DEFAULT 0,
    total_failed INTEGER NOT NULL DEFAULT 0,
    total_clicked INTEGER NOT NULL DEFAULT 0,
    is_ab_test BOOLEAN NOT NULL DEFAULT FALSE,
    variant_a TEXT,
    variant_b TEXT,
    whatsapp_template_name VARCHAR(255),
    whatsapp_template_language VARCHAR(10),
    whatsapp_template_components JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ─── Messages ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id),
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    phone VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    channel VARCHAR(20) NOT NULL DEFAULT 'sms',
    type VARCHAR(20) NOT NULL DEFAULT 'transactional',
    status VARCHAR(20) NOT NULL DEFAULT 'queued',
    provider VARCHAR(30),
    provider_id VARCHAR(255),
    error_message TEXT,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    clicked_at TIMESTAMP,
    cost FLOAT,
    segments_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ─── Automations ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(30) NOT NULL,
    template_id UUID REFERENCES templates(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    trigger_config JSONB NOT NULL DEFAULT '{}',
    target_filters JSONB,
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,
    total_sent INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ─── Credit Transactions ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL,
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    description TEXT,
    campaign_id UUID REFERENCES campaigns(id),
    payment_ref VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ─── Webhook Logs ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    provider VARCHAR(30),
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ─── Notifications ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    data JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ─── WhatsApp Templates ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    meta_template_id VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    language VARCHAR(10) NOT NULL DEFAULT 'fr',
    category VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    components JSONB,
    body_text TEXT,
    header_text VARCHAR(255),
    footer_text VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ─── Payments ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL,
    amount INTEGER NOT NULL,
    currency VARCHAR(5) DEFAULT 'XOF',
    method VARCHAR(30) DEFAULT 'orange_money',
    status VARCHAR(20) DEFAULT 'pending',
    reference VARCHAR(255),
    confirmed_by UUID REFERENCES users(id),
    confirmed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ─── Subscriptions ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active',
    amount INTEGER DEFAULT 25000,
    currency VARCHAR(5) DEFAULT 'XOF',
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    auto_renew BOOLEAN DEFAULT FALSE,
    payment_id UUID REFERENCES payments(id),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ─── Credit Recharges ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS credit_recharges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    method VARCHAR(30) DEFAULT 'orange_money',
    reference VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending',
    credited_by UUID REFERENCES users(id),
    credited_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ─── SMS Pricing ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sms_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mcc VARCHAR(10) NOT NULL,
    mnc VARCHAR(10) NOT NULL,
    mccmnc VARCHAR(10) NOT NULL,
    operator VARCHAR(255) NOT NULL,
    country_code VARCHAR(10) NOT NULL,
    country_name VARCHAR(255) NOT NULL,
    unit_price FLOAT NOT NULL,
    route VARCHAR(10),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT now()
);

-- ─── Contact Notes ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    interaction_type VARCHAR(30) NOT NULL DEFAULT 'note',
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT now()
);

-- ─── Indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS ix_whatsapp_templates_tenant_id ON whatsapp_templates(tenant_id);
CREATE INDEX IF NOT EXISTS ix_whatsapp_templates_name ON whatsapp_templates(name);
CREATE INDEX IF NOT EXISTS ix_messages_channel ON messages(channel);
CREATE INDEX IF NOT EXISTS ix_campaigns_channel ON campaigns(channel);
CREATE INDEX IF NOT EXISTS ix_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS ix_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS ix_subscriptions_tenant_id ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS ix_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS ix_subscriptions_end_date ON subscriptions(end_date);
CREATE INDEX IF NOT EXISTS ix_credit_recharges_tenant_id ON credit_recharges(tenant_id);
CREATE INDEX IF NOT EXISTS ix_credit_recharges_status ON credit_recharges(status);
CREATE INDEX IF NOT EXISTS ix_sms_pricing_country_code ON sms_pricing(country_code);
CREATE INDEX IF NOT EXISTS ix_sms_pricing_mccmnc ON sms_pricing(mccmnc);
CREATE INDEX IF NOT EXISTS ix_contact_notes_contact_id ON contact_notes(contact_id);
CREATE INDEX IF NOT EXISTS ix_contact_notes_tenant_id ON contact_notes(tenant_id);

-- ─── Alembic version tracking ────────────────────────────────
CREATE TABLE IF NOT EXISTS alembic_version (
    version_num VARCHAR(32) NOT NULL,
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

DELETE FROM alembic_version;
INSERT INTO alembic_version (version_num) VALUES ('g7h8i9j0k1l2');
"""


# ============================================================
# SQL pour les mises à jour incrémentales (ALTER sur base existante)
# ============================================================

INCREMENTAL_SQL = """
-- Ajouts depuis la dernière version déployée

-- messages.contact_id : SET NULL au lieu de bloquer la suppression
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'messages_contact_id_fkey' AND table_name = 'messages'
    ) THEN
        ALTER TABLE messages DROP CONSTRAINT messages_contact_id_fkey;
        ALTER TABLE messages ADD CONSTRAINT messages_contact_id_fkey
            FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL;
    END IF;
END $$;
"""


async def run_migrations():
    """Connect to the database and run all migrations."""
    database_url = os.environ.get("DATABASE_URL", "")
    dsn = database_url.replace("+asyncpg", "").replace("+psycopg2", "")

    conn = await asyncpg.connect(dsn)
    try:
        await conn.execute(MIGRATIONS_SQL)
        await conn.execute(INCREMENTAL_SQL)
        tables = await conn.fetch(
            "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
        )
        return [row['tablename'] for row in tables]
    finally:
        await conn.close()


async def create_superadmin():
    """Create the platform tenant and super admin user."""
    import bcrypt

    database_url = os.environ.get("DATABASE_URL", "")
    dsn = database_url.replace("+asyncpg", "").replace("+psycopg2", "")

    tenant_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    email = "admin@sms-pro.com"
    password = "Admin@2026!"
    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    conn = await asyncpg.connect(dsn)
    try:
        # Check if superadmin already exists
        existing = await conn.fetchval(
            "SELECT id FROM users WHERE role = 'superadmin' LIMIT 1"
        )
        if existing:
            return {"message": "Super admin already exists", "user_id": str(existing)}

        # Create platform tenant
        await conn.execute("""
            INSERT INTO tenants (id, name, slug, email, plan, sms_provider, is_active, settings)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        """, uuid.UUID(tenant_id), "SMS Pro Platform", "sms-pro-platform", email,
            "enterprise", "3mi", True, '{}')

        # Create superadmin user
        await conn.execute("""
            INSERT INTO users (id, tenant_id, username, email, password_hash, first_name, last_name, role, is_active, token_version)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        """, uuid.UUID(user_id), uuid.UUID(tenant_id), "superadmin", email, password_hash,
            "Super", "Admin", "superadmin", True, 0)

        return {
            "message": "Super admin created successfully",
            "tenant_id": tenant_id,
            "user_id": user_id,
            "email": email,
            "password": password
        }
    finally:
        await conn.close()


async def seed_sms_pricing():
    """Créer et peupler la table sms_pricing avec le catalogue 3MI."""
    database_url = os.environ.get("DATABASE_URL", "")
    dsn = database_url.replace("+asyncpg", "").replace("+psycopg2", "")

    conn = await asyncpg.connect(dsn)
    try:
        # Vider la table
        await conn.execute("DELETE FROM sms_pricing")

        # Catalogue de prix 3MI
        pricing_data = [
            ("613", "2", "61302", "Celtel(Zain)", "226", "Burkina Faso", 13, "152", False),
            ("613", "3", "61303", "Telecel Faso(Moov)", "226", "Burkina Faso", 13, "147", False),
            ("613", "1", "61301", "Telmob S.A.", "226", "Burkina Faso", 13, "152", False),
            ("613", "0x", "6130x", "Other Networks", "226", "Burkina Faso", 13, "141", True),
            ("603", "1", "60301", "Mobilis", "213", "Algeria", 86.55, "138", False),
            ("603", "2", "60302", "Djezzy", "213", "Algeria", 86.55, "138", False),
            ("603", "3", "60303", "Nedjma", "213", "Algeria", 113.505, "138", False),
            ("603", "0x", "6030x", "Other Networks", "213", "Algeria", 113.505, "138", True),
            ("616", "4", "61604", "BBCOM(Bell Benin)", "229", "Benin", 65.265, "138", False),
            ("616", "2", "61602", "EtisalatBenin", "229", "Benin", 30, "138", False),
            ("616", "5", "61605", "Glomobile Benin", "229", "Benin", 15, "138", False),
            ("616", "1", "61601", "Libercom", "229", "Benin", 15, "138", False),
            ("616", "3", "61603", "MTN Benin", "229", "Benin", 15, "138", False),
            ("616", "0x", "6160x", "Other Networks", "229", "Benin", 65.265, "138", True),
            ("642", "2", "64202", "Africell", "257", "Burundi", 12.7695, "139", False),
            ("642", "3", "64203", "ONATEL", "257", "Burundi", 28.38, "139", False),
            ("642", "0x", "6420x", "Other Networks", "257", "Burundi", 28.38, "139", True),
            ("624", "1", "62401", "MTN", "237", "Cameroon", 20.85, "138", False),
            ("624", "4", "62404", "Nexttel", "237", "Cameroon", 28.38, "138", False),
            ("624", "2", "62402", "Orange", "237", "Cameroon", 19.86, "138", False),
            ("624", "0x", "6240x", "Other Networks", "237", "Cameroon", 28.38, "138", True),
            ("623", "3", "62303", "Orange", "236", "Central African Republic", 14.1885, "138", False),
            ("623", "0x", "6230x", "Other Networks", "236", "Central African Republic", 26.955, "138", True),
            ("630", "2", "63002", "Celtel(Zain)", "243", "Congo Dem. Rep.", 18.585, "153", False),
            ("630", "0x", "6300x", "Other Networks", "243", "Congo Dem. Rep.", 42.57, "153", True),
            ("629", "10", "62910", "MTN", "242", "Congo Republic", 29.79, "138", False),
            ("629", "0x", "6290x", "Other Networks", "242", "Congo Republic", 49.665, "138", True),
            ("208", "1", "20801", "Orange France", "33", "France", 9.222, "138", False),
            ("208", "10", "20810", "SFR", "33", "France", 9.222, "138", False),
            ("208", "15", "20815", "Free Mobile", "33", "France", 12.7695, "138", False),
            ("208", "20", "20820", "Bouygues Telecom", "33", "France", 12.06, "138", False),
            ("208", "25", "20825", "Lycamobile", "33", "France", 4.257, "138", False),
            ("208", "0x", "2080x", "Other Networks", "33", "France", 15.6, "138", True),
            ("620", "1", "62001", "MTN Ghana", "233", "Ghana", 9.081, "139", False),
            ("620", "2", "62002", "Vodafone Ghana", "233", "Ghana", 11.3505, "139", False),
            ("620", "0x", "6200x", "Other Networks", "233", "Ghana", 11.3505, "139", True),
            ("611", "1", "61101", "Orange Guinea", "224", "Guinea", 68.1, "138", False),
            ("611", "0x", "6110x", "Other Networks", "224", "Guinea", 68.1, "138", True),
            ("632", "3", "63203", "Orange Bissau", "245", "Guinea-Bissau", 14.1885, "139", False),
            ("632", "0x", "6320x", "Other Networks", "245", "Guinea-Bissau", 63.855, "139", True),
            ("222", "1", "22201", "TIM Italia", "39", "Italy", 42.57, "139", False),
            ("222", "10", "22210", "Vodafone Italy", "39", "Italy", 36.885, "139", False),
            ("222", "0x", "2220x", "Other Networks", "39", "Italy", 36.885, "139", True),
            ("612", "5", "61205", "MTN", "225", "Ivory Coast", 45, "138", False),
            ("612", "3", "61203", "Orange", "225", "Ivory Coast", 34.05, "138", False),
            ("612", "0x", "6120x", "Other Networks", "225", "Ivory Coast", 65.265, "138", True),
            ("610", "1", "61001", "Malitel", "223", "Mali", 63, "166", False),
            ("610", "2", "61002", "Orange Mali", "223", "Mali", 78, "166", False),
            ("610", "0x", "6100x", "Other Networks", "223", "Mali", 78, "166", True),
            ("604", "1", "60401", "IAM", "212", "Morocco", 33.345, "139", False),
            ("604", "2", "60402", "INWI", "212", "Morocco", 28.38, "139", False),
            ("604", "0x", "6040x", "Other Networks", "212", "Morocco", 34.755, "139", True),
            ("614", "2", "61402", "Airtel Niger", "227", "Niger", 6.3855, "168", False),
            ("614", "3", "61403", "Moov Niger", "227", "Niger", 6.9525, "165", False),
            ("614", "0x", "6140x", "Other Networks", "227", "Niger", 12.7695, "158", True),
            ("621", "30", "62130", "MTN Nigeria", "234", "Nigeria", 9.9315, "139", False),
            ("621", "50", "62150", "Globacom", "234", "Nigeria", 6.9525, "139", False),
            ("621", "0x", "6210x", "Other Networks", "234", "Nigeria", 65.265, "139", True),
            ("635", "10", "63510", "MTN Rwanda", "250", "Rwanda", 15.6, "139", False),
            ("635", "0x", "6350x", "Other Networks", "250", "Rwanda", 15.6, "139", True),
            ("608", "1", "60801", "Sonatel", "221", "Senegal", 38.31, "138", False),
            ("608", "2", "60802", "Tigo Senegal", "221", "Senegal", 45.405, "138", False),
            ("608", "0x", "6080x", "Other Networks", "221", "Senegal", 68.1, "138", True),
            ("615", "1", "61501", "Togocel", "228", "Togo", 29.79, "138", False),
            ("615", "0x", "6150x", "Other Networks", "228", "Togo", 51.075, "138", True),
            ("605", "1", "60501", "Orange Tunisia", "216", "Tunisia", 54.345, "139", False),
            ("605", "0x", "6050x", "Other Networks", "216", "Tunisia", 61.575, "139", True),
        ]

        count = 0
        for row in pricing_data:
            mcc, mnc, mccmnc, operator, country_code, country_name, unit_price, route, is_default = row
            await conn.execute("""
                INSERT INTO sms_pricing (id, mcc, mnc, mccmnc, operator, country_code, country_name, unit_price, route, is_default)
                VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9)
            """, mcc, mnc, mccmnc, operator, country_code, country_name, unit_price, route, is_default)
            count += 1

        return {"message": f"SMS pricing seeded: {count} entries imported"}
    finally:
        await conn.close()


def handler(event, context):
    """Lambda entry point."""
    try:
        action = event.get("action", "migrate") if event else "migrate"

        if action == "create_superadmin":
            result = asyncio.get_event_loop().run_until_complete(create_superadmin())
        elif action == "seed_pricing":
            result = asyncio.get_event_loop().run_until_complete(seed_sms_pricing())
        else:
            tables = asyncio.get_event_loop().run_until_complete(run_migrations())
            result = {"message": "Migrations completed successfully", "tables_created": tables}

        response = {"statusCode": 200, **result}
        print(json.dumps(response))
        return response
    except Exception as e:
        error_response = {"statusCode": 500, "error": str(e)}
        print(json.dumps(error_response))
        return error_response
