"""
Endpoints spécifiques au provider 3MI (LeSMSBUS).

Gère :
- Webhook DLR (accusés de réception)
- Webhook MO (messages entrants)
- Vérification du solde 3MI
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models import Message, User, WebhookLog
from app.services.sms_provider import SmsbusProvider

router = APIRouter(prefix="/webhooks/3mi", tags=["Webhooks 3MI"])


@router.get("/dlr")
async def receive_dlr(
    msg: str = Query(..., description="Statut DLR (DELIVERED, EXPIRED, etc.)"),
    dnr: str = Query(..., description="Numéro destinataire"),
    msgId: str = Query(..., description="ID du message d'origine"),
    token: str = Query("", description="Token de sécurité pour valider l'origine"),
    db: AsyncSession = Depends(get_db),
):
    """
    Recevoir les accusés de réception (DLR) de 3MI.

    URL à fournir à 3MI :
    https://api.sms-pro.com/v1/webhooks/3mi/dlr?msg=DLR_STATUS&dnr=numero&msgId=id_du_message

    Statuts possibles :
    - DELIVERED : Message délivré
    - EXPIRED : Message expiré
    - DELETED : Message supprimé
    - UNDELIVERABLE : Numéro invalide
    - ENROUTE : En cours d'envoi
    - UNKNOWN : Statut inconnu
    """
    from datetime import datetime, timezone
    from app.models import Campaign

    # Vérifier le token de sécurité
    settings = get_settings()
    expected_token = settings.smsbus_webhook_secret
    if expected_token and token != expected_token:
        return Response(content="OK", media_type="text/plain", status_code=200)
        # On retourne 200/OK même en cas de token invalide pour ne pas
        # révéler l'existence de l'endpoint ni provoquer de retries côté 3MI

    # Vérifier que le msgId correspond bien à un message existant
    # (protection contre les faux DLR avec des IDs inventés)

    # Mapper le statut 3MI vers notre statut interne
    status_mapping = {
        "DELIVERED": "delivered",
        "ENROUTE": "sent",
        "EXPIRED": "failed",
        "DELETED": "failed",
        "UNDELIVERABLE": "failed",
        "UNKNOWN": "sent",
    }

    internal_status = status_mapping.get(msg.upper(), "sent")

    # Mettre à jour le message dans la DB
    result = await db.execute(
        select(Message).where(Message.provider_id == msgId)
    )
    message = result.scalar_one_or_none()

    if message:
        old_status = message.status
        message.status = internal_status

        if internal_status == "delivered":
            message.delivered_at = datetime.now(timezone.utc)
        elif internal_status == "failed":
            message.error_message = f"DLR: {msg}"

        # Mettre à jour les compteurs de la campagne associée
        if message.campaign_id and internal_status in ("delivered", "failed"):
            campaign_result = await db.execute(
                select(Campaign).where(Campaign.id == message.campaign_id)
            )
            campaign = campaign_result.scalar_one_or_none()

            if campaign:
                if internal_status == "delivered" and old_status != "delivered":
                    campaign.total_delivered = (campaign.total_delivered or 0) + 1
                elif internal_status == "failed" and old_status != "failed":
                    campaign.total_failed = (campaign.total_failed or 0) + 1

    # Logger le webhook
    if message:
        webhook_log = WebhookLog(
            tenant_id=message.tenant_id,
            event_type=f"sms.{internal_status}",
            payload={"msg": msg, "dnr": dnr, "msgId": msgId},
            provider="3mi",
            processed=True,
        )
        db.add(webhook_log)

    await db.commit()

    # 3MI attend la réponse "OK"
    return Response(content="OK", media_type="text/plain")


@router.get("/mo")
async def receive_mo(
    msg: str = Query(..., description="Message reçu"),
    dnr: str = Query(..., description="Numéro de l'expéditeur"),
    srn: str = Query(None, description="Numéro court"),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Recevoir les messages entrants (MO) de 3MI.

    URL à fournir à 3MI :
    https://api.sms-pro.com/v1/webhooks/3mi/mo?msg=message&dnr=numero&srn=numero_court

    Utilisé pour :
    - Opt-out (STOP)
    - Réponses clients
    - Mots-clés (commandes par SMS)
    """
    # Gérer le opt-out
    if msg.strip().upper() in ("STOP", "DESINSCRIRE", "UNSUBSCRIBE"):
        from app.models import Contact
        from datetime import datetime, timezone

        # Chercher le contact par numéro
        result = await db.execute(
            select(Contact).where(Contact.phone.contains(dnr))
        )
        contacts = result.scalars().all()
        for contact in contacts:
            contact.is_subscribed = False
            contact.unsubscribed_at = datetime.now(timezone.utc)

    # Logger le message entrant
    # Note: sans tenant_id on log pour audit
    # En production, il faudrait mapper le numéro court au tenant

    await db.commit()

    return Response(content="OK", media_type="text/plain")


# ============================================
# Endpoints protégés (dashboard)
# ============================================

smsbus_router = APIRouter(prefix="/smsbus", tags=["3MI SMSBUS"])


@smsbus_router.get("/balance")
async def get_smsbus_balance(
    current_user: User = Depends(require_role(["superadmin", "owner", "admin", "member"])),
    db: AsyncSession = Depends(get_db),
):
    """Récupérer le solde du compte 3MI SMSBUS."""
    from app.models import Tenant

    try:
        # Récupérer le tenant pour ses identifiants API
        tenant_result = await db.execute(
            select(Tenant).where(Tenant.id == current_user.tenant_id)
        )
        tenant = tenant_result.scalar_one()

        provider = SmsbusProvider(tenant=tenant)
        balance = await provider.get_balance()
        return {
            "provider": "3mi",
            "amount": balance["amount"],
            "currency": balance["currency"],
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Erreur de communication avec 3MI: {str(e)}",
        )
