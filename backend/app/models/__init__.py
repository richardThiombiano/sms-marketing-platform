import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20))
    logo_url: Mapped[str | None] = mapped_column(Text)
    plan: Mapped[str] = mapped_column(String(50), default="starter")
    sms_provider: Mapped[str] = mapped_column(String(30), default="3mi")  # 3mi, twilio, vonage, orange
    smsbus_username: Mapped[str | None] = mapped_column(String(255))
    smsbus_password: Mapped[str | None] = mapped_column(String(255))
    smsbus_id: Mapped[str | None] = mapped_column(String(255))  # Terminal Web ID
    smsbus_sender_id: Mapped[str | None] = mapped_column(String(18))  # Sender ID (max 11 alphanum ou 18 chiffres)
    # WhatsApp Business API credentials
    whatsapp_phone_number_id: Mapped[str | None] = mapped_column(String(255))
    whatsapp_business_account_id: Mapped[str | None] = mapped_column(String(255))
    whatsapp_access_token: Mapped[str | None] = mapped_column(Text)
    whatsapp_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    settings: Mapped[dict] = mapped_column(JSONB, default={})
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relations
    users: Mapped[list["User"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")
    contacts: Mapped[list["Contact"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    username: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    first_name: Mapped[str | None] = mapped_column(String(100))
    last_name: Mapped[str | None] = mapped_column(String(100))
    role: Mapped[str] = mapped_column(String(20), default="member")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    token_version: Mapped[int] = mapped_column(Integer, default=0)  # Incrémenté au changement de mot de passe
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relations
    tenant: Mapped["Tenant"] = relationship(back_populates="users")

    __table_args__ = (
        {"schema": None},
    )


class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    first_name: Mapped[str | None] = mapped_column(String(100))
    last_name: Mapped[str | None] = mapped_column(String(100))
    email: Mapped[str | None] = mapped_column(String(255))
    birth_date: Mapped[datetime | None] = mapped_column(DateTime)
    gender: Mapped[str | None] = mapped_column(String(10))
    city: Mapped[str | None] = mapped_column(String(100))
    country: Mapped[str | None] = mapped_column(String(100))
    tags: Mapped[list] = mapped_column(ARRAY(Text), default=[])
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, default={})
    is_subscribed: Mapped[bool] = mapped_column(Boolean, default=True)
    subscribed_at: Mapped[datetime | None] = mapped_column(DateTime)
    unsubscribed_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relations
    tenant: Mapped["Tenant"] = relationship(back_populates="contacts")

    __table_args__ = (
        {"schema": None},
    )


class ContactGroup(Base):
    __tablename__ = "contact_groups"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    is_dynamic: Mapped[bool] = mapped_column(Boolean, default=False)
    filters: Mapped[dict | None] = mapped_column(JSONB)
    contact_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class ContactGroupMember(Base):
    __tablename__ = "contact_group_members"

    contact_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="CASCADE"), primary_key=True)
    group_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("contact_groups.id", ondelete="CASCADE"), primary_key=True)
    added_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Template(Base):
    __tablename__ = "templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str | None] = mapped_column(String(50))
    variables: Mapped[list] = mapped_column(ARRAY(Text), default=[])
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    template_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("templates.id"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String(30), nullable=False)
    channel: Mapped[str] = mapped_column(String(20), default="sms")  # sms | whatsapp
    status: Mapped[str] = mapped_column(String(20), default="draft")
    target_group_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("contact_groups.id"))
    target_filters: Mapped[dict | None] = mapped_column(JSONB)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime)
    total_recipients: Mapped[int] = mapped_column(Integer, default=0)
    total_sent: Mapped[int] = mapped_column(Integer, default=0)
    total_delivered: Mapped[int] = mapped_column(Integer, default=0)
    total_failed: Mapped[int] = mapped_column(Integer, default=0)
    total_clicked: Mapped[int] = mapped_column(Integer, default=0)
    is_ab_test: Mapped[bool] = mapped_column(Boolean, default=False)
    variant_a: Mapped[str | None] = mapped_column(Text)
    variant_b: Mapped[str | None] = mapped_column(Text)
    # WhatsApp specific
    whatsapp_template_name: Mapped[str | None] = mapped_column(String(255))
    whatsapp_template_language: Mapped[str | None] = mapped_column(String(10))
    whatsapp_template_components: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    campaign_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("campaigns.id"))
    contact_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="SET NULL"))
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    channel: Mapped[str] = mapped_column(String(20), default="sms")  # sms | whatsapp
    type: Mapped[str] = mapped_column(String(20), default="transactional")
    status: Mapped[str] = mapped_column(String(20), default="queued")
    provider: Mapped[str | None] = mapped_column(String(30))
    provider_id: Mapped[str | None] = mapped_column(String(255))
    error_message: Mapped[str | None] = mapped_column(Text)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime)
    clicked_at: Mapped[datetime | None] = mapped_column(DateTime)
    cost: Mapped[float | None] = mapped_column()
    segments_count: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class CreditTransaction(Base):
    __tablename__ = "credit_transactions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    balance_after: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    campaign_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("campaigns.id"))
    payment_ref: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Automation(Base):
    __tablename__ = "automations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(30), nullable=False)
    template_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("templates.id"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    trigger_config: Mapped[dict] = mapped_column(JSONB, nullable=False)
    target_filters: Mapped[dict | None] = mapped_column(JSONB)
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime)
    next_run_at: Mapped[datetime | None] = mapped_column(DateTime)
    total_sent: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class WebhookLog(Base):
    __tablename__ = "webhook_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    provider: Mapped[str | None] = mapped_column(String(30))
    processed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    type: Mapped[str] = mapped_column(String(30), nullable=False)  # sms_failed, low_balance, campaign_sent, team_joined
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    data: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class WhatsAppTemplate(Base):
    """
    Templates WhatsApp Business pré-approuvés par Meta.

    Chaque template doit être soumis à Meta pour approbation avant utilisation.
    Les catégories possibles sont : MARKETING, UTILITY, AUTHENTICATION.
    """

    __tablename__ = "whatsapp_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    meta_template_id: Mapped[str | None] = mapped_column(String(255))  # ID chez Meta
    name: Mapped[str] = mapped_column(String(255), nullable=False)  # Nom du template (lowercase, underscores)
    language: Mapped[str] = mapped_column(String(10), nullable=False, default="fr")
    category: Mapped[str] = mapped_column(String(30), nullable=False)  # MARKETING, UTILITY, AUTHENTICATION
    status: Mapped[str] = mapped_column(String(20), default="PENDING")  # APPROVED, PENDING, REJECTED, DISABLED
    components: Mapped[dict] = mapped_column(JSONB, default=[])  # Composants : HEADER, BODY, FOOTER, BUTTONS
    # Contenu lisible (body text) pour affichage dans l'interface
    body_text: Mapped[str | None] = mapped_column(Text)
    header_text: Mapped[str | None] = mapped_column(String(255))
    footer_text: Mapped[str | None] = mapped_column(String(255))
    # Metadata
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


# ============================================
# FACTURATION / BILLING
# ============================================


class Subscription(Base):
    """
    Abonnement mensuel d'un tenant à la plateforme.
    Prix unique : 25 000 FCFA/mois.
    Si l'abonnement expire, l'accès est totalement bloqué.
    """

    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active")  # active, expired, cancelled
    amount: Mapped[int] = mapped_column(Integer, default=25000)  # Montant en FCFA
    currency: Mapped[str] = mapped_column(String(5), default="XOF")
    start_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    auto_renew: Mapped[bool] = mapped_column(Boolean, default=False)
    payment_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("payments.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relations
    tenant: Mapped["Tenant"] = relationship(backref="subscriptions")
    payment: Mapped["Payment | None"] = relationship(foreign_keys=[payment_id])


class Payment(Base):
    """
    Paiement effectué par un tenant (abonnement ou recharge).
    Mode principal : Orange Money (code marchand + QR code).
    """

    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # subscription, recharge
    amount: Mapped[int] = mapped_column(Integer, nullable=False)  # Montant en FCFA
    currency: Mapped[str] = mapped_column(String(5), default="XOF")
    method: Mapped[str] = mapped_column(String(30), default="orange_money")  # orange_money, transfer, cash
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, confirmed, rejected
    reference: Mapped[str | None] = mapped_column(String(255))  # Référence de transaction Orange Money
    confirmed_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))  # Superadmin qui confirme
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # Relations
    tenant: Mapped["Tenant"] = relationship(backref="payments")


class CreditRecharge(Base):
    """
    Rechargement de crédits SMS sur le compte 3MI du tenant.
    Le superadmin enregistre la recharge après avoir reçu le transfert
    et crédité le compte 3MI manuellement.
    """

    __tablename__ = "credit_recharges"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)  # Montant en FCFA transféré par le client
    method: Mapped[str] = mapped_column(String(30), default="orange_money")  # orange_money, transfer, cash
    reference: Mapped[str | None] = mapped_column(String(255))  # Référence de transaction
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, credited, rejected
    credited_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))  # Superadmin qui a crédité
    credited_at: Mapped[datetime | None] = mapped_column(DateTime)
    notes: Mapped[str | None] = mapped_column(Text)  # Notes du superadmin
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # Relations
    tenant: Mapped["Tenant"] = relationship(backref="credit_recharges")


# ============================================
# TARIFICATION SMS
# ============================================


class SmsPricing(Base):
    """
    Catalogue de tarification SMS par pays/opérateur.
    Basé sur le catalogue 3MI (SMSBUS).
    Le prix unitaire est en FCFA par segment SMS.
    """

    __tablename__ = "sms_pricing"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mcc: Mapped[str] = mapped_column(String(10), nullable=False)  # Mobile Country Code
    mnc: Mapped[str] = mapped_column(String(10), nullable=False)  # Mobile Network Code
    mccmnc: Mapped[str] = mapped_column(String(10), nullable=False)  # MCC + MNC combiné
    operator: Mapped[str] = mapped_column(String(255), nullable=False)  # Nom opérateur
    country_code: Mapped[str] = mapped_column(String(10), nullable=False, index=True)  # Indicatif téléphonique (226, 33, etc.)
    country_name: Mapped[str] = mapped_column(String(255), nullable=False)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False)  # Prix unitaire par segment en FCFA
    route: Mapped[str | None] = mapped_column(String(10))  # Code route 3MI
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)  # True si c'est le tarif "Other Networks" du pays
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# ============================================
# NOTES / INTERACTIONS CONTACTS
# ============================================


class ContactNote(Base):
    """
    Note ou interaction associée à un contact.
    Permet de garder un historique des interactions client
    (visites, achats, réclamations, appels, etc.).
    """

    __tablename__ = "contact_notes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    contact_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    interaction_type: Mapped[str] = mapped_column(String(30), nullable=False, default="note")
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
