"""
Service pour déclencher l'automation de bienvenue lors de l'ajout d'un contact.

Ce module est appelé depuis l'endpoint de création de contact (app/api/contacts.py).
L'exécution est faite en arrière-plan (asyncio.create_task) pour ne pas bloquer la réponse API.
"""

import asyncio
import logging
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session
from app.models import Automation, Contact, Message, Subscription, Tenant
from app.services.sms_provider import get_sms_provider, get_whatsapp_provider

logger = logging.getLogger(__name__)


def personalize_message(content: str, contact: Contact) -> str:
    """Remplacer les variables dans le message par les infos du contact."""
    replacements = {
        "{{first_name}}": contact.first_name or "",
        "{{last_name}}": contact.last_name or "",
        "{{phone}}": contact.phone or "",
        "{{city}}": contact.city or "",
        "{{country}}": contact.country or "",
        "{{email}}": contact.email or "",
    }
    result = content
    for var, value in replacements.items():
        result = result.replace(var, value)
    return result


async def _execute_welcome(tenant_id, contact_id):
    """
    Exécuter les automations welcome actives pour un nouveau contact.

    Ouvre sa propre session DB pour fonctionner en background task
    indépendamment de la transaction de l'endpoint.
    """
    async with async_session() as db:
        # Récupérer le tenant
        tenant_result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
        tenant = tenant_result.scalar_one_or_none()
        if not tenant or not tenant.is_active:
            logger.debug(f"Tenant {tenant_id} inactif ou introuvable — welcome ignorée")
            return

        # Vérifier l'abonnement actif
        now = datetime.utcnow()
        sub_result = await db.execute(
            select(Subscription).where(
                Subscription.tenant_id == tenant.id,
                Subscription.status == "active",
                Subscription.end_date >= now,
            ).limit(1)
        )
        if sub_result.scalar_one_or_none() is None:
            logger.warning(f"Tenant '{tenant.name}' abonnement expiré — welcome ignorée")
            return

        # Récupérer le contact fraîchement créé
        contact_result = await db.execute(select(Contact).where(Contact.id == contact_id))
        contact = contact_result.scalar_one_or_none()
        if not contact:
            return

        # Trouver toutes les automations welcome actives pour ce tenant
        result = await db.execute(
            select(Automation).where(
                Automation.tenant_id == tenant_id,
                Automation.type == "welcome",
                Automation.is_active == True,
            )
        )
        automations = result.scalars().all()

        if not automations:
            logger.debug(f"Aucune automation welcome active pour le tenant {tenant_id}")
            return

        for automation in automations:
            try:
                await _send_welcome_message(db, automation, tenant, contact)
            except Exception as e:
                logger.error(
                    f"Erreur automation welcome '{automation.name}' pour contact {contact.phone}: {e}",
                    exc_info=True,
                )

        await db.commit()


async def _send_welcome_message(db: AsyncSession, automation: Automation, tenant: Tenant, contact: Contact):
    """Envoyer le message de bienvenue via le canal configuré."""
    trigger_config = automation.trigger_config or {}
    channel = trigger_config.get("channel", "sms")
    message_content = trigger_config.get("message_content", "")

    if channel == "whatsapp":
        template_name = trigger_config.get("whatsapp_template_name", "")
        template_language = trigger_config.get("whatsapp_template_language", "fr")

        if not template_name:
            logger.warning(f"Automation welcome '{automation.name}': pas de template WhatsApp — ignorée")
            return

        provider = get_whatsapp_provider(tenant=tenant)
        try:
            result = await provider.send_template(
                phone=contact.phone,
                template_name=template_name,
                language_code=template_language,
            )
            msg = Message(
                tenant_id=tenant.id,
                contact_id=contact.id,
                phone=contact.phone,
                content=f"[Template: {template_name}]",
                channel="whatsapp",
                type="welcome",
                status=result.get("status", "sent"),
                provider="whatsapp",
                provider_id=result.get("provider_id"),
                sent_at=datetime.utcnow(),
                segments_count=1,
            )
            db.add(msg)
            logger.info(f"Welcome WhatsApp envoyé à {contact.phone} (automation: {automation.name})")
        except Exception as e:
            msg = Message(
                tenant_id=tenant.id,
                contact_id=contact.id,
                phone=contact.phone,
                content=f"[Template: {template_name}]",
                channel="whatsapp",
                type="welcome",
                status="failed",
                provider="whatsapp",
                error_message=str(e)[:500],
                segments_count=1,
            )
            db.add(msg)
            raise

    else:
        # Canal SMS
        if not message_content:
            logger.warning(f"Automation welcome '{automation.name}': pas de contenu de message — ignorée")
            return

        personalized = personalize_message(message_content, contact)
        provider = get_sms_provider(tenant.sms_provider, tenant=tenant)

        try:
            result = await provider.send(
                phone=contact.phone,
                content=personalized,
                sender=tenant.smsbus_sender_id,
            )
            msg = Message(
                tenant_id=tenant.id,
                contact_id=contact.id,
                phone=contact.phone,
                content=personalized,
                channel="sms",
                type="welcome",
                status=result.get("status", "sent"),
                provider=tenant.sms_provider,
                provider_id=result.get("provider_id"),
                sent_at=datetime.utcnow(),
                segments_count=max(1, (len(personalized) + 159) // 160),
            )
            db.add(msg)
            logger.info(f"Welcome SMS envoyé à {contact.phone} (automation: {automation.name})")
        except Exception as e:
            msg = Message(
                tenant_id=tenant.id,
                contact_id=contact.id,
                phone=contact.phone,
                content=personalized,
                channel="sms",
                type="welcome",
                status="failed",
                provider=tenant.sms_provider,
                error_message=str(e)[:500],
                segments_count=max(1, (len(personalized) + 159) // 160),
            )
            db.add(msg)
            raise

    # Mettre à jour les stats de l'automation
    automation.last_run_at = datetime.utcnow()
    automation.total_sent = (automation.total_sent or 0) + 1


def trigger_welcome_automation(tenant_id, contact_id):
    """
    Déclencher l'automation welcome en arrière-plan.

    Appeler cette fonction après la création d'un contact.
    Elle lance une tâche async qui ne bloque pas la réponse API.
    """
    asyncio.create_task(_execute_welcome(tenant_id, contact_id))
