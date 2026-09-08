"""
Webhook WhatsApp Business (Meta Cloud API).

Gère :
- Vérification du webhook (GET challenge)
- Réception des statuts de messages (delivery reports)
- Réception des messages entrants (optionnel, pour la fenêtre 24h)

Documentation Meta :
- https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks

Configuration dans Meta Business Manager :
- URL : https://api.votre-domaine.com/v1/webhooks/whatsapp
- Token de vérification : configuré dans WHATSAPP_VERIFY_TOKEN
- Champs souscrits : messages, message_template_status_update
"""

import hashlib
import hmac
import json
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.models import Message, Tenant, WebhookLog, WhatsAppTemplate

settings = get_settings()
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks/whatsapp", tags=["Webhooks WhatsApp"])


# ============================================
# VÉRIFICATION WEBHOOK (Challenge Meta)
# ============================================


@router.get("")
async def verify_webhook(
    mode: str = Query(None, alias="hub.mode"),
    token: str = Query(None, alias="hub.verify_token"),
    challenge: str = Query(None, alias="hub.challenge"),
):
    """
    Vérification du webhook par Meta (handshake).

    Meta envoie un GET avec :
    - hub.mode = "subscribe"
    - hub.verify_token = le token configuré
    - hub.challenge = un challenge à retourner

    On doit retourner le challenge en texte brut si le token est valide.
    """
    if mode == "subscribe" and token == settings.whatsapp_verify_token:
        logger.info("Webhook WhatsApp vérifié avec succès")
        return Response(content=challenge, media_type="text/plain")

    logger.warning(f"Échec vérification webhook WhatsApp: mode={mode}, token={token}")
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Token de vérification invalide",
    )


# ============================================
# RÉCEPTION DES ÉVÉNEMENTS WEBHOOK
# ============================================


@router.post("")
async def receive_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Recevoir les notifications webhook de Meta.

    Événements gérés :
    - messages : messages entrants des utilisateurs
    - statuses : mises à jour de statut des messages envoyés
    - message_template_status_update : changement de statut des templates

    Statuts possibles pour les messages :
    - sent : message envoyé au serveur WhatsApp
    - delivered : message délivré au destinataire
    - read : message lu par le destinataire
    - failed : échec d'envoi
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Body JSON invalide")

    # Traiter chaque entrée
    for entry in body.get("entry", []):
        for change in entry.get("changes", []):
            field = change.get("field")
            value = change.get("value", {})

            if field == "messages":
                await _process_messages_webhook(db, value)
            elif field == "message_template_status_update":
                await _process_template_status_update(db, value)

    # Meta attend toujours un 200 OK
    return Response(status_code=status.HTTP_200_OK)


# ============================================
# TRAITEMENT DES STATUTS DE MESSAGES
# ============================================


async def _process_messages_webhook(db: AsyncSession, value: dict):
    """
    Traiter les événements 'messages' du webhook.

    Contient :
    - statuses : mises à jour de statut (delivered, read, failed)
    - messages : messages entrants des utilisateurs
    """
    metadata = value.get("metadata", {})
    phone_number_id = metadata.get("phone_number_id", "")

    # ─── Traiter les statuts ─────────────────────────────────────────
    for status_update in value.get("statuses", []):
        await _update_message_status(db, status_update, phone_number_id)

    # ─── Traiter les messages entrants ───────────────────────────────
    for incoming_msg in value.get("messages", []):
        await _process_incoming_message(db, incoming_msg, phone_number_id)

    await db.commit()


async def _update_message_status(db: AsyncSession, status_update: dict, phone_number_id: str):
    """
    Mettre à jour le statut d'un message envoyé.

    Statuts Meta :
    - sent → message accepté par WhatsApp
    - delivered → message délivré au téléphone du destinataire
    - read → message lu par le destinataire
    - failed → échec (avec erreur détaillée)
    """
    wa_message_id = status_update.get("id")
    new_status = status_update.get("status")
    timestamp = status_update.get("timestamp")

    if not wa_message_id or not new_status:
        return

    # Mapper les statuts WhatsApp vers nos statuts internes
    status_mapping = {
        "sent": "sent",
        "delivered": "delivered",
        "read": "read",
        "failed": "failed",
    }

    internal_status = status_mapping.get(new_status, new_status)

    # Trouver le message par provider_id
    result = await db.execute(
        select(Message).where(
            Message.provider_id == wa_message_id,
            Message.channel == "whatsapp",
        )
    )
    message = result.scalar_one_or_none()

    if message:
        # Ne pas régresser le statut (read > delivered > sent)
        status_priority = {"queued": 0, "sent": 1, "delivered": 2, "read": 3, "failed": 4}
        current_priority = status_priority.get(message.status, 0)
        new_priority = status_priority.get(internal_status, 0)

        if new_priority > current_priority:
            message.status = internal_status

            if internal_status == "delivered" and not message.delivered_at:
                message.delivered_at = datetime.utcnow()

            logger.info(
                f"Message {wa_message_id} mis à jour: {message.status} → {internal_status}"
            )

        # Enregistrer les erreurs
        if new_status == "failed":
            errors = status_update.get("errors", [])
            if errors:
                error_msg = errors[0].get("message", "Unknown error")
                error_code = errors[0].get("code", "")
                message.error_message = f"[{error_code}] {error_msg}"
                message.status = "failed"
    else:
        logger.debug(f"Message WhatsApp {wa_message_id} non trouvé en base")

    # Logger l'événement webhook
    # Trouver le tenant par phone_number_id
    tenant_result = await db.execute(
        select(Tenant).where(Tenant.whatsapp_phone_number_id == phone_number_id)
    )
    tenant = tenant_result.scalar_one_or_none()

    if tenant:
        webhook_log = WebhookLog(
            tenant_id=tenant.id,
            event_type=f"whatsapp.status.{new_status}",
            payload=status_update,
            provider="whatsapp",
            processed=True,
        )
        db.add(webhook_log)


async def _process_incoming_message(db: AsyncSession, incoming_msg: dict, phone_number_id: str):
    """
    Traiter un message entrant d'un utilisateur WhatsApp.

    Ceci ouvre la fenêtre de 24h pour envoyer des messages libres.
    On enregistre le message en base pour le suivi.
    """
    from_number = incoming_msg.get("from", "")
    msg_type = incoming_msg.get("type", "text")
    msg_id = incoming_msg.get("id", "")
    timestamp = incoming_msg.get("timestamp", "")

    # Extraire le contenu selon le type
    content = ""
    if msg_type == "text":
        content = incoming_msg.get("text", {}).get("body", "")
    elif msg_type == "image":
        content = "[Image reçue]"
    elif msg_type == "video":
        content = "[Vidéo reçue]"
    elif msg_type == "audio":
        content = "[Audio reçu]"
    elif msg_type == "document":
        content = "[Document reçu]"
    elif msg_type == "location":
        content = "[Localisation reçue]"
    elif msg_type == "reaction":
        content = "[Réaction]"
    else:
        content = f"[{msg_type}]"

    # Trouver le tenant
    tenant_result = await db.execute(
        select(Tenant).where(Tenant.whatsapp_phone_number_id == phone_number_id)
    )
    tenant = tenant_result.scalar_one_or_none()

    if not tenant:
        logger.warning(f"Tenant non trouvé pour phone_number_id={phone_number_id}")
        return

    # Enregistrer le message entrant
    webhook_log = WebhookLog(
        tenant_id=tenant.id,
        event_type="whatsapp.message.incoming",
        payload=incoming_msg,
        provider="whatsapp",
        processed=True,
    )
    db.add(webhook_log)

    logger.info(f"Message WhatsApp entrant de {from_number}: {content[:50]}...")


# ============================================
# MISE À JOUR STATUT TEMPLATES
# ============================================


async def _process_template_status_update(db: AsyncSession, value: dict):
    """
    Traiter les mises à jour de statut des templates WhatsApp.

    Meta notifie quand un template est approuvé ou rejeté.
    """
    template_name = value.get("message_template_name")
    template_language = value.get("message_template_language")
    new_status = value.get("event")  # APPROVED, REJECTED, PENDING_DELETION, etc.

    if not template_name or not new_status:
        return

    # Mapper les événements Meta vers nos statuts
    event_to_status = {
        "APPROVED": "APPROVED",
        "REJECTED": "REJECTED",
        "PENDING_DELETION": "DISABLED",
        "DELETED": "DISABLED",
        "DISABLED": "DISABLED",
        "REINSTATED": "APPROVED",
        "FLAGGED": "FLAGGED",
    }

    internal_status = event_to_status.get(new_status, new_status)

    # Mettre à jour tous les templates correspondants
    result = await db.execute(
        select(WhatsAppTemplate).where(
            WhatsAppTemplate.name == template_name,
        )
    )
    templates = result.scalars().all()

    for template in templates:
        if template_language and template.language != template_language:
            continue
        template.status = internal_status
        template.last_synced_at = datetime.utcnow()
        logger.info(f"Template '{template_name}' ({template.language}) → {internal_status}")

    await db.commit()
