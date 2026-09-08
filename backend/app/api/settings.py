"""
Endpoints pour les paramètres utilisateur et entreprise.
- Profil : accessible à tous les utilisateurs
- Entreprise : accessible uniquement au owner
- Équipe : accessible uniquement au owner
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.core.security import hash_password, verify_password
from app.models import Tenant, User

router = APIRouter(prefix="/settings", tags=["Paramètres"])


# ============================================
# PROFIL UTILISATEUR
# ============================================


class ProfileUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


@router.get("/profile")
async def get_profile(
    current_user: User = Depends(get_current_user),
):
    """Récupérer le profil de l'utilisateur connecté."""
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "role": current_user.role,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
    }


@router.patch("/profile")
async def update_profile(
    data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Modifier son profil."""
    if data.email and data.email != current_user.email:
        # Vérifier que l'email n'est pas déjà pris
        existing = await db.execute(select(User).where(User.email == data.email))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cet email est déjà utilisé")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)

    await db.flush()

    return {"message": "Profil mis à jour"}


@router.post("/profile/password")
async def change_password(
    data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Changer son mot de passe."""
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mot de passe actuel incorrect",
        )

    # Valider la force du nouveau mot de passe
    from app.core.password import validate_password
    is_valid, pwd_error = validate_password(data.new_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=pwd_error,
        )

    current_user.password_hash = hash_password(data.new_password)
    current_user.token_version = (current_user.token_version or 0) + 1  # Invalide les refresh tokens existants
    await db.flush()

    return {"message": "Mot de passe modifié avec succès. Veuillez vous reconnecter."}


# ============================================
# ENTREPRISE (owner uniquement)
# ============================================


class CompanyUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None


@router.get("/company")
async def get_company(
    current_user: User = Depends(require_role(["owner"])),
    db: AsyncSession = Depends(get_db),
):
    """Récupérer les infos de l'entreprise (owner uniquement)."""
    result = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
    tenant = result.scalar_one()

    return {
        "id": str(tenant.id),
        "name": tenant.name,
        "slug": tenant.slug,
        "email": tenant.email,
        "phone": tenant.phone,
        "plan": tenant.plan,
        "sms_provider": tenant.sms_provider,
        "smsbus_sender_id": tenant.smsbus_sender_id,
        "created_at": tenant.created_at.isoformat() if tenant.created_at else None,
    }


@router.patch("/company")
async def update_company(
    data: CompanyUpdate,
    current_user: User = Depends(require_role(["owner"])),
    db: AsyncSession = Depends(get_db),
):
    """Modifier les infos de l'entreprise (owner uniquement)."""
    result = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
    tenant = result.scalar_one()

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tenant, field, value)

    await db.flush()

    return {"message": "Informations entreprise mises à jour"}


# ============================================
# ÉQUIPE (owner uniquement)
# ============================================


class TeamMemberCreate(BaseModel):
    username: str
    email: EmailStr
    first_name: str
    last_name: str
    password: str
    role: str = "member"


class TeamMemberUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    role: str | None = None
    is_active: bool | None = None


@router.get("/team")
async def list_team_members(
    current_user: User = Depends(require_role(["owner"])),
    db: AsyncSession = Depends(get_db),
):
    """Lister les membres de l'équipe (owner uniquement)."""
    result = await db.execute(
        select(User).where(User.tenant_id == current_user.tenant_id).order_by(User.created_at.asc())
    )
    users = result.scalars().all()

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
                "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ],
        "total": len(users),
    }


@router.post("/team", status_code=status.HTTP_201_CREATED)
async def add_team_member(
    data: TeamMemberCreate,
    current_user: User = Depends(require_role(["owner"])),
    db: AsyncSession = Depends(get_db),
):
    """Inviter un membre dans l'équipe (owner uniquement)."""
    # Valider le username
    import re
    username = data.username.strip().lower()
    if len(username) < 3 or len(username) > 30:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Le username doit contenir entre 3 et 30 caractères")
    if not re.match(r'^[a-z0-9._]+$', username):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Le username ne peut contenir que des lettres minuscules, chiffres, points et underscores")

    # Vérifier que le username n'est pas déjà pris
    existing_username = await db.execute(select(User).where(User.username == username))
    if existing_username.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Le username '{username}' est déjà pris")

    # Vérifier que l'email n'est pas déjà pris
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cet email est déjà utilisé")

    valid_roles = ["admin", "member"]
    if data.role not in valid_roles:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Rôle invalide. Choix: {', '.join(valid_roles)}")

    # Valider la force du mot de passe
    from app.core.password import validate_password
    is_valid, pwd_error = validate_password(data.password)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=pwd_error)

    user = User(
        tenant_id=current_user.tenant_id,
        username=username,
        email=data.email,
        password_hash=hash_password(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        role=data.role,
    )
    db.add(user)
    await db.flush()

    # Notification nouveau membre
    from app.services.notifications import notify_team_joined
    await notify_team_joined(db, current_user.tenant_id, f"{data.first_name} {data.last_name}", data.email)

    return {"message": f"Membre {data.email} ajouté", "user_id": str(user.id)}


@router.patch("/team/{user_id}")
async def update_team_member(
    user_id: UUID,
    data: TeamMemberUpdate,
    current_user: User = Depends(require_role(["owner"])),
    db: AsyncSession = Depends(get_db),
):
    """Modifier un membre de l'équipe (owner uniquement)."""
    result = await db.execute(
        select(User).where(User.id == user_id, User.tenant_id == current_user.tenant_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membre non trouvé")

    if user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Utilisez le profil pour modifier vos propres infos")

    if data.role and data.role not in ["admin", "member"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rôle invalide")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    await db.flush()

    return {"message": "Membre mis à jour"}


@router.delete("/team/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_team_member(
    user_id: UUID,
    current_user: User = Depends(require_role(["owner"])),
    db: AsyncSession = Depends(get_db),
):
    """Retirer un membre de l'équipe (owner uniquement)."""
    result = await db.execute(
        select(User).where(User.id == user_id, User.tenant_id == current_user.tenant_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membre non trouvé")

    if user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vous ne pouvez pas vous retirer vous-même")

    await db.delete(user)
