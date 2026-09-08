from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models import Tenant, User

router = APIRouter(prefix="/tenant", tags=["Tenant"])


class TenantResponse(BaseModel):
    id: str
    name: str
    slug: str
    email: str
    phone: str | None
    plan: str
    sms_provider: str
    is_active: bool

    class Config:
        from_attributes = True


class TenantUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None


class TenantProviderUpdate(BaseModel):
    sms_provider: str


VALID_PROVIDERS = ["3mi", "twilio", "vonage", "orange"]


@router.get("", response_model=TenantResponse)
async def get_tenant(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Récupérer les infos de l'entreprise."""
    result = await db.execute(
        select(Tenant).where(Tenant.id == current_user.tenant_id)
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant non trouvé")

    return TenantResponse(
        id=str(tenant.id),
        name=tenant.name,
        slug=tenant.slug,
        email=tenant.email,
        phone=tenant.phone,
        plan=tenant.plan,
        sms_provider=tenant.sms_provider,
        is_active=tenant.is_active,
    )


@router.patch("", response_model=TenantResponse)
async def update_tenant(
    data: TenantUpdate,
    current_user: User = Depends(require_role(["owner", "admin","member"])),
    db: AsyncSession = Depends(get_db),
):
    """Modifier les infos de l'entreprise (owner/admin uniquement)."""
    result = await db.execute(
        select(Tenant).where(Tenant.id == current_user.tenant_id)
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant non trouvé")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tenant, field, value)

    await db.flush()
    await db.refresh(tenant)

    return TenantResponse(
        id=str(tenant.id),
        name=tenant.name,
        slug=tenant.slug,
        email=tenant.email,
        phone=tenant.phone,
        plan=tenant.plan,
        sms_provider=tenant.sms_provider,
        is_active=tenant.is_active,
    )


@router.patch("/provider", response_model=TenantResponse)
async def update_tenant_provider(
    data: TenantProviderUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Changer le provider SMS d'un tenant.
    RÉSERVÉ À L'ADMIN PLATEFORME (superadmin) — pas accessible aux entreprises.
    """
    # Seul un superadmin peut changer le provider
    # TODO: Ajouter un rôle "superadmin" pour l'admin plateforme
    # Pour l'instant, cette route est protégée et non exposée aux entreprises
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Seul l'administrateur de la plateforme peut modifier le provider SMS.",
    )
