"""
WhatsApp Embedded Signup — Onboarding client.

Permet aux owners d'entreprise de connecter leur compte WhatsApp Business
directement depuis l'interface, sans configuration manuelle.

Flow :
1. Le frontend charge le SDK Facebook JS et lance le popup Embedded Signup
2. L'utilisateur crée/sélectionne son WABA et vérifie son numéro sur Meta
3. Meta renvoie un code OAuth au frontend via callback
4. Le frontend envoie ce code au backend (POST /whatsapp/embedded-signup/callback)
5. Le backend échange le code contre un access token permanent
6. Le backend récupère le WABA ID et le Phone Number ID via l'API Meta
7. Tout est sauvegardé sur le tenant
"""

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models import Tenant, User

router = APIRouter(prefix="/whatsapp/embedded-signup", tags=["WhatsApp Embedded Signup"])

settings = get_settings()


# ============================================
# SCHEMAS
# ============================================


class EmbeddedSignupCallback(BaseModel):
    """Données envoyées par le frontend après le popup Embedded Signup."""
    code: str  # Code OAuth renvoyé par Meta


class EmbeddedSignupConfig(BaseModel):
    """Configuration nécessaire au frontend pour initialiser le SDK."""
    app_id: str
    config_id: str
    api_version: str


class WhatsAppConnectionStatus(BaseModel):
    """État de la connexion WhatsApp pour le tenant."""
    is_connected: bool
    whatsapp_enabled: bool
    phone_number_id: str | None = None
    business_account_id: str | None = None
    display_phone_number: str | None = None
    verified_name: str | None = None


# ============================================
# ENDPOINTS
# ============================================


@router.get("/config")
async def get_signup_config(
    current_user: User = Depends(require_role(["owner", "admin"])),
) -> EmbeddedSignupConfig:
    """
    Récupérer la configuration nécessaire pour initialiser le SDK Facebook JS.
    Accessible par l'owner et les admins de l'entreprise.
    """
    if not settings.facebook_app_id or not settings.facebook_config_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="L'Embedded Signup n'est pas configuré sur cette plateforme.",
        )

    return EmbeddedSignupConfig(
        app_id=settings.facebook_app_id,
        config_id=settings.facebook_config_id,
        api_version=settings.whatsapp_api_version,
    )


@router.get("/status")
async def get_connection_status(
    current_user: User = Depends(require_role(["owner", "admin"])),
    db: AsyncSession = Depends(get_db),
) -> WhatsAppConnectionStatus:
    """
    Vérifier l'état de connexion WhatsApp de l'entreprise.
    """
    result = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
    tenant = result.scalar_one()

    is_connected = bool(
        tenant.whatsapp_enabled
        and tenant.whatsapp_phone_number_id
        and tenant.whatsapp_access_token
    )

    return WhatsAppConnectionStatus(
        is_connected=is_connected,
        whatsapp_enabled=tenant.whatsapp_enabled,
        phone_number_id=tenant.whatsapp_phone_number_id,
        business_account_id=tenant.whatsapp_business_account_id,
        display_phone_number=None,  # Sera enrichi si connecté
        verified_name=None,
    )


@router.post("/callback")
async def handle_signup_callback(
    data: EmbeddedSignupCallback,
    current_user: User = Depends(require_role(["owner", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Échanger le code OAuth Meta contre un token permanent,
    puis récupérer les IDs WhatsApp Business et les sauvegarder.

    Appelé par le frontend après que l'utilisateur a terminé le popup Embedded Signup.
    """
    if not settings.facebook_app_id or not settings.facebook_app_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Configuration Facebook App manquante côté serveur.",
        )

    async with httpx.AsyncClient(timeout=30) as client:
        # ─── Étape 1 : Échanger le code contre un access token ───────
        token_response = await client.get(
            f"{settings.whatsapp_api_base_url}/oauth/access_token",
            params={
                "client_id": settings.facebook_app_id,
                "client_secret": settings.facebook_app_secret,
                "code": data.code,
            },
        )

        if token_response.status_code != 200:
            error_detail = token_response.json().get("error", {}).get("message", "Erreur inconnue")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Échec de l'échange du code OAuth : {error_detail}",
            )

        token_data = token_response.json()
        access_token = token_data.get("access_token")

        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Aucun access token reçu de Meta.",
            )

        # ─── Étape 2 : Récupérer les Shared WABA IDs (debug token) ──
        # L'Embedded Signup renvoie un token de type Business Integration System User
        # On récupère les WABA partagés via debug_token
        debug_response = await client.get(
            f"{settings.whatsapp_api_base_url}/{settings.whatsapp_api_version}/debug_token",
            params={
                "input_token": access_token,
                "access_token": f"{settings.facebook_app_id}|{settings.facebook_app_secret}",
            },
        )

        waba_id = None
        if debug_response.status_code == 200:
            debug_data = debug_response.json().get("data", {})
            # Extraire le WABA ID depuis les granular_scopes
            granular_scopes = debug_data.get("granular_scopes", [])
            for scope in granular_scopes:
                if scope.get("permission") == "whatsapp_business_messaging":
                    target_ids = scope.get("target_ids", [])
                    if target_ids:
                        waba_id = target_ids[0]
                        break

        # ─── Étape 3 : Fallback — chercher le WABA via l'API ────────
        if not waba_id:
            waba_response = await client.get(
                f"{settings.whatsapp_api_base_url}/{settings.whatsapp_api_version}/me/whatsapp_business_accounts",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if waba_response.status_code == 200:
                waba_list = waba_response.json().get("data", [])
                if waba_list:
                    waba_id = waba_list[0]["id"]

        if not waba_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Impossible de récupérer le WhatsApp Business Account ID. "
                       "Vérifiez que vous avez bien terminé la configuration.",
            )

        # ─── Étape 4 : Récupérer le Phone Number ID ─────────────────
        phone_response = await client.get(
            f"{settings.whatsapp_api_base_url}/{settings.whatsapp_api_version}/{waba_id}/phone_numbers",
            headers={"Authorization": f"Bearer {access_token}"},
        )

        phone_number_id = None
        display_phone_number = None
        verified_name = None

        if phone_response.status_code == 200:
            phones = phone_response.json().get("data", [])
            if phones:
                phone_number_id = phones[0]["id"]
                display_phone_number = phones[0].get("display_phone_number")
                verified_name = phones[0].get("verified_name")

        if not phone_number_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Aucun numéro de téléphone trouvé sur votre compte WhatsApp Business. "
                       "Vérifiez que vous avez enregistré un numéro.",
            )

        # ─── Étape 5 : S'abonner aux webhooks pour ce WABA ──────────
        await client.post(
            f"{settings.whatsapp_api_base_url}/{settings.whatsapp_api_version}/{waba_id}/subscribed_apps",
            headers={"Authorization": f"Bearer {access_token}"},
        )

        # ─── Étape 6 : Sauvegarder sur le tenant ────────────────────
        result = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
        tenant = result.scalar_one()

        tenant.whatsapp_business_account_id = waba_id
        tenant.whatsapp_phone_number_id = phone_number_id
        tenant.whatsapp_access_token = access_token
        tenant.whatsapp_enabled = True

        await db.flush()

    return {
        "message": "WhatsApp Business connecté avec succès",
        "waba_id": waba_id,
        "phone_number_id": phone_number_id,
        "display_phone_number": display_phone_number,
        "verified_name": verified_name,
    }


@router.post("/disconnect")
async def disconnect_whatsapp(
    current_user: User = Depends(require_role(["owner", "admin"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Déconnecter WhatsApp Business de l'entreprise.
    Supprime les credentials stockés.
    """
    result = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
    tenant = result.scalar_one()

    tenant.whatsapp_business_account_id = None
    tenant.whatsapp_phone_number_id = None
    tenant.whatsapp_access_token = None
    tenant.whatsapp_enabled = False

    await db.flush()

    return {"message": "WhatsApp Business déconnecté"}
