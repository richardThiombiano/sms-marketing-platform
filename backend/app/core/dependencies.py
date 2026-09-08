from datetime import datetime
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token
from app.models import Subscription, Tenant, User

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extraire et valider l'utilisateur courant depuis le JWT."""
    token = credentials.credentials
    payload = decode_token(token)

    if payload is None or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré",
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide",
        )

    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur non trouvé ou désactivé",
        )

    # Vérifier que le tenant est actif (sauf pour les superadmins)
    if user.role != "superadmin" and user.tenant_id:
        tenant_result = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
        tenant = tenant_result.scalar_one_or_none()
        if tenant is None or not tenant.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Votre entreprise a été désactivée. Contactez l'administrateur de la plateforme.",
            )

    return user


async def get_current_user_with_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Vérifier que l'utilisateur a un abonnement actif.
    Bloque totalement l'accès si l'abonnement est expiré.
    Les superadmins ne sont pas soumis à cette vérification.
    """
    if current_user.role == "superadmin":
        return current_user

    # Chercher un abonnement actif et non expiré pour le tenant
    now = datetime.utcnow()
    sub_result = await db.execute(
        select(Subscription).where(
            Subscription.tenant_id == current_user.tenant_id,
            Subscription.status == "active",
            Subscription.end_date >= now,
        ).order_by(Subscription.end_date.desc()).limit(1)
    )
    subscription = sub_result.scalar_one_or_none()

    if subscription is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Votre abonnement a expiré. Veuillez renouveler votre abonnement pour continuer à utiliser la plateforme.",
            headers={"X-Subscription-Expired": "true"},
        )

    return current_user


def require_role(allowed_roles: list[str]):
    """Vérifier que l'utilisateur a un rôle autorisé."""

    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permissions insuffisantes",
            )
        return current_user

    return role_checker


def require_active_subscription():
    """
    Dependency qui bloque l'accès si l'abonnement est expiré.
    À utiliser sur les routes qui nécessitent un abonnement actif.
    """

    async def subscription_checker(
        current_user: User = Depends(get_current_user_with_subscription),
    ) -> User:
        return current_user

    return subscription_checker
