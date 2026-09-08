import json
import logging

from app.core.database import async_session
from app.models import Message
from app.services.sms_provider import get_sms_provider, get_whatsapp_provider

logger = logging.getLogger(__name__)


async def process_sms(message_id: str):
    """Traiter l'envoi d'un message individuel (SMS ou WhatsApp)."""
    async with async_session() as db:
        from sqlalchemy import select
        from datetime import datetime, timezone

        from app.models import Tenant

        result = await db.execute(select(Message).where(Message.id == message_id))
        message = result.scalar_one_or_none()

        if not message:
            logger.error(f"Message {message_id} non trouvé")
            return

        # Récupérer le tenant et ses identifiants
        tenant_result = await db.execute(select(Tenant).where(Tenant.id == message.tenant_id))
        tenant = tenant_result.scalar_one_or_none()

        try:
            # Déterminer le canal et utiliser le bon provider
            channel = getattr(message, "channel", "sms") or "sms"

            if channel == "whatsapp":
                provider = get_whatsapp_provider(tenant=tenant)
                # Pour WhatsApp, le contenu peut contenir un template name
                # Format: "[Template: template_name]" ou texte libre
                if message.content.startswith("[Template:"):
                    template_name = message.content.replace("[Template:", "").replace("]", "").strip()
                    result = await provider.send_template(
                        phone=message.phone,
                        template_name=template_name,
                    )
                else:
                    result = await provider.send_text(
                        phone=message.phone,
                        content=message.content,
                    )
                message.status = "sent"
                message.provider = "whatsapp"
                message.provider_id = result["provider_id"]
                message.sent_at = datetime.now(timezone.utc)
            else:
                # Canal SMS classique
                provider_name = tenant.sms_provider if tenant else "3mi"
                provider = get_sms_provider(provider_name, tenant=tenant)
                result = await provider.send(phone=message.phone, content=message.content)

                message.status = "sent"
                message.provider = provider_name
                message.provider_id = result["provider_id"]
                message.sent_at = datetime.now(timezone.utc)

        except Exception as e:
            logger.error(f"Erreur envoi message {message_id} (canal={channel}): {str(e)}")
            message.status = "failed"
            message.error_message = str(e)[:500]

        await db.commit()


def handler(event, context):
    """AWS Lambda handler pour les messages SQS."""
    import asyncio

    async def process_batch():
        for record in event.get("Records", []):
            body = json.loads(record["body"])
            message_id = body.get("message_id")
            if message_id:
                await process_sms(message_id)

    asyncio.run(process_batch())

    return {"statusCode": 200, "body": "OK"}
