"""
Service pour créer des notifications.
Appelé depuis les endpoints et workers quand un événement se produit.
"""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Notification


async def create_notification(
    db: AsyncSession,
    tenant_id: UUID,
    type: str,
    title: str,
    message: str,
    user_id: UUID | None = None,
    data: dict | None = None,
):
    """Créer une notification."""
    notification = Notification(
        tenant_id=tenant_id,
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        data=data,
    )
    db.add(notification)


async def notify_sms_failed(db: AsyncSession, tenant_id: UUID, phone: str, error: str):
    """Notifier qu'un SMS a échoué."""
    await create_notification(
        db=db,
        tenant_id=tenant_id,
        type="sms_failed",
        title="SMS échoué",
        message=f"L'envoi vers {phone} a échoué : {error}",
        data={"phone": phone, "error": error},
    )


async def notify_low_balance(db: AsyncSession, tenant_id: UUID, amount: float, currency: str):
    """Notifier que le solde est bas."""
    await create_notification(
        db=db,
        tenant_id=tenant_id,
        type="low_balance",
        title="Solde SMS faible",
        message=f"Votre solde est de {amount} {currency}. Pensez à recharger.",
        data={"amount": amount, "currency": currency},
    )


async def notify_campaign_sent(db: AsyncSession, tenant_id: UUID, campaign_name: str, total_sent: int):
    """Notifier qu'une campagne a été envoyée."""
    await create_notification(
        db=db,
        tenant_id=tenant_id,
        type="campaign_sent",
        title="Campagne envoyée",
        message=f'La campagne "{campaign_name}" a été envoyée à {total_sent} destinataire(s).',
        data={"campaign_name": campaign_name, "total_sent": total_sent},
    )


async def notify_team_joined(db: AsyncSession, tenant_id: UUID, member_name: str, member_email: str):
    """Notifier qu'un nouveau membre a rejoint l'équipe."""
    await create_notification(
        db=db,
        tenant_id=tenant_id,
        type="team_joined",
        title="Nouveau membre",
        message=f"{member_name} ({member_email}) a rejoint votre équipe.",
        data={"member_name": member_name, "member_email": member_email},
    )
