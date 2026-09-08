"""
Endpoints d'administration de la plateforme.
Accessible uniquement par le superadmin (administrateur SMS Pro).
Les entreprises n'ont PAS accès à ces endpoints.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.security import hash_password
from app.models import Tenant, User
from app.services.sms_provider import get_sms_provider

router = APIRouter(prefix="/admin", tags=["Administration Plateforme"])

VALID_PROVIDERS = ["3mi", "twilio", "vonage", "orange"]


def require_superadmin():
    """Vérifier que l'utilisateur est le superadmin de la plateforme."""

    async def checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role != "superadmin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Accès réservé à l'administrateur de la plateforme",
            )
        return current_user

    return checker


# ============================================
# SCHEMAS
# ============================================


class AdminTenantResponse(BaseModel):
    id: str
    name: str
    slug: str
    email: str
    plan: str
    sms_provider: str
    is_active: bool

    class Config:
        from_attributes = True


class AdminTenantCreate(BaseModel):
    name: str
    email: str
    phone: str | None = None
    plan: str = "starter"
    sms_provider: str = "3mi"
    # Identifiants 3MI propres à l'entreprise
    smsbus_username: str | None = None
    smsbus_password: str | None = None
    smsbus_id: str | None = None  # Terminal Web ID
    smsbus_sender_id: str | None = None
    # Infos du premier utilisateur (owner)
    owner_first_name: str
    owner_last_name: str
    owner_username: str  # Username unique pour le owner
    owner_email: str | None = None  # Si différent de l'email entreprise
    owner_password: str


class AdminProviderUpdate(BaseModel):
    sms_provider: str


# ============================================
# ENDPOINTS
# ============================================


@router.get("/tenants")
async def list_tenants(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    plan: str | None = None,
    provider: str | None = None,
    is_active: bool | None = None,
    current_user: User = Depends(require_superadmin()),
    db: AsyncSession = Depends(get_db),
):
    """Lister toutes les entreprises inscrites sur la plateforme."""
    query = select(Tenant).order_by(Tenant.created_at.desc())

    # Filtres
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            (Tenant.name.ilike(search_filter))
            | (Tenant.email.ilike(search_filter))
            | (Tenant.slug.ilike(search_filter))
        )
    if plan:
        query = query.where(Tenant.plan == plan)
    if provider:
        query = query.where(Tenant.sms_provider == provider)
    if is_active is not None:
        query = query.where(Tenant.is_active == is_active)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    result = await db.execute(query)
    tenants = result.scalars().all()

    # Récupérer les owners pour chaque tenant
    items = []
    for t in tenants:
        owner_result = await db.execute(
            select(User).where(User.tenant_id == t.id, User.role == "owner").limit(1)
        )
        owner = owner_result.scalar_one_or_none()

        items.append({
            "id": str(t.id),
            "name": t.name,
            "slug": t.slug,
            "email": t.email,
            "phone": t.phone,
            "plan": t.plan,
            "sms_provider": t.sms_provider,
            "smsbus_username": t.smsbus_username,
            "smsbus_id": t.smsbus_id,
            "smsbus_sender_id": t.smsbus_sender_id,
            "whatsapp_phone_number_id": t.whatsapp_phone_number_id,
            "whatsapp_business_account_id": t.whatsapp_business_account_id,
            "whatsapp_enabled": t.whatsapp_enabled,
            "is_active": t.is_active,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "owner": {
                "id": str(owner.id),
                "email": owner.email,
                "first_name": owner.first_name,
                "last_name": owner.last_name,
            } if owner else None,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/tenants", status_code=status.HTTP_201_CREATED)
async def create_tenant(
    data: AdminTenantCreate,
    current_user: User = Depends(require_superadmin()),
    db: AsyncSession = Depends(get_db),
):
    """
    Créer une nouvelle entreprise (tenant) avec son utilisateur owner.
    Réservé au superadmin.
    """
    # Vérifier si le nom d'entreprise existe déjà
    slug = data.name.lower().replace(" ", "-")[:100]
    existing = await db.execute(select(Tenant).where(Tenant.slug == slug))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Une entreprise avec ce nom existe déjà",
        )

    # Vérifier le provider
    if data.sms_provider not in VALID_PROVIDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Provider invalide. Choix possibles : {', '.join(VALID_PROVIDERS)}",
        )

    # Créer le tenant
    tenant = Tenant(
        name=data.name,
        slug=slug,
        email=data.email,
        phone=data.phone,
        plan=data.plan,
        sms_provider=data.sms_provider,
        smsbus_username=data.smsbus_username,
        smsbus_password=data.smsbus_password,
        smsbus_id=data.smsbus_id,
        smsbus_sender_id=data.smsbus_sender_id,
    )
    db.add(tenant)
    await db.flush()

    # Créer l'utilisateur owner
    owner_email = data.owner_email or data.email
    existing_user = await db.execute(select(User).where(User.email == owner_email))
    if existing_user.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Un utilisateur avec l'email {owner_email} existe déjà",
        )

    # Valider le username
    import re
    username = data.owner_username.strip().lower()
    if len(username) < 3 or len(username) > 30:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le username doit contenir entre 3 et 30 caractères",
        )
    if not re.match(r'^[a-z0-9._]+$', username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le username ne peut contenir que des lettres minuscules, chiffres, points et underscores",
        )
    existing_username = await db.execute(select(User).where(User.username == username))
    if existing_username.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Le username '{username}' est déjà pris",
        )

    # Valider la force du mot de passe
    from app.core.password import validate_password
    is_valid, pwd_error = validate_password(data.owner_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=pwd_error,
        )

    user = User(
        tenant_id=tenant.id,
        username=username,
        email=owner_email,
        password_hash=hash_password(data.owner_password),
        first_name=data.owner_first_name,
        last_name=data.owner_last_name,
        role="owner",
    )
    db.add(user)
    await db.flush()

    return {
        "message": f"Entreprise '{data.name}' créée avec succès",
        "tenant_id": str(tenant.id),
        "owner_id": str(user.id),
        "slug": slug,
        "sms_provider": tenant.sms_provider,
    }


@router.patch("/tenants/{tenant_id}/provider")
async def update_tenant_provider(
    tenant_id: UUID,
    data: AdminProviderUpdate,
    current_user: User = Depends(require_superadmin()),
    db: AsyncSession = Depends(get_db),
):
    """
    Changer le provider SMS d'une entreprise.
    Réservé au superadmin uniquement.
    """
    if data.sms_provider not in VALID_PROVIDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Provider invalide. Choix possibles : {', '.join(VALID_PROVIDERS)}",
        )

    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()

    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entreprise non trouvée",
        )

    tenant.sms_provider = data.sms_provider
    await db.flush()

    return {
        "message": f"Provider SMS mis à jour vers '{data.sms_provider}' pour {tenant.name}",
        "tenant_id": str(tenant.id),
        "sms_provider": tenant.sms_provider,
    }


@router.get("/tenants/{tenant_id}/balance")
async def get_tenant_balance(
    tenant_id: UUID,
    current_user: User = Depends(require_superadmin()),
    db: AsyncSession = Depends(get_db),
):
    """Récupérer le solde réel d'une entreprise depuis son provider SMS."""
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()

    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entreprise non trouvée",
        )

    try:
        provider = get_sms_provider(tenant.sms_provider, tenant=tenant)
        if hasattr(provider, "get_balance"):
            balance = await provider.get_balance()
            return {
                "tenant_id": str(tenant.id),
                "tenant_name": tenant.name,
                "amount": balance.get("amount", 0),
                "currency": balance.get("currency", "XOF"),
                "provider": tenant.sms_provider,
            }
        else:
            return {
                "tenant_id": str(tenant.id),
                "tenant_name": tenant.name,
                "amount": None,
                "currency": None,
                "provider": tenant.sms_provider,
                "error": f"Le provider {tenant.sms_provider} ne supporte pas la vérification de solde",
            }
    except Exception as e:
        return {
            "tenant_id": str(tenant.id),
            "tenant_name": tenant.name,
            "amount": None,
            "currency": None,
            "provider": tenant.sms_provider,
            "error": str(e),
        }


@router.patch("/tenants/{tenant_id}/toggle")
async def toggle_tenant(
    tenant_id: UUID,
    current_user: User = Depends(require_superadmin()),
    db: AsyncSession = Depends(get_db),
):
    """Activer/désactiver une entreprise."""
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()

    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entreprise non trouvée",
        )

    tenant.is_active = not tenant.is_active
    await db.flush()

    status_text = "activée" if tenant.is_active else "désactivée"
    return {
        "message": f"Entreprise {tenant.name} {status_text}",
        "tenant_id": str(tenant.id),
        "is_active": tenant.is_active,
    }


@router.get("/stats")
async def admin_stats(
    current_user: User = Depends(require_superadmin()),
    db: AsyncSession = Depends(get_db),
):
    """Statistiques globales de la plateforme."""
    from app.models import Contact, Message, Campaign, Automation

    total_tenants = (await db.execute(select(func.count()).select_from(Tenant))).scalar()
    active_tenants = (await db.execute(
        select(func.count()).select_from(select(Tenant).where(Tenant.is_active == True).subquery())
    )).scalar()
    total_users = (await db.execute(select(func.count()).select_from(User))).scalar()
    total_contacts = (await db.execute(select(func.count()).select_from(Contact))).scalar()
    total_messages = (await db.execute(select(func.count()).select_from(Message))).scalar()
    total_campaigns = (await db.execute(select(func.count()).select_from(Campaign))).scalar()
    total_automations = (await db.execute(select(func.count()).select_from(Automation))).scalar()
    messages_sent = (await db.execute(
        select(func.count()).select_from(
            select(Message).where(Message.status.in_(["sent", "delivered"])).subquery()
        )
    )).scalar()
    messages_failed = (await db.execute(
        select(func.count()).select_from(
            select(Message).where(Message.status == "failed").subquery()
        )
    )).scalar()

    return {
        "total_tenants": total_tenants,
        "active_tenants": active_tenants,
        "total_users": total_users,
        "total_contacts": total_contacts,
        "total_messages": total_messages,
        "messages_sent": messages_sent,
        "messages_failed": messages_failed,
        "total_campaigns": total_campaigns,
        "total_automations": total_automations,
    }


@router.get("/users")
async def list_all_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    role: str | None = None,
    is_active: bool | None = None,
    current_user: User = Depends(require_superadmin()),
    db: AsyncSession = Depends(get_db),
):
    """Lister tous les utilisateurs de la plateforme."""
    query = select(User).order_by(User.created_at.desc())

    # Filtres
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            (User.email.ilike(search_filter))
            | (User.first_name.ilike(search_filter))
            | (User.last_name.ilike(search_filter))
        )
    if role:
        query = query.where(User.role == role)
    if is_active is not None:
        query = query.where(User.is_active == is_active)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    result = await db.execute(query)
    users = result.scalars().all()

    # Récupérer les noms des tenants
    tenant_ids = list(set(u.tenant_id for u in users))
    tenants_result = await db.execute(select(Tenant).where(Tenant.id.in_(tenant_ids)))
    tenants_map = {str(t.id): t.name for t in tenants_result.scalars().all()}

    return {
        "items": [
            {
                "id": str(u.id),
                "username": u.username,
                "email": u.email,
                "first_name": u.first_name,
                "last_name": u.last_name,
                "role": u.role,
                "is_active": u.is_active,
                "tenant_id": str(u.tenant_id),
                "tenant_name": tenants_map.get(str(u.tenant_id), "—"),
                "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


class AdminUserCreate(BaseModel):
    tenant_id: str
    username: str
    email: EmailStr
    first_name: str
    last_name: str
    password: str
    role: str = "member"


@router.post("/users", status_code=status.HTTP_201_CREATED)
async def create_user(
    data: AdminUserCreate,
    current_user: User = Depends(require_superadmin()),
    db: AsyncSession = Depends(get_db),
):
    """Créer un utilisateur dans un tenant existant."""
    # Vérifier que le tenant existe
    tenant_result = await db.execute(select(Tenant).where(Tenant.id == UUID(data.tenant_id)))
    tenant = tenant_result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entreprise non trouvée")

    # Vérifier que l'email n'est pas déjà pris
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Un utilisateur avec cet email existe déjà")

    # Valider et vérifier le username
    import re
    username = data.username.strip().lower()
    if len(username) < 3 or len(username) > 30:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Le username doit contenir entre 3 et 30 caractères")
    if not re.match(r'^[a-z0-9._]+$', username):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Le username ne peut contenir que des lettres minuscules, chiffres, points et underscores")
    existing_username = await db.execute(select(User).where(User.username == username))
    if existing_username.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Le username '{username}' est déjà pris")

    # Valider le rôle
    valid_roles = ["owner", "admin", "member"]
    if data.role not in valid_roles:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Rôle invalide. Choix: {', '.join(valid_roles)}")

    user = User(
        tenant_id=UUID(data.tenant_id),
        username=username,
        email=data.email,
        password_hash=hash_password(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        role=data.role,
    )
    db.add(user)
    await db.flush()

    return {
        "message": f"Utilisateur {data.email} créé avec succès",
        "user_id": str(user.id),
        "tenant_name": tenant.name,
        "role": data.role,
    }


@router.get("/tenants/{tenant_id}/stats")
async def tenant_stats(
    tenant_id: UUID,
    current_user: User = Depends(require_superadmin()),
    db: AsyncSession = Depends(get_db),
):
    """Statistiques détaillées d'une entreprise."""
    from app.models import Contact, Message, Campaign, ContactGroup

    # Vérifier que le tenant existe
    tenant_result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = tenant_result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entreprise non trouvée")

    # Utilisateurs
    total_users = (await db.execute(
        select(func.count()).select_from(select(User).where(User.tenant_id == tenant_id).subquery())
    )).scalar()

    # Contacts
    total_contacts = (await db.execute(
        select(func.count()).select_from(select(Contact).where(Contact.tenant_id == tenant_id).subquery())
    )).scalar()
    subscribed_contacts = (await db.execute(
        select(func.count()).select_from(
            select(Contact).where(Contact.tenant_id == tenant_id, Contact.is_subscribed == True).subquery()
        )
    )).scalar()

    # Messages
    total_messages = (await db.execute(
        select(func.count()).select_from(select(Message).where(Message.tenant_id == tenant_id).subquery())
    )).scalar()
    delivered_messages = (await db.execute(
        select(func.count()).select_from(
            select(Message).where(Message.tenant_id == tenant_id, Message.status == "delivered").subquery()
        )
    )).scalar()
    failed_messages = (await db.execute(
        select(func.count()).select_from(
            select(Message).where(Message.tenant_id == tenant_id, Message.status == "failed").subquery()
        )
    )).scalar()

    # Campagnes
    total_campaigns = (await db.execute(
        select(func.count()).select_from(select(Campaign).where(Campaign.tenant_id == tenant_id).subquery())
    )).scalar()
    sent_campaigns = (await db.execute(
        select(func.count()).select_from(
            select(Campaign).where(Campaign.tenant_id == tenant_id, Campaign.status == "sent").subquery()
        )
    )).scalar()

    # Groupes
    total_groups = (await db.execute(
        select(func.count()).select_from(select(ContactGroup).where(ContactGroup.tenant_id == tenant_id).subquery())
    )).scalar()

    # Taux de délivrance
    delivery_rate = round((delivered_messages / total_messages * 100), 1) if total_messages > 0 else 0

    # Récupérer le solde réel depuis le provider
    balance_info = {"amount": None, "currency": None}
    try:
        provider = get_sms_provider(tenant.sms_provider, tenant=tenant)
        if hasattr(provider, "get_balance"):
            balance = await provider.get_balance()
            balance_info = {"amount": balance.get("amount", 0), "currency": balance.get("currency", "XOF")}
    except Exception:
        pass

    return {
        "tenant": {
            "id": str(tenant.id),
            "name": tenant.name,
            "email": tenant.email,
            "plan": tenant.plan,
            "balance": balance_info,
            "sms_provider": tenant.sms_provider,
            "is_active": tenant.is_active,
            "created_at": tenant.created_at.isoformat() if tenant.created_at else None,
        },
        "users": {
            "total": total_users,
        },
        "contacts": {
            "total": total_contacts,
            "subscribed": subscribed_contacts,
            "unsubscribed": total_contacts - subscribed_contacts,
        },
        "messages": {
            "total": total_messages,
            "delivered": delivered_messages,
            "failed": failed_messages,
            "delivery_rate": delivery_rate,
        },
        "campaigns": {
            "total": total_campaigns,
            "sent": sent_campaigns,
        },
        "groups": {
            "total": total_groups,
        },
    }


class AdminTenantUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    plan: str | None = None
    sms_provider: str | None = None
    smsbus_username: str | None = None
    smsbus_password: str | None = None
    smsbus_id: str | None = None
    smsbus_sender_id: str | None = None
    # WhatsApp Business API
    whatsapp_phone_number_id: str | None = None
    whatsapp_business_account_id: str | None = None
    whatsapp_access_token: str | None = None
    whatsapp_enabled: bool | None = None


@router.patch("/tenants/{tenant_id}")
async def update_tenant(
    tenant_id: UUID,
    data: AdminTenantUpdate,
    current_user: User = Depends(require_superadmin()),
    db: AsyncSession = Depends(get_db),
):
    """Modifier les informations d'une entreprise."""
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entreprise non trouvée")

    if data.sms_provider and data.sms_provider not in VALID_PROVIDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Provider invalide. Choix: {', '.join(VALID_PROVIDERS)}",
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tenant, field, value)

    await db.flush()
    await db.refresh(tenant)

    return {
        "message": f"Entreprise '{tenant.name}' mise à jour",
        "tenant_id": str(tenant.id),
    }


class AdminUserUpdate(BaseModel):
    email: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    role: str | None = None
    is_active: bool | None = None
    password: str | None = None


@router.patch("/users/{user_id}")
async def update_user(
    user_id: UUID,
    data: AdminUserUpdate,
    current_user: User = Depends(require_superadmin()),
    db: AsyncSession = Depends(get_db),
):
    """Modifier les informations d'un utilisateur."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur non trouvé")

    if data.role and data.role not in ["owner", "admin", "member"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rôle invalide. Choix: owner, admin, member",
        )

    update_data = data.model_dump(exclude_unset=True)

    # Si le mot de passe est modifié, le hasher
    if "password" in update_data and update_data["password"]:
        update_data["password_hash"] = hash_password(update_data.pop("password"))
    else:
        update_data.pop("password", None)

    for field, value in update_data.items():
        setattr(user, field, value)

    await db.flush()

    return {
        "message": f"Utilisateur '{user.email}' mis à jour",
        "user_id": str(user.id),
    }


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: UUID,
    current_user: User = Depends(require_superadmin()),
    db: AsyncSession = Depends(get_db),
):
    """Supprimer un utilisateur."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur non trouvé")

    if user.role == "superadmin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Impossible de supprimer le superadmin")

    await db.delete(user)


@router.patch("/users/{user_id}/toggle")
async def toggle_user(
    user_id: UUID,
    current_user: User = Depends(require_superadmin()),
    db: AsyncSession = Depends(get_db),
):
    """Activer/désactiver un utilisateur."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur non trouvé")

    if user.role == "superadmin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Impossible de désactiver le superadmin")

    user.is_active = not user.is_active
    await db.flush()

    status_text = "activé" if user.is_active else "désactivé"
    return {
        "message": f"Utilisateur {user.email} {status_text}",
        "user_id": str(user.id),
        "is_active": user.is_active,
    }


@router.get("/workers")
async def workers_status(
    current_user: User = Depends(require_superadmin()),
    db: AsyncSession = Depends(get_db),
):
    """Statut et statistiques des workers."""
    from datetime import datetime, timedelta
    from app.models import Automation, Campaign, Message

    now = datetime.utcnow()

    # --- Scheduler (campagnes programmées) ---
    # Dernière campagne envoyée
    last_campaign_sent = (await db.execute(
        select(Campaign)
        .where(Campaign.status == "sent", Campaign.sent_at.isnot(None))
        .order_by(Campaign.sent_at.desc())
        .limit(1)
    )).scalar_one_or_none()

    # Campagnes en attente
    pending_campaigns = (await db.execute(
        select(func.count()).select_from(
            select(Campaign).where(Campaign.status == "scheduled").subquery()
        )
    )).scalar()

    # Campagnes envoyées ces 24h
    campaigns_last_24h = (await db.execute(
        select(func.count()).select_from(
            select(Campaign).where(
                Campaign.status == "sent",
                Campaign.sent_at >= now - timedelta(hours=24),
            ).subquery()
        )
    )).scalar()

    # --- Automation worker ---
    # Dernière automation exécutée
    last_automation_run = (await db.execute(
        select(Automation)
        .where(Automation.last_run_at.isnot(None))
        .order_by(Automation.last_run_at.desc())
        .limit(1)
    )).scalar_one_or_none()

    # Automations actives
    active_automations = (await db.execute(
        select(func.count()).select_from(
            select(Automation).where(Automation.is_active == True).subquery()
        )
    )).scalar()

    # Total SMS envoyés par les automations (via total_sent)
    total_automation_sms = (await db.execute(
        select(func.coalesce(func.sum(Automation.total_sent), 0))
    )).scalar() or 0

    # --- Messages globaux ces 24h ---
    messages_last_24h = (await db.execute(
        select(func.count()).select_from(
            select(Message).where(Message.created_at >= now - timedelta(hours=24)).subquery()
        )
    )).scalar()

    messages_failed_24h = (await db.execute(
        select(func.count()).select_from(
            select(Message).where(
                Message.created_at >= now - timedelta(hours=24),
                Message.status == "failed",
            ).subquery()
        )
    )).scalar()

    # --- Logs récents (dernières campagnes et automations exécutées) ---
    recent_campaigns = (await db.execute(
        select(Campaign)
        .where(Campaign.sent_at.isnot(None))
        .order_by(Campaign.sent_at.desc())
        .limit(5)
    )).scalars().all()

    recent_automations = (await db.execute(
        select(Automation)
        .where(Automation.last_run_at.isnot(None))
        .order_by(Automation.last_run_at.desc())
        .limit(5)
    )).scalars().all()

    return {
        "scheduler": {
            "last_run_at": last_campaign_sent.sent_at.isoformat() if last_campaign_sent and last_campaign_sent.sent_at else None,
            "last_campaign_name": last_campaign_sent.name if last_campaign_sent else None,
            "pending_campaigns": pending_campaigns,
            "campaigns_last_24h": campaigns_last_24h,
            "status": "active" if last_campaign_sent and last_campaign_sent.sent_at and (now - last_campaign_sent.sent_at).total_seconds() < 86400 else "idle",
        },
        "automation_worker": {
            "last_run_at": last_automation_run.last_run_at.isoformat() if last_automation_run and last_automation_run.last_run_at else None,
            "last_automation_name": last_automation_run.name if last_automation_run else None,
            "active_automations": active_automations,
            "total_sms_sent": total_automation_sms,
            "status": "active" if last_automation_run and last_automation_run.last_run_at and (now - last_automation_run.last_run_at).total_seconds() < 600 else "idle",
        },
        "global": {
            "messages_last_24h": messages_last_24h,
            "messages_failed_24h": messages_failed_24h,
        },
        "recent_activity": [
            *[
                {
                    "type": "campaign",
                    "name": c.name,
                    "status": c.status,
                    "total_sent": c.total_sent,
                    "total_failed": c.total_failed,
                    "executed_at": c.sent_at.isoformat() if c.sent_at else None,
                }
                for c in recent_campaigns
            ],
            *[
                {
                    "type": "automation",
                    "name": a.name,
                    "status": "executed",
                    "total_sent": a.total_sent,
                    "total_failed": 0,
                    "executed_at": a.last_run_at.isoformat() if a.last_run_at else None,
                }
                for a in recent_automations
            ],
        ],
    }


# ============================================
# INSCRIPTIONS EN ATTENTE
# ============================================


@router.get("/pending-registrations")
async def list_pending_registrations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_superadmin()),
    db: AsyncSession = Depends(get_db),
):
    """Lister les demandes d'inscription en attente de validation."""
    query = (
        select(Tenant)
        .where(Tenant.is_active == False)
        .order_by(Tenant.created_at.desc())
    )

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    tenants = result.scalars().all()

    items = []
    for t in tenants:
        # Récupérer le owner
        owner_result = await db.execute(
            select(User).where(User.tenant_id == t.id, User.role == "owner").limit(1)
        )
        owner = owner_result.scalar_one_or_none()

        items.append({
            "id": str(t.id),
            "company_name": t.name,
            "slug": t.slug,
            "email": t.email,
            "phone": t.phone,
            "sender_id": t.smsbus_sender_id,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "owner": {
                "id": str(owner.id) if owner else None,
                "username": owner.username if owner else None,
                "first_name": owner.first_name if owner else None,
                "last_name": owner.last_name if owner else None,
                "email": owner.email if owner else None,
            } if owner else None,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/pending-registrations/{tenant_id}/approve")
async def approve_registration(
    tenant_id: UUID,
    current_user: User = Depends(require_superadmin()),
    db: AsyncSession = Depends(get_db),
):
    """
    Approuver une demande d'inscription.
    Active le tenant et le user owner, puis envoie un SMS de confirmation.
    """
    from datetime import datetime

    # Récupérer le tenant
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()

    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demande non trouvée",
        )

    if tenant.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cette entreprise est déjà active",
        )

    # Activer le tenant
    tenant.is_active = True

    # Activer le owner
    owner_result = await db.execute(
        select(User).where(User.tenant_id == tenant.id, User.role == "owner").limit(1)
    )
    owner = owner_result.scalar_one_or_none()

    if owner:
        owner.is_active = True

    await db.flush()

    # Envoyer un SMS de confirmation au owner (via le compte plateforme, pas celui du client)
    if tenant.phone:
        try:
            from app.core.config import get_settings
            platform_settings = get_settings()
            provider = get_sms_provider("3mi")  # Provider plateforme (sans tenant = utilise les settings globaux)
            sms_content = (
                f"SMS Pro - Bienvenue ! Votre compte a été activé.\n"
                f"Identifiant : {owner.username if owner else tenant.email}\n"
                f"Connectez-vous sur l'application pour commencer."
            )
            await provider.send(
                phone=tenant.phone,
                content=sms_content,
                sender=platform_settings.smsbus_sender_id or "SMSPro",
            )
        except Exception:
            pass  # Ne pas bloquer si le SMS échoue

    return {
        "message": f"Inscription de '{tenant.name}' approuvée. Le propriétaire a été notifié par SMS.",
        "tenant_id": str(tenant.id),
        "owner_username": owner.username if owner else None,
    }


@router.post("/pending-registrations/{tenant_id}/reject")
async def reject_registration(
    tenant_id: UUID,
    current_user: User = Depends(require_superadmin()),
    db: AsyncSession = Depends(get_db),
):
    """
    Rejeter une demande d'inscription.
    Supprime le tenant et le user associé.
    """
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()

    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demande non trouvée",
        )

    if tenant.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossible de rejeter une entreprise déjà active. Utilisez la désactivation.",
        )

    # Supprimer le owner
    await db.execute(
        select(User).where(User.tenant_id == tenant.id)
    )
    owners = (await db.execute(select(User).where(User.tenant_id == tenant.id))).scalars().all()
    for u in owners:
        await db.delete(u)

    # Supprimer le tenant
    await db.delete(tenant)
    await db.flush()

    return {
        "message": f"Demande d'inscription de '{tenant.name}' rejetée et supprimée.",
    }
