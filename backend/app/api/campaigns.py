import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import Campaign, Contact, ContactGroup, Message, Tenant, User
from app.schemas import CampaignCreate, CampaignResponse, PaginatedResponse

router = APIRouter(prefix="/campaigns", tags=["Campagnes"])


@router.get("", response_model=PaginatedResponse)
async def list_campaigns(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lister les campagnes de l'entreprise."""
    query = select(Campaign).where(Campaign.tenant_id == current_user.tenant_id)

    if status_filter:
        query = query.where(Campaign.status == status_filter)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    offset = (page - 1) * page_size
    query = query.order_by(Campaign.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    campaigns = result.scalars().all()

    return PaginatedResponse(
        items=[CampaignResponse.model_validate(c) for c in campaigns],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.post("", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    data: CampaignCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Créer une nouvelle campagne."""
    campaign = Campaign(
        tenant_id=current_user.tenant_id,
        created_by=current_user.id,
        name=data.name,
        content=data.content,
        type=data.type,
        template_id=data.template_id,
        target_group_id=data.target_group_id,
        target_filters=data.target_filters,
        scheduled_at=data.scheduled_at,
        is_ab_test=data.is_ab_test,
        variant_a=data.variant_a,
        variant_b=data.variant_b,
        status="draft",
    )
    db.add(campaign)
    await db.flush()
    await db.refresh(campaign)
    return campaign


@router.patch("/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: uuid.UUID,
    data: CampaignCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Modifier une campagne en brouillon."""
    result = await db.execute(
        select(Campaign).where(
            Campaign.id == campaign_id,
            Campaign.tenant_id == current_user.tenant_id,
        )
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campagne non trouvée")

    if campaign.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Seule une campagne en brouillon peut être modifiée",
        )

    campaign.name = data.name
    campaign.content = data.content
    campaign.type = data.type
    if data.target_group_id is not None:
        campaign.target_group_id = data.target_group_id
    if data.template_id is not None:
        campaign.template_id = data.template_id

    await db.flush()
    await db.refresh(campaign)
    return campaign


@router.get("/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(
    campaign_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Récupérer les détails d'une campagne."""
    result = await db.execute(
        select(Campaign).where(
            Campaign.id == campaign_id,
            Campaign.tenant_id == current_user.tenant_id,
        )
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campagne non trouvée")
    return campaign


@router.post("/{campaign_id}/send", status_code=status.HTTP_202_ACCEPTED)
async def send_campaign(
    campaign_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lancer l'envoi immédiat d'une campagne via 3MI."""
    from app.models import ContactGroupMember
    from app.services.sms_provider import get_sms_provider

    result = await db.execute(
        select(Campaign).where(
            Campaign.id == campaign_id,
            Campaign.tenant_id == current_user.tenant_id,
        )
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campagne non trouvée")

    if campaign.status not in ("draft", "scheduled"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Impossible d'envoyer une campagne avec le statut '{campaign.status}'",
        )

    # Récupérer le tenant
    tenant_result = await db.execute(
        select(Tenant).where(Tenant.id == current_user.tenant_id)
    )
    tenant = tenant_result.scalar_one()

    # Récupérer les destinataires
    if campaign.target_group_id:
        # Contacts du groupe ciblé
        recipients_query = (
            select(Contact)
            .join(ContactGroupMember, ContactGroupMember.contact_id == Contact.id)
            .where(
                ContactGroupMember.group_id == campaign.target_group_id,
                Contact.tenant_id == current_user.tenant_id,
                Contact.is_subscribed == True,
            )
        )
    else:
        # Tous les contacts abonnés
        recipients_query = select(Contact).where(
            Contact.tenant_id == current_user.tenant_id,
            Contact.is_subscribed == True,
        )

    recipients_result = await db.execute(recipients_query)
    recipients = recipients_result.scalars().all()

    if not recipients:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Aucun destinataire éligible pour cette campagne",
        )

    total_recipients = len(recipients)

    # Mettre à jour le statut
    campaign.status = "sending"
    campaign.total_recipients = total_recipients
    campaign.sent_at = datetime.utcnow()
    await db.flush()

    # Envoyer via 3MI
    provider = get_sms_provider(tenant.sms_provider, tenant=tenant)
    sent_count = 0
    failed_count = 0

    phones = [c.phone for c in recipients]

    def personalize_content(content: str, contact: Contact) -> str:
        """Remplacer les variables du template par les données du contact."""
        replacements = {
            "{{first_name}}": contact.first_name or "",
            "{{last_name}}": contact.last_name or "",
            "{{phone}}": contact.phone or "",
            "{{email}}": contact.email or "",
            "{{city}}": contact.city or "",
            "{{country}}": contact.country or "",
        }
        result = content
        for placeholder, value in replacements.items():
            result = result.replace(placeholder, value)
        return result

    try:
        # Essayer l'envoi bulk
        if hasattr(provider, "send_bulk"):
            # Pour le bulk, on ne peut pas personnaliser par contact
            # On vérifie s'il y a des variables dans le contenu
            has_variables = "{{" in campaign.content and "}}" in campaign.content

            if has_variables:
                # Envoi individuel pour personnaliser le message
                for contact in recipients:
                    try:
                        personalized = personalize_content(campaign.content, contact)
                        r = await provider.send(
                            phone=contact.phone,
                            content=personalized,
                            sender=tenant.smsbus_sender_id,
                        )
                        msg = Message(
                            tenant_id=current_user.tenant_id,
                            campaign_id=campaign.id,
                            contact_id=contact.id,
                            phone=contact.phone,
                            content=personalized,
                            type=campaign.type,
                            status=r.get("status", "sent"),
                            provider=tenant.sms_provider,
                            provider_id=r.get("provider_id"),
                            sent_at=datetime.utcnow(),
                            segments_count=max(1, (len(personalized) + 159) // 160),
                        )
                        db.add(msg)
                        sent_count += 1
                    except Exception as e:
                        msg = Message(
                            tenant_id=current_user.tenant_id,
                            campaign_id=campaign.id,
                            contact_id=contact.id,
                            phone=contact.phone,
                            content=personalize_content(campaign.content, contact),
                            type=campaign.type,
                            status="failed",
                            provider=tenant.sms_provider,
                            error_message=str(e),
                            segments_count=max(1, (len(campaign.content) + 159) // 160),
                        )
                        db.add(msg)
                        failed_count += 1
            else:
                # Pas de variables, envoi bulk normal
                results = await provider.send_bulk(
                    phones=phones,
                    content=campaign.content,
                    sender=tenant.smsbus_sender_id,
                )

                for i, r in enumerate(results):
                    contact = recipients[i] if i < len(recipients) else None
                    msg = Message(
                        tenant_id=current_user.tenant_id,
                        campaign_id=campaign.id,
                        contact_id=contact.id if contact else None,
                        phone=r["phone"],
                        content=campaign.content,
                        type=campaign.type,
                        status=r.get("status", "sent"),
                        provider=tenant.sms_provider,
                        provider_id=r.get("provider_id"),
                        sent_at=datetime.utcnow(),
                        segments_count=max(1, (len(campaign.content) + 159) // 160),
                    )
                    db.add(msg)
                    sent_count += 1

        else:
            # Fallback: envoi un par un
            for contact in recipients:
                try:
                    personalized = personalize_content(campaign.content, contact)
                    r = await provider.send(
                        phone=contact.phone,
                        content=personalized,
                        sender=tenant.smsbus_sender_id,
                    )
                    msg = Message(
                        tenant_id=current_user.tenant_id,
                        campaign_id=campaign.id,
                        contact_id=contact.id,
                        phone=contact.phone,
                        content=personalized,
                        type=campaign.type,
                        status=r.get("status", "sent"),
                        provider=tenant.sms_provider,
                        provider_id=r.get("provider_id"),
                        sent_at=datetime.utcnow(),
                        segments_count=max(1, (len(personalized) + 159) // 160),
                    )
                    db.add(msg)
                    sent_count += 1
                except Exception as e:
                    msg = Message(
                        tenant_id=current_user.tenant_id,
                        campaign_id=campaign.id,
                        contact_id=contact.id,
                        phone=contact.phone,
                        content=personalize_content(campaign.content, contact),
                        type=campaign.type,
                        status="failed",
                        provider=tenant.sms_provider,
                        error_message=str(e),
                        segments_count=max(1, (len(campaign.content) + 159) // 160),
                    )
                    db.add(msg)
                    failed_count += 1

    except Exception as e:
        # Échec total du bulk
        campaign.status = "failed"
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Erreur d'envoi campagne: {str(e)}",
        )

    # Mettre à jour les stats de la campagne
    campaign.status = "sent"
    campaign.total_sent = sent_count
    campaign.total_failed = failed_count
    campaign.total_delivered = sent_count  # Sera mis à jour par les DLR

    await db.commit()

    return {
        "message": "Campagne envoyée",
        "campaign_id": str(campaign.id),
        "total_recipients": total_recipients,
        "total_sent": sent_count,
        "total_failed": failed_count,
    }


@router.post("/{campaign_id}/schedule", status_code=status.HTTP_200_OK)
async def schedule_campaign(
    campaign_id: uuid.UUID,
    scheduled_at: datetime,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Programmer l'envoi d'une campagne."""
    result = await db.execute(
        select(Campaign).where(
            Campaign.id == campaign_id,
            Campaign.tenant_id == current_user.tenant_id,
        )
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campagne non trouvée")

    if campaign.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Seule une campagne en brouillon peut être programmée",
        )

    if scheduled_at <= datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La date programmée doit être dans le futur",
        )

    campaign.status = "scheduled"
    campaign.scheduled_at = scheduled_at
    await db.flush()

    # TODO: Créer un EventBridge schedule

    return {"message": "Campagne programmée", "scheduled_at": scheduled_at.isoformat()}


@router.post("/{campaign_id}/cancel", status_code=status.HTTP_200_OK)
async def cancel_campaign(
    campaign_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Annuler une campagne programmée."""
    result = await db.execute(
        select(Campaign).where(
            Campaign.id == campaign_id,
            Campaign.tenant_id == current_user.tenant_id,
        )
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campagne non trouvée")

    if campaign.status != "scheduled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Seule une campagne programmée peut être annulée",
        )

    campaign.status = "cancelled"
    await db.flush()

    return {"message": "Campagne annulée"}
