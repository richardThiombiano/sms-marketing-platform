"""
Worker de polling DLR (Delivery Report).

Ce worker vérifie toutes les 3 minutes le statut de livraison
des messages SMS envoyés via 3MI, en interrogeant l'API smsState.

Seuls les messages au statut "sent" ou "queued" envoyés dans les
dernières 24 heures sont vérifiés.

Améliorations :
- Traitement par batch de 50 pour éviter les timeouts
- Pause entre les requêtes (rate limiting API 3MI)
- Mise à jour des compteurs de campagne
- Logs structurés avec métriques par run

Lancement :
    python -m app.workers.dlr_worker
"""

import asyncio
import logging
from datetime import datetime, timedelta

from sqlalchemy import select

from app.core.database import async_session
from app.models import Campaign, Message, Tenant
from app.services.sms_provider import get_sms_provider

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

CHECK_INTERVAL = 180  # Vérifier toutes les 3 minutes
BATCH_SIZE = 50  # Traiter 50 messages par cycle
REQUEST_PAUSE = 0.5  # Pause de 0.5s entre chaque requête API
MAX_MESSAGE_AGE_HOURS = 24  # Ne vérifier que les messages des dernières 24h


# Mapping des statuts DLR 3MI vers les statuts internes
# Documentation 3MI :
# - ENROUTE : Le message est en route
# - DELIVERED : Message délivré au destinataire final
# - EXPIRED : Message expiré auprès de l'opérateur télécom
# - DELETED : Message supprimé au niveau de l'opérateur
# - UNDELIVERABLE : Numéro destinataire non valide ou injoignable
# - UNKNOWN : L'état du message est inconnu
STATUS_MAPPING = {
    "enroute": "sent",
    "delivered": "delivered",
    "expired": "failed",
    "deleted": "failed",
    "undeliverable": "failed",
    "unknown": "sent",
}


async def check_dlr_statuses():
    """
    Interroger 3MI pour les messages en attente de DLR.

    Sélectionne les messages au statut 'sent' ou 'queued' envoyés
    dans les dernières 24h, et vérifie leur statut via smsState.
    """
    async with async_session() as db:
        now = datetime.utcnow()
        age_limit = now - timedelta(hours=MAX_MESSAGE_AGE_HOURS)

        # Récupérer les messages en attente de DLR
        # On exclut uniquement les statuts finaux (delivered, failed)
        # Tous les autres statuts sont vérifiés (sent, queued, pending, etc.)
        result = await db.execute(
            select(Message).where(
                Message.status.notin_(["delivered", "failed"]),
                Message.provider_id.isnot(None),
                Message.sent_at >= age_limit,
            ).order_by(Message.sent_at.asc()).limit(BATCH_SIZE)
        )
        messages = result.scalars().all()

        if not messages:
            return

        logger.info(f"Vérification DLR : {len(messages)} message(s) à traiter")

        # Regrouper les messages par tenant pour optimiser les appels
        tenant_messages: dict[str, list] = {}
        for msg in messages:
            tid = str(msg.tenant_id)
            if tid not in tenant_messages:
                tenant_messages[tid] = []
            tenant_messages[tid].append(msg)

        total_updated = 0
        total_delivered = 0
        total_failed = 0
        total_errors = 0

        for tenant_id, tenant_msgs in tenant_messages.items():
            # Récupérer le tenant et son provider
            tenant_result = await db.execute(
                select(Tenant).where(Tenant.id == tenant_id)
            )
            tenant = tenant_result.scalar_one_or_none()

            if not tenant:
                logger.warning(f"  Tenant {tenant_id} introuvable — {len(tenant_msgs)} message(s) ignoré(s)")
                continue

            provider = get_sms_provider(tenant.sms_provider or "3mi", tenant=tenant)

            for msg in tenant_msgs:
                try:
                    provider_status = await provider.get_status(msg.provider_id)
                    new_status = STATUS_MAPPING.get(provider_status, msg.status)

                    if new_status != msg.status:
                        old_status = msg.status
                        msg.status = new_status
                        total_updated += 1

                        if new_status == "delivered":
                            msg.delivered_at = datetime.utcnow()
                            total_delivered += 1
                        elif new_status == "failed":
                            msg.error_message = f"DLR: {provider_status}"
                            total_failed += 1

                        # Mettre à jour les compteurs de campagne
                        if msg.campaign_id:
                            await _update_campaign_counters(
                                db, msg.campaign_id, old_status, new_status
                            )

                except Exception as e:
                    total_errors += 1
                    logger.debug(f"  Erreur DLR pour message {msg.id}: {e}")

                # Pause entre les requêtes pour ne pas surcharger l'API 3MI
                await asyncio.sleep(REQUEST_PAUSE)

        await db.commit()

        if total_updated > 0:
            logger.info(
                f"  Résultat: {total_updated} mis à jour "
                f"({total_delivered} délivrés, {total_failed} échoués, {total_errors} erreurs)"
            )


async def _update_campaign_counters(db, campaign_id, old_status: str, new_status: str):
    """Mettre à jour les compteurs delivered/failed d'une campagne."""
    campaign_result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )
    campaign = campaign_result.scalar_one_or_none()

    if not campaign:
        return

    if new_status == "delivered" and old_status != "delivered":
        campaign.total_delivered = (campaign.total_delivered or 0) + 1
    elif new_status == "failed" and old_status != "failed":
        campaign.total_failed = (campaign.total_failed or 0) + 1


async def run_dlr_worker():
    """Boucle principale du worker DLR."""
    logger.info("=" * 60)
    logger.info("Worker DLR démarré — vérification toutes les 3 minutes")
    logger.info(f"  Config: batch_size={BATCH_SIZE}, pause={REQUEST_PAUSE}s, max_age={MAX_MESSAGE_AGE_HOURS}h")
    logger.info("=" * 60)

    while True:
        try:
            await check_dlr_statuses()
        except Exception as e:
            logger.error(f"Erreur dans le worker DLR: {e}", exc_info=True)

        await asyncio.sleep(CHECK_INTERVAL)


def handler(event, context):
    """AWS Lambda handler déclenché par EventBridge (cron toutes les 2 min)."""
    # Sur Lambda, l'engine SQLAlchemy async peut avoir un event loop stale.
    # On recrée un event loop propre et on dispose l'engine à la fin.
    import asyncio as _asyncio
    from app.core.database import engine

    # Forcer la recréation d'un event loop propre
    try:
        loop = _asyncio.get_event_loop()
        if loop.is_closed():
            raise RuntimeError("closed")
    except RuntimeError:
        loop = _asyncio.new_event_loop()
        _asyncio.set_event_loop(loop)

    async def _run():
        try:
            await engine.dispose()  # Nettoyer les connexions stale
            await check_dlr_statuses()
        finally:
            await engine.dispose()

    loop.run_until_complete(_run())
    return {"statusCode": 200, "body": "OK"}


if __name__ == "__main__":
    asyncio.run(run_dlr_worker())
