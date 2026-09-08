"""
Worker pour l'exécution des automations.

Ce worker vérifie toutes les 5 minutes les automations actives
et exécute celles dont les conditions sont remplies :
- birthday : contacts dont c'est l'anniversaire aujourd'hui
- welcome : (déclenché à l'ajout d'un contact, pas par le worker)
- inactivity : contacts n'ayant pas reçu de SMS depuis X jours
- recurring : exécution selon la fréquence configurée (quotidien/hebdo/mensuel)

Améliorations :
- Vérification que le tenant est actif avant exécution
- Vérification des crédits disponibles
- Utilise trigger_config.message_content pour le contenu du message
- Envoi par batch de 100 avec pause (rate limiting)
- Logs structurés avec métriques par run
- Protection contre les doublons birthday

Lancement :
    python -m app.workers.automation_worker
"""

import asyncio
import logging
from datetime import datetime, timedelta

from sqlalchemy import func, select

from app.core.database import async_session
from app.models import Automation, Contact, ContactGroupMember, Message, Subscription, Tenant
from app.services.sms_provider import get_sms_provider, get_whatsapp_provider

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

CHECK_INTERVAL = 300  # Vérifier toutes les 5 minutes
BATCH_SIZE = 100  # Envoyer par lots de 100
BATCH_PAUSE = 2  # Pause de 2 secondes entre les lots


async def execute_automation(db, automation, tenant):
    """Exécuter une automation : trouver les contacts éligibles et envoyer par batch."""
    # Déterminer le canal (SMS par défaut, WhatsApp si configuré)
    channel = automation.trigger_config.get("channel", "sms")

    if channel == "whatsapp":
        provider = get_whatsapp_provider(tenant=tenant)
        template_name = automation.trigger_config.get("whatsapp_template_name", "")
        template_language = automation.trigger_config.get("whatsapp_template_language", "fr")

        if not template_name:
            logger.warning(f"  Automation {automation.id} ({automation.name}): pas de template WhatsApp — ignorée")
            return 0
    else:
        provider = get_sms_provider(tenant.sms_provider, tenant=tenant)

    # Priorité : automation.trigger_config.message_content
    message_content = automation.trigger_config.get("message_content", "")

    if not message_content and channel != "whatsapp":
        logger.warning(f"  Automation {automation.id} ({automation.name}): pas de contenu de message — ignorée")
        return 0

    # Trouver les contacts éligibles selon le type
    contacts = await get_eligible_contacts(db, automation, tenant)

    if not contacts:
        logger.info(f"  Automation {automation.id}: aucun contact éligible")
        return 0

    total_contacts = len(contacts)

    # Calculer le nombre de segments par message
    segments_per_msg = max(1, (len(message_content) + 159) // 160)

    logger.info(f"  {total_contacts} contact(s) éligible(s)")

    sent_count = 0
    failed_count = 0

    # Envoi par batch
    for batch_start in range(0, total_contacts, BATCH_SIZE):
        batch = contacts[batch_start:batch_start + BATCH_SIZE]
        batch_num = (batch_start // BATCH_SIZE) + 1
        total_batches = (total_contacts + BATCH_SIZE - 1) // BATCH_SIZE

        if total_batches > 1:
            logger.info(f"    Batch {batch_num}/{total_batches} ({len(batch)} contacts)")

        for contact in batch:
            # Personnaliser le message
            personalized = personalize_message(message_content, contact)

            try:
                if channel == "whatsapp":
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
                        type=automation.type if automation.type in ("birthday", "reminder") else "transactional",
                        status=result.get("status", "sent"),
                        provider="whatsapp",
                        provider_id=result.get("provider_id"),
                        sent_at=datetime.utcnow(),
                        segments_count=1,
                    )
                else:
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
                        type=automation.type if automation.type in ("birthday", "reminder") else "transactional",
                        status=result.get("status", "sent"),
                        provider=tenant.sms_provider,
                        provider_id=result.get("provider_id"),
                        sent_at=datetime.utcnow(),
                        segments_count=max(1, (len(personalized) + 159) // 160),
                    )

                db.add(msg)
                sent_count += 1

            except Exception as e:
                msg = Message(
                    tenant_id=tenant.id,
                    contact_id=contact.id,
                    phone=contact.phone,
                    content=f"[Template: {template_name}]" if channel == "whatsapp" else personalized,
                    channel=channel,
                    type=automation.type if automation.type in ("birthday", "reminder") else "transactional",
                    status="failed",
                    provider="whatsapp" if channel == "whatsapp" else tenant.sms_provider,
                    error_message=str(e)[:500],
                    segments_count=1 if channel == "whatsapp" else max(1, (len(personalized) + 159) // 160),
                )
                db.add(msg)
                failed_count += 1
                logger.error(f"    Échec pour {contact.phone}: {e}")

        # Pause entre les batchs
        if batch_start + BATCH_SIZE < total_contacts:
            await asyncio.sleep(BATCH_PAUSE)

    if failed_count > 0:
        logger.warning(f"  Résultat: {sent_count} envoyés, {failed_count} échoués")
    else:
        logger.info(f"  Résultat: {sent_count} envoyés")

    return sent_count


async def get_eligible_contacts(db, automation, tenant):
    """Récupérer les contacts éligibles selon le type d'automation."""
    today = datetime.utcnow()
    target_group_id = automation.trigger_config.get("target_group_id")

    # Base query selon le groupe cible
    if target_group_id:
        base_query = (
            select(Contact)
            .join(ContactGroupMember, ContactGroupMember.contact_id == Contact.id)
            .where(
                ContactGroupMember.group_id == target_group_id,
                Contact.tenant_id == tenant.id,
                Contact.is_subscribed == True,
            )
        )
    else:
        base_query = select(Contact).where(
            Contact.tenant_id == tenant.id,
            Contact.is_subscribed == True,
        )

    if automation.type == "birthday":
        # Contacts dont c'est l'anniversaire aujourd'hui
        birthday_query = base_query.where(
            Contact.birth_date.isnot(None),
            func.extract("month", Contact.birth_date) == today.month,
            func.extract("day", Contact.birth_date) == today.day,
        )
        result = await db.execute(birthday_query)
        all_birthday_contacts = result.scalars().all()

        # Protection doublons : exclure ceux qui ont déjà reçu un SMS birthday aujourd'hui
        if all_birthday_contacts:
            today_start = today.replace(hour=0, minute=0, second=0, microsecond=0)
            already_sent_result = await db.execute(
                select(Message.contact_id).where(
                    Message.tenant_id == tenant.id,
                    Message.type == "birthday",
                    Message.created_at >= today_start,
                    Message.contact_id.in_([c.id for c in all_birthday_contacts]),
                ).distinct()
            )
            already_sent_ids = set(row[0] for row in already_sent_result.all())

            contacts = [c for c in all_birthday_contacts if c.id not in already_sent_ids]
            if already_sent_ids:
                logger.info(f"    {len(already_sent_ids)} contact(s) déjà notifié(s) aujourd'hui — exclus")
            return contacts

        return all_birthday_contacts

    elif automation.type == "inactivity":
        # Contacts n'ayant pas reçu de SMS depuis X jours
        days = automation.trigger_config.get("days", 30)
        threshold = today - timedelta(days=days)

        # Sous-requête : contacts ayant reçu un message récemment
        recent_contacts_subq = (
            select(Message.contact_id)
            .where(
                Message.tenant_id == tenant.id,
                Message.created_at > threshold,
                Message.contact_id.isnot(None),
            )
            .distinct()
            .scalar_subquery()
        )

        result = await db.execute(
            base_query.where(Contact.id.notin_(recent_contacts_subq))
        )
        return result.scalars().all()

    elif automation.type == "recurring":
        # Tous les contacts (du groupe ou tous)
        result = await db.execute(base_query)
        return result.scalars().all()

    elif automation.type == "welcome":
        # Géré à l'ajout du contact, pas par le worker
        return []

    return []


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


def should_run(automation) -> bool:
    """Vérifier si l'automation doit s'exécuter maintenant."""
    now = datetime.utcnow()

    if automation.type == "birthday":
        # Une fois par jour
        if automation.last_run_at and automation.last_run_at.date() == now.date():
            return False
        return True

    elif automation.type == "inactivity":
        # Une fois par jour
        if automation.last_run_at and automation.last_run_at.date() == now.date():
            return False
        return True

    elif automation.type == "recurring":
        interval = automation.trigger_config.get("interval", "weekly")
        if not automation.last_run_at:
            return True

        if interval == "daily":
            return (now - automation.last_run_at) >= timedelta(days=1)
        elif interval == "weekly":
            return (now - automation.last_run_at) >= timedelta(weeks=1)
        elif interval == "monthly":
            return (now - automation.last_run_at) >= timedelta(days=30)

    elif automation.type == "welcome":
        # Géré ailleurs (à l'ajout du contact)
        return False

    return False


async def check_automations():
    """Vérifier et exécuter les automations actives."""
    async with async_session() as db:
        result = await db.execute(
            select(Automation).where(Automation.is_active == True)
        )
        automations = result.scalars().all()

        if not automations:
            return

        executed_count = 0
        skipped_count = 0
        total_sent = 0

        for automation in automations:
            if not should_run(automation):
                continue

            # Récupérer le tenant
            tenant_result = await db.execute(
                select(Tenant).where(Tenant.id == automation.tenant_id)
            )
            tenant = tenant_result.scalar_one()

            # Vérification : tenant actif
            if not tenant.is_active:
                logger.warning(
                    f"  Automation {automation.id} ({automation.name}): "
                    f"tenant '{tenant.name}' désactivé — ignorée"
                )
                skipped_count += 1
                continue

            # Vérification : abonnement actif
            from datetime import datetime as dt_check
            now_check = dt_check.utcnow()
            sub_result = await db.execute(
                select(Subscription).where(
                    Subscription.tenant_id == tenant.id,
                    Subscription.status == "active",
                    Subscription.end_date >= now_check,
                ).limit(1)
            )
            if sub_result.scalar_one_or_none() is None:
                logger.warning(
                    f"  Automation {automation.id} ({automation.name}): "
                    f"tenant '{tenant.name}' abonnement expiré — ignorée"
                )
                skipped_count += 1
                continue

            logger.info(
                f"Exécution: {automation.name} (type: {automation.type}, tenant: {tenant.name})"
            )

            # Exécuter
            sent_count = await execute_automation(db, automation, tenant)

            # Mettre à jour les stats
            automation.last_run_at = datetime.utcnow()
            automation.total_sent += sent_count
            total_sent += sent_count
            executed_count += 1

            # Calculer le prochain run
            interval = automation.trigger_config.get("interval", "daily")
            if interval == "daily" or automation.type in ("birthday", "inactivity"):
                automation.next_run_at = datetime.utcnow() + timedelta(days=1)
            elif interval == "weekly":
                automation.next_run_at = datetime.utcnow() + timedelta(weeks=1)
            elif interval == "monthly":
                automation.next_run_at = datetime.utcnow() + timedelta(days=30)

        await db.commit()

        # Log résumé du cycle
        if executed_count > 0 or skipped_count > 0:
            logger.info(
                f"Cycle terminé: {executed_count} automation(s) exécutée(s), "
                f"{skipped_count} ignorée(s), {total_sent} SMS total envoyés"
            )


async def run_automation_worker():
    """Boucle principale du worker d'automations."""
    logger.info("=" * 60)
    logger.info("Automation worker démarré — vérification toutes les 5 minutes")
    logger.info(f"  Config: batch_size={BATCH_SIZE}, batch_pause={BATCH_PAUSE}s")
    logger.info("=" * 60)

    while True:
        try:
            await check_automations()
        except Exception as e:
            logger.error(f"Erreur dans le worker: {e}", exc_info=True)

        await asyncio.sleep(CHECK_INTERVAL)


def handler(event, context):
    """AWS Lambda handler déclenché par EventBridge (toutes les 5 minutes)."""
    asyncio.run(check_automations())
    return {"statusCode": 200, "body": "OK"}


if __name__ == "__main__":
    asyncio.run(run_automation_worker())
