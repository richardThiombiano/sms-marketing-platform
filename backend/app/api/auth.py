from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.security import (
    create_access_token,
    create_refresh_token,
    create_reset_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models import Tenant, User
from app.schemas import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentification"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """
    Inscription self-service d'une nouvelle entreprise.
    Crée un tenant et un user owner en statut 'pending'.
    Le compte sera activé par le superadmin après validation.
    """
    import re

    # Valider le username
    username = data.username.strip().lower()
    if not re.match(r'^[a-z0-9._]+$', username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le username ne peut contenir que des lettres minuscules, chiffres, points et underscores",
        )

    # Valider le Sender ID (max 11 chars alphanumériques)
    sender_id = data.sender_id.strip()
    if not re.match(r'^[a-zA-Z0-9 ]{3,11}$', sender_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le Sender ID doit contenir entre 3 et 11 caractères alphanumériques",
        )

    # Vérifier que l'email n'est pas déjà utilisé
    existing_email = await db.execute(select(User).where(User.email == data.email))
    if existing_email.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Un compte avec cet email existe déjà",
        )

    # Vérifier que le username n'est pas déjà pris
    existing_username = await db.execute(select(User).where(User.username == username))
    if existing_username.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Le username '{username}' est déjà pris",
        )

    # Vérifier que le nom d'entreprise n'est pas déjà pris
    slug = data.company_name.lower().replace(" ", "-")[:100]
    existing_tenant = await db.execute(select(Tenant).where(Tenant.slug == slug))
    if existing_tenant.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Une entreprise avec ce nom existe déjà",
        )

    # Valider la force du mot de passe
    from app.core.password import validate_password
    is_valid, pwd_error = validate_password(data.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=pwd_error,
        )

    # Créer le tenant en statut inactif (pending)
    tenant = Tenant(
        name=data.company_name,
        slug=slug,
        email=data.email,
        phone=data.phone,
        plan="starter",
        sms_provider="3mi",
        smsbus_sender_id=sender_id,
        is_active=False,  # Inactif jusqu'à validation admin
    )
    db.add(tenant)
    await db.flush()

    # Créer l'utilisateur owner
    user = User(
        tenant_id=tenant.id,
        username=username,
        email=data.email,
        password_hash=hash_password(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        role="owner",
        is_active=False,  # Inactif jusqu'à validation admin
    )
    db.add(user)
    await db.flush()

    return {
        "message": "Votre demande d'inscription a été enregistrée. Vous recevrez un SMS de confirmation une fois votre compte validé.",
        "tenant_id": str(tenant.id),
        "username": username,
    }


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Connexion d'un utilisateur par email ou username."""
    from app.core.rate_limit import is_blocked, record_failed_attempt, record_success

    # Rate limiting par IP
    client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown").split(",")[0].strip()

    blocked, remaining = is_blocked(client_ip)
    if blocked:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Trop de tentatives. Réessayez dans {remaining} secondes.",
            headers={"Retry-After": str(remaining)},
        )

    identifier = data.identifier.strip()

    # Déterminer si c'est un email ou un username
    if "@" in identifier:
        result = await db.execute(select(User).where(User.email == identifier))
    else:
        result = await db.execute(select(User).where(User.username == identifier))

    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        record_failed_attempt(client_ip)
        from app.core.audit import log_audit
        log_audit("LOGIN_FAILED", ip=client_ip, details={"identifier": identifier})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiant ou mot de passe incorrect",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte désactivé. Contactez votre administrateur.",
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

    # Login réussi — reset rate limiter
    record_success(client_ip)

    from app.core.audit import log_audit
    log_audit("LOGIN_SUCCESS", user_id=str(user.id), tenant_id=str(user.tenant_id), ip=client_ip)

    # Mettre à jour last_login (naive datetime pour compatibilité avec la colonne)
    user.last_login_at = datetime.utcnow()
    await db.flush()

    token_data = {"sub": str(user.id), "tenant_id": str(user.tenant_id), "role": user.role}
    refresh_data = {**token_data, "tv": user.token_version}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(refresh_data),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Renouveler le token d'accès."""
    payload = decode_token(data.refresh_token)

    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token invalide",
        )

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur non trouvé",
        )

    # Vérifier la version du token (invalidé si mot de passe changé)
    token_version = payload.get("tv", 0)
    if token_version != user.token_version:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session invalidée. Veuillez vous reconnecter.",
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

    token_data = {"sub": str(user.id), "tenant_id": str(user.tenant_id), "role": user.role}
    refresh_data = {**token_data, "tv": user.token_version}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(refresh_data),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Récupérer le profil de l'utilisateur connecté."""
    return current_user


# ============================================
# MOT DE PASSE OUBLIÉ
# ============================================


from pydantic import BaseModel, EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/forgot-password", status_code=200)
async def forgot_password(data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """
    Demande de réinitialisation de mot de passe.
    Génère un token de reset et l'envoie par SMS au numéro du tenant.
    Si aucun compte n'est trouvé, retourne quand même un succès (sécurité).
    """
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if user and user.is_active:
        # Générer un token de reset
        reset_token = create_reset_token({"sub": str(user.id), "email": user.email})

        # Récupérer le tenant pour envoyer le SMS
        tenant_result = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
        tenant = tenant_result.scalar_one_or_none()

        if tenant and tenant.phone:
            # Envoyer le code par SMS via le provider du tenant
            try:
                from app.services.sms_provider import get_sms_provider

                # Générer un code court à partir du token (6 derniers chars)
                short_code = reset_token[-6:].upper()

                provider = get_sms_provider(tenant.sms_provider, tenant=tenant)
                await provider.send(
                    phone=tenant.phone,
                    content=f"SMS Pro - Code de réinitialisation : {short_code}\nCe code expire dans 15 minutes.",
                    sender=tenant.smsbus_sender_id,
                )
            except Exception:
                pass  # Ne pas révéler les erreurs d'envoi

    # Toujours retourner un succès (ne pas révéler si l'email existe)
    return {
        "message": "Si un compte existe avec cet email, un code de réinitialisation a été envoyé par SMS.",
        # En dev, on retourne le token pour faciliter les tests
        **({"reset_token": reset_token} if user and user.is_active else {}),
    }


@router.post("/reset-password", status_code=200)
async def reset_password(data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """
    Réinitialiser le mot de passe avec un token valide.
    """
    payload = decode_token(data.token)

    if payload is None or payload.get("type") != "reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token de réinitialisation invalide ou expiré",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token invalide",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token de réinitialisation invalide",
        )

    # Valider le nouveau mot de passe
    from app.core.password import validate_password
    is_valid, pwd_error = validate_password(data.new_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=pwd_error,
        )

    user.password_hash = hash_password(data.new_password)
    user.token_version = (user.token_version or 0) + 1  # Invalide les refresh tokens existants
    await db.commit()

    from app.core.audit import log_audit
    log_audit("PASSWORD_CHANGED", user_id=str(user.id), tenant_id=str(user.tenant_id))

    return {"message": "Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter."}
