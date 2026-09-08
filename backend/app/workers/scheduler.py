"""
Scheduler pour les campagnes programmées.

Ce worker vérifie toutes les 60 secondes s'il y a des campagnes
dont la date d'envoi est atteinte, et les envoie via le provider SMS.

Améliorations :
- Vérification que le tenant est actif avant envoi
- Vérification des crédits disponibles
- Nettoyage des campagnes bloquées en "sending" (timeout 30 min)
- Envoi par batch de 100 avec pause (rate limiting)
- Logs structurés avec métriques

Lancement :
    python -m app.workers.scheduler
"""

import asyncio
import logging
from datetime import datetime, timedelta

from sqlalchemy import func, select

from app.core.database import async_session
from app.models import Campaign, Contact, ContactGroup, ContactGroupMember, Message, Subscription, Tenant
from app.services.sms_provider import get_sms_provider, get_whatsapp_provider

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

CHECK_INTERVAL = 60  # Vérifier toutes les 60 secondes
BATCH_SIZE = 100  # Envoyer par lots de 100
BATCH_PAUSE = 2  # Pause de 2 secondes entre les lots
SENDING_TIMEOUT_MINUTES = 30  # Campagnes "sending" depuis plus de 30 min = bloquées


def personalize_message(content: str, contact) -> str:
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


async def cleanup_stuck_campaigns():
    """
    Nettoyer les campagnes bloquées en état "sending" depuis plus de 30 minutes.
    Elles sont remises en "scheduled" pour être retraitées au prochain cycle.
    """
    async with async_session() as db:
        threshold = datetime.utcnow() - timedelta(minutes=SENDING_TIMEOUT_MINUTES)

        result = await db.execute(
            select(Campaign).where(
                Campaign.status == "sending",
                Campaign.updated_at <= threshold,
            )
        )
        stuck_campaigns = result.scalars().all()

        if stuck_campaigns:
            for campaign in stuck_campaigns:
                logger.warning(
                    f"Campagne bloquée détectée: {campaign.name} (ID: {campaign.id}) "
                    f"— en 'sending' depuis {campaign.updated_at}. Remise en 'scheduled'."
                )
                campaign.status = "scheduled"

            await db.commit()
            logger.info(f"{len(stuck_campaigns)} campagne(s) bloquée(s) nettoyée(s)")


async def send_campaign(db, campaign, tenant):
    """Envoyer une campagne via le provider SMS ou WhatsApp, par batch avec vérifications."""
    channel = getattr(campaign, "channel", "sms") or "sms"

    if channel == "whatsapp":
        await _send_whatsapp_campaign(db, campaign, tenant)
    else:
        await _send_sms_campaign(db, campaign, tenant)


async def _send_whatsapp_campaign(db, campaign, tenant):
    """Envoyer une campagne WhatsApp via templates."""
    from app.services.sms_provider import get_whatsapp_provider

    provider = get_whatsapp_provider(tenant=tenant)

    # Récupérer les destinataires
    if campaign.target_group_id:
        recipients_query = (
            select(Contact)
            .join(ContactGroupMember, ContactGroupMember.contact_id == Contact.id)
            .where(
                ContactGroupMember.group_id == campaign.target_group_id,
                Contact.tenant_id == tenant.id,
                Contact.is_subscribed == True,
            )
        )
    else:
        recipients_query = select(Contact).where(
            Contact.tenant_id == tenant.id,
            Contact.is_subscribed == True,
        )

    result = await db.execute(recipients_query)
    recipients = result.scalars().all()

    if not recipients:
        logger.warning(f"  Campagne WhatsApp {campaign.id}: aucun destinataire, passage en 'sent'")
        campaign.status = "sent"
        campaign.total_recipients = 0
        campaign.sent_at = datetime.utcnow()
        return

    total_recipients = len(recipients)
    campaign.total_recipients = total_recipients

    template_name = campaign.whatsapp_template_name
    template_language = campaign.whatsapp_template_language or "fr"
    template_components = campaign.whatsapp_template_components

    if not template_name:
        logger.error(f"  Campagne WhatsApp {campaign.id}: pas de template configuré")
        campaign.status = "failed"
        return

    logger.info(f"  Envoi WhatsApp à {total_recipients} destinataire(s) (template: {template_name})")

    sent_count = 0
    failed_count = 0

    # Envoi par batch
    for batch_start in range(0, total_recipients, BATCH_SIZE):
        batch = recipients[batch_start:batch_start + BATCH_SIZE]
        batch_num = (batch_start // BATCH_SIZE) + 1
        total_batches = (total_recipients + BATCH_SIZE - 1) // BATCH_SIZE

        logger.info(f"  Batch {batch_num}/{total_batches} ({len(batch)} contacts)")

        for contact in batch:
            try:
                r = await provider.send_template(
                    phone=contact.phone,
                    template_name=template_name,
                    language_code=template_language,
                    components=template_components,
                )
                msg = Message(
                    tenant_id=tenant.id,
                    campaign_id=campaign.id,
                    contact_id=contact.id,
                    phone=contact.phone,
                    content=f"[Template: {template_name}]",
                    channel="whatsapp",
                    type=campaign.type,
                    status=r.get("status", "sent"),
                    provider="whatsapp",
                    provider_id=r.get("provider_id"),
                    sent_at=datetime.utcnow(),
                    segments_count=1,
                )
                db.add(msg)
                sent_count += 1
            except Exception as e:
                msg = Message(
                    tenant_id=tenant.id,
                    campaign_id=campaign.id,
                    contact_id=contact.id,
                    phone=contact.phone,
                    content=f"[Template: {template_name}]",
                    channel="whatsapp",
                    type=campaign.type,
                    status="failed",
                    provider="whatsapp",
                    error_message=str(e)[:500],
                    segments_count=1,
                )
                db.add(msg)
                failed_count += 1

        # Pause entre les batchs
        if batch_start + BATCH_SIZE < total_recipients:
            await asyncio.sleep(BATCH_PAUSE)

    # Mettre à jour la campagne
    campaign.status = "sent"
    campaign.total_sent = sent_count
    campaign.total_failed = failed_count
    campaign.total_delivered = sent_count
    campaign.sent_at = datetime.utcnow()

    from app.services.notifications import notify_campaign_sent
    await notify_campaign_sent(db, tenant.id, campaign.name, sent_count)

    logger.info(f"  WhatsApp terminé: {sent_count} envoyés, {failed_count} échoués")


async def _send_sms_campaign(db, campaign, tenant):
    """Envoyer une campagne SMS classique via le provider SMS."""
    provider = get_sms_provider(tenant.sms_provider, tenant=tenant)

    # Récupérer les destinataires
    if campaign.target_group_id:
        recipients_query = (
            select(Contact)
            .join(ContactGroupMember, ContactGroupMember.contact_id == Contact.id)
            .where(
                ContactGroupMember.group_id == campaign.target_group_id,
                Contact.tenant_id == tenant.id,
                Contact.is_subscribed == True,
            )
        )
    else:
        recipients_query = select(Contact).where(
            Contact.tenant_id == tenant.id,
            Contact.is_subscribed == True,
        )

    result = await db.execute(recipients_query)
    recipients = result.scalars().all()

    if not recipients:
        logger.warning(f"  Campagne {campaign.id}: aucun destinataire, passage en 'sent'")
        campaign.status = "sent"
        campaign.total_recipients = 0
        campaign.sent_at = datetime.utcnow()
        return

    total_recipients = len(recipients)
    campaign.total_recipients = total_recipients

    # Calculer le nombre de segments par message
    segments_per_msg = max(1, (len(campaign.content) + 159) // 160)

    logger.info(
        f"  Envoi à {total_recipients} destinataire(s) "
        f"({total_recipients * segments_per_msg} segments estimés)"
    )

    sent_count = 0
    failed_count = 0

    # Déterminer si le message contient des variables à personnaliser
    has_personalization = "{{" in campaign.content

    # Envoi par batch
    for batch_start in range(0, total_recipients, BATCH_SIZE):
        batch = recipients[batch_start:batch_start + BATCH_SIZE]
        batch_num = (batch_start // BATCH_SIZE) + 1
        total_batches = (total_recipients + BATCH_SIZE - 1) // BATCH_SIZE

        logger.info(f"  Batch {batch_num}/{total_batches} ({len(batch)} contacts)")

        try:
            if hasattr(provider, "send_bulk") and len(batch) > 1 and not has_personalization:
                # Envoi bulk pour le batch (uniquement si pas de personnalisation)
                phones = [c.phone for c in batch]
                results = await provider.send_bulk(
                    phones=phones,
                    content=campaign.content,
                    sender=tenant.smsbus_sender_id,
                )

                for i, r in enumerate(results):
                    contact = batch[i] if i < len(batch) else None
                    msg = Message(
                        tenant_id=tenant.id,
                        campaign_id=campaign.id,
                        contact_id=contact.id if contact else None,
                        phone=r["phone"],
                        content=campaign.content,
                        type=campaign.type,
                        status=r.get("status", "sent"),
                        provider=tenant.sms_provider,
                        provider_id=r.get("provider_id"),
                        sent_at=datetime.utcnow(),
                        segments_count=segments_per_msg,
                    )
                    db.add(msg)
                    if r.get("status") == "failed":
                        failed_count += 1
                    else:
                        sent_count += 1
            else:
                # Envoi unitaire par contact (avec personnalisation)
                for contact in batch:
                    personalized_content = personalize_message(campaign.content, contact) if has_personalization else campaign.content
                    try:
                        r = await provider.send(
                            phone=contact.phone,
                            content=personalized_content,
                            sender=tenant.smsbus_sender_id,
                        )
                        msg = Message(
                            tenant_id=tenant.id,
                            campaign_id=campaign.id,
                            contact_id=contact.id,
                            phone=contact.phone,
                            content=personalized_content,
                            type=campaign.type,
                            status=r.get("status", "sent"),
                            provider=tenant.sms_provider,
                            provider_id=r.get("provider_id"),
                            sent_at=datetime.utcnow(),
                            segments_count=max(1, (len(personalized_content) + 159) // 160),
                        )
                        db.add(msg)
                        sent_count += 1
                    except Exception as e:
                        msg = Message(
                            tenant_id=tenant.id,
                            campaign_id=campaign.id,
                            contact_id=contact.id,
                            phone=contact.phone,
                            content=personalized_content,
                            type=campaign.type,
                            status="failed",
                            provider=tenant.sms_provider,
                            error_message=str(e)[:500],
                            segments_count=max(1, (len(personalized_content) + 159) // 160),
                        )
                        db.add(msg)
                        failed_count += 1

        except Exception as e:
            logger.error(f"  Erreur batch {batch_num} pour campagne {campaign.id}: {e}")
            # Marquer tous les contacts du batch comme échoués
            for contact in batch:
                msg = Message(
                    tenant_id=tenant.id,
                    campaign_id=campaign.id,
                    contact_id=contact.id,
                    phone=contact.phone,
                    content=campaign.content,
                    type=campaign.type,
                    status="failed",
                    provider=tenant.sms_provider,
                    error_message=f"Erreur batch: {str(e)[:200]}",
                    segments_count=segments_per_msg,
                )
                db.add(msg)
                failed_count += 1

        # Pause entre les batchs pour éviter le rate limiting
        if batch_start + BATCH_SIZE < total_recipients:
            await asyncio.sleep(BATCH_PAUSE)

    # Mettre à jour la campagne
    campaign.status = "sent"
    campaign.total_sent = sent_count
    campaign.total_failed = failed_count
    campaign.total_delivered = sent_count  # Sera mis à jour par les DLR
    campaign.sent_at = datetime.utcnow()

    # Notification campagne envoyée
    from app.services.notifications import notify_campaign_sent
    await notify_campaign_sent(db, tenant.id, campaign.name, sent_count)

    logger.info(
        f"  Terminé: {sent_count} envoyés, {failed_count} échoués"
    )


async def check_scheduled_campaigns():
    """Vérifier et lancer les campagnes programmées dont la date est atteinte."""
    async with async_session() as db:
        now = datetime.utcnow()

        result = await db.execute(
            select(Campaign).where(
                Campaign.status == "scheduled",
                Campaign.scheduled_at <= now,
            )
        )
        campaigns = result.scalars().all()

        if not campaigns:
            return

        logger.info(f"Trouvé {len(campaigns)} campagne(s) à envoyer")

        for campaign in campaigns:
            # Récupérer le tenant
            tenant_result = await db.execute(
                select(Tenant).where(Tenant.id == campaign.tenant_id)
            )
            tenant = tenant_result.scalar_one()

            # Vérification 1 : tenant actif
            if not tenant.is_active:
                logger.warning(
                    f"  Campagne {campaign.id} ({campaign.name}): "
                    f"tenant '{tenant.name}' désactivé — campagne annulée"
                )
                campaign.status = "failed"
                continue

            # Vérification 2 : abonnement actif
            sub_result = await db.execute(
                select(Subscription).where(
                    Subscription.tenant_id == tenant.id,
                    Subscription.status == "active",
                    Subscription.end_date >= now,
                ).limit(1)
            )
            if sub_result.scalar_one_or_none() is None:
                logger.warning(
                    f"  Campagne {campaign.id} ({campaign.name}): "
                    f"tenant '{tenant.name}' abonnement expiré — campagne annulée"
                )
                campaign.status = "failed"
                continue

            logger.info(f"Lancement: {campaign.name} (ID: {campaign.id}, Tenant: {tenant.name})")

            # Vérification 3 : solde suffisant
            try:
                provider = get_sms_provider(tenant.sms_provider, tenant=tenant)
                if hasattr(provider, "get_balance"):
                    balance = await provider.get_balance()
                    current_balance = balance.get("amount", 0)
                    # Estimer le coût : segments × prix unitaire BF (13) × destinataires estimés
                    segments_per_msg = max(1, (len(campaign.content) + 159) // 160)
                    # Récupérer le nombre de destinataires
                    from app.models import Contact, ContactGroupMember
                    if campaign.target_group_id:
                        recip_count = (await db.execute(
                            select(func.count()).select_from(
                                select(Contact.id)
                                .join(ContactGroupMember, ContactGroupMember.contact_id == Contact.id)
                                .where(
                                    ContactGroupMember.group_id == campaign.target_group_id,
                                    Contact.tenant_id == tenant.id,
                                    Contact.is_subscribed == True,
                                ).subquery()
                            )
                        )).scalar() or 0
                    else:
                        recip_count = (await db.execute(
                            select(func.count()).where(
                                Contact.tenant_id == tenant.id,
                                Contact.is_subscribed == True,
                            )
                        )).scalar() or 0

                    estimated_cost = segments_per_msg * 13 * recip_count  # 13 FCFA par défaut (BF)
                    if current_balance < estimated_cost:
                        logger.warning(
                            f"  Campagne {campaign.id} ({campaign.name}): "
                            f"solde insuffisant ({current_balance:.0f} FCFA < {estimated_cost:.0f} FCFA) — campagne annulée"
                        )
                        campaign.status = "failed"
                        campaign.error_message = f"Solde insuffisant: {current_balance:.0f} FCFA disponible, {estimated_cost:.0f} FCFA nécessaire"
                        continue
            except Exception as e:
                logger.debug(f"  Check solde échoué pour campagne {campaign.id}: {e}")

            # Passer en "sending"
            campaign.status = "sending"
            await db.flush()

            # Envoyer
            await send_campaign(db, campaign, tenant)

        await db.commit()
        logger.info("Toutes les campagnes programmées ont été traitées")


async def run_scheduler():
    """Boucle principale du scheduler."""
    logger.info("=" * 60)
    logger.info("Scheduler démarré — vérification toutes les 60 secondes")
    logger.info(f"  Config: batch_size={BATCH_SIZE}, batch_pause={BATCH_PAUSE}s, timeout={SENDING_TIMEOUT_MINUTES}min")
    logger.info("=" * 60)

    while True:
        try:
            # Nettoyer les campagnes bloquées
            await cleanup_stuck_campaigns()

            # Traiter les campagnes programmées
            await check_scheduled_campaigns()
        except Exception as e:
            logger.error(f"Erreur dans le scheduler: {e}", exc_info=True)

        await asyncio.sleep(CHECK_INTERVAL)


def handler(event, context):
    """AWS Lambda handler déclenché par EventBridge (cron)."""
    asyncio.run(check_scheduled_campaigns())
    return {"statusCode": 200, "body": "OK"}


if __name__ == "__main__":
    asyncio.run(run_scheduler())
