import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import Contact, ContactGroup, ContactGroupMember, Message, Tenant, User
from app.schemas import SmsBulkRequest, SmsSendRequest, SmsResponse
from app.services.sms_provider import get_sms_provider

router = APIRouter(prefix="/sms", tags=["SMS Direct"])


# ============================================
# ESTIMATION DU COÛT SMS
# ============================================


class SmsCostEstimateRequest(BaseModel):
    phone: str = Field(..., description="Numéro de téléphone destinataire")
    content: str = Field(..., description="Contenu du message")


class SmsCostEstimateResponse(BaseModel):
    segments: int
    encoding: str
    char_count: int
    chars_per_segment: int
    unit_price: float | None
    total_cost: float | None
    country_code: str | None
    country_name: str | None
    is_exact: bool


@router.post("/estimate-cost", response_model=SmsCostEstimateResponse)
async def estimate_sms_cost(
    data: SmsCostEstimateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Estimer le coût d'un SMS avant envoi."""
    from app.services.sms_pricing import calculate_sms_cost

    result = await calculate_sms_cost(db, data.phone, data.content)
    return SmsCostEstimateResponse(**result)


# ============================================
# HISTORIQUE DES MESSAGES
# ============================================


@router.get("/messages", status_code=status.HTTP_200_OK)
async def list_messages(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    type_filter: str | None = Query(None, alias="type"),
    phone: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lister l'historique des messages envoyés avec les infos contact."""

    # LEFT JOIN avec Contact pour récupérer nom/prénom
    query = (
        select(Message, Contact.first_name.label("contact_first_name"), Contact.last_name.label("contact_last_name"))
        .outerjoin(Contact, Message.contact_id == Contact.id)
        .where(Message.tenant_id == current_user.tenant_id)
    )

    if status_filter:
        query = query.where(Message.status == status_filter)

    if type_filter:
        query = query.where(Message.type == type_filter)

    if phone:
        query = query.where(Message.phone.ilike(f"%{phone}%"))

    # Count total
    count_subquery = (
        select(func.count(Message.id))
        .outerjoin(Contact, Message.contact_id == Contact.id)
        .where(Message.tenant_id == current_user.tenant_id)
    )
    if status_filter:
        count_subquery = count_subquery.where(Message.status == status_filter)
    if type_filter:
        count_subquery = count_subquery.where(Message.type == type_filter)
    if phone:
        count_subquery = count_subquery.where(Message.phone.ilike(f"%{phone}%"))

    total = (await db.execute(count_subquery)).scalar()

    offset = (page - 1) * page_size
    query = query.order_by(Message.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    rows = result.all()

    return {
        "items": [
            {
                "id": str(m.id),
                "phone": m.phone,
                "content": m.content,
                "type": m.type,
                "status": m.status,
                "provider": m.provider,
                "provider_id": m.provider_id,
                "error_message": m.error_message,
                "sent_at": m.sent_at.isoformat() if m.sent_at else None,
                "delivered_at": m.delivered_at.isoformat() if m.delivered_at else None,
                "segments_count": m.segments_count,
                "cost": m.cost,
                "created_at": m.created_at.isoformat() if m.created_at else None,
                "contact_first_name": contact_first_name,
                "contact_last_name": contact_last_name,
            }
            for m, contact_first_name, contact_last_name in rows
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


# ============================================
# SOLDE SMS (via provider 3MI)
# ============================================


@router.get("/balance", status_code=status.HTTP_200_OK)
async def get_sms_balance(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Récupérer le solde réel de SMS depuis le provider 3MI."""
    tenant_result = await db.execute(
        select(Tenant).where(Tenant.id == current_user.tenant_id)
    )
    tenant = tenant_result.scalar_one()

    try:
        provider = get_sms_provider(tenant.sms_provider, tenant=tenant)
        if hasattr(provider, "get_balance"):
            balance = await provider.get_balance()
            return {
                "amount": balance.get("amount", 0),
                "currency": balance.get("currency", "XOF"),
                "source": "provider",
                "provider": tenant.sms_provider,
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail=f"Le provider {tenant.sms_provider} ne supporte pas la vérification de solde",
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Erreur de communication avec le provider: {str(e)}",
        )


# ============================================
# ENVOI SMS UNIQUE (via provider 3MI)
# ============================================


@router.post("/send", response_model=SmsResponse, status_code=status.HTTP_202_ACCEPTED)
async def send_sms(
    data: SmsSendRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Envoyer un SMS unique via le provider 3MI."""
    from app.services.sms_pricing import calculate_sms_cost

    tenant_result = await db.execute(
        select(Tenant).where(Tenant.id == current_user.tenant_id)
    )
    tenant = tenant_result.scalar_one()

    # Calculer le nombre de segments et le coût
    cost_info = await calculate_sms_cost(db, data.phone, data.content)
    segments_count = cost_info["segments"] or max(1, (len(data.content) + 159) // 160)
    sms_cost = cost_info["total_cost"]

    # Rechercher le contact_id par numéro de téléphone
    contact_id = None
    contact_result = await db.execute(
        select(Contact.id).where(
            Contact.tenant_id == current_user.tenant_id,
            Contact.phone == data.phone,
        ).limit(1)
    )
    contact_row = contact_result.scalar_one_or_none()
    if contact_row:
        contact_id = contact_row

    # Envoyer via le provider SMS
    provider = get_sms_provider(tenant.sms_provider, tenant=tenant)

    try:
        result = await provider.send(
            phone=data.phone,
            content=data.content,
            sender=tenant.smsbus_sender_id,
        )

        # Créer le message en base avec le statut retourné
        message = Message(
            tenant_id=current_user.tenant_id,
            contact_id=contact_id,
            phone=data.phone,
            content=data.content,
            type=data.type,
            status=result.get("status", "sent"),
            provider=tenant.sms_provider,
            provider_id=result.get("provider_id"),
            sent_at=datetime.utcnow(),
            segments_count=segments_count,
            cost=sms_cost,
        )
        db.add(message)

        await db.flush()

        return SmsResponse(
            message_id=message.id,
            phone=data.phone,
            status=result.get("status", "sent"),
            credits_used=segments_count,
        )

    except Exception as e:
        # Logger le message en échec (pas de déduction de crédits)
        message = Message(
            tenant_id=current_user.tenant_id,
            contact_id=contact_id,
            phone=data.phone,
            content=data.content,
            type=data.type,
            status="failed",
            provider=tenant.sms_provider,
            error_message=str(e)[:500],
            segments_count=segments_count,
        )
        db.add(message)

        # Notification SMS échoué
        from app.services.notifications import notify_sms_failed
        await notify_sms_failed(db, current_user.tenant_id, data.phone, str(e))

        await db.commit()

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Erreur d'envoi SMS: {str(e)}",
        )


# ============================================
# ENVOI SMS EN MASSE (via provider 3MI)
# ============================================


@router.post("/send-bulk", status_code=status.HTTP_202_ACCEPTED)
async def send_bulk_sms(
    data: SmsBulkRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Envoyer des SMS en masse via le provider 3MI."""
    total_sms = len(data.phones)

    tenant_result = await db.execute(
        select(Tenant).where(Tenant.id == current_user.tenant_id)
    )
    tenant = tenant_result.scalar_one()

    # Calculer le nombre de segments par message
    segments_per_msg = max(1, (len(data.content) + 159) // 160)

    # Vérification du solde avant envoi
    from app.services.sms_pricing import calculate_sms_cost
    cost_info = await calculate_sms_cost(db, data.phones[0] if data.phones else "+22670000000", data.content)
    estimated_total_cost = (cost_info["total_cost"] or 0) * total_sms

    provider = get_sms_provider(tenant.sms_provider, tenant=tenant)

    try:
        if hasattr(provider, "get_balance"):
            balance = await provider.get_balance()
            current_balance = balance.get("amount", 0)
            if current_balance < estimated_total_cost:
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail=f"Solde insuffisant. Solde actuel : {current_balance:.0f} FCFA. Coût estimé : {estimated_total_cost:.0f} FCFA pour {total_sms} SMS.",
                )
    except HTTPException:
        raise
    except Exception:
        pass  # Si le check de solde échoue, on continue quand même

    # Rechercher les contact_id par numéro de téléphone
    contacts_result = await db.execute(
        select(Contact.id, Contact.phone).where(
            Contact.tenant_id == current_user.tenant_id,
            Contact.phone.in_(data.phones),
        )
    )
    phone_to_contact_id = {row.phone: row.id for row in contacts_result.all()}

    # Essayer l'envoi bulk si supporté
    sent_count = 0
    try:
        if hasattr(provider, "send_bulk"):
            results = await provider.send_bulk(
                phones=data.phones,
                content=data.content,
                sender=tenant.smsbus_sender_id,
            )

            # Logger les messages en base
            for r in results:
                message = Message(
                    tenant_id=current_user.tenant_id,
                    contact_id=phone_to_contact_id.get(r["phone"]),
                    phone=r["phone"],
                    content=data.content,
                    type=data.type,
                    status=r.get("status", "sent"),
                    provider=tenant.sms_provider,
                    provider_id=r.get("provider_id"),
                    sent_at=datetime.utcnow(),
                    segments_count=segments_per_msg,
                )
                db.add(message)
                if r.get("status") != "failed":
                    sent_count += 1

            # Décrémenter les crédits (uniquement pour les envois réussis)
            await db.flush()

            return {
                "message": f"{sent_count} SMS envoyés avec succès",
                "total_queued": sent_count,
            }
        else:
            # Fallback: envoyer un par un
            for phone in data.phones:
                try:
                    result = await provider.send(
                        phone=phone,
                        content=data.content,
                        sender=tenant.smsbus_sender_id,
                    )
                    message = Message(
                        tenant_id=current_user.tenant_id,
                        contact_id=phone_to_contact_id.get(phone),
                        phone=phone,
                        content=data.content,
                        type=data.type,
                        status=result.get("status", "sent"),
                        provider=tenant.sms_provider,
                        provider_id=result.get("provider_id"),
                        sent_at=datetime.utcnow(),
                        segments_count=segments_per_msg,
                    )
                    db.add(message)
                    sent_count += 1
                except Exception as e:
                    message = Message(
                        tenant_id=current_user.tenant_id,
                        contact_id=phone_to_contact_id.get(phone),
                        phone=phone,
                        content=data.content,
                        type=data.type,
                        status="failed",
                        provider=tenant.sms_provider,
                        error_message=str(e)[:500],
                        segments_count=segments_per_msg,
                    )
                    db.add(message)

            # Décrémenter les crédits
            await db.flush()

            from app.core.audit import log_audit
            log_audit("SMS_BULK_SENT", user_id=str(current_user.id), tenant_id=str(current_user.tenant_id), details={"total": total_sms, "sent": sent_count})

            return {
                "message": f"{sent_count}/{total_sms} SMS envoyés",
                "total_queued": sent_count,
            }

    except Exception as e:
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Erreur d'envoi bulk: {str(e)}",
        )


# ============================================
# ENVOI SMS AUX GROUPES (via provider 3MI)
# ============================================


class SendToGroupsRequest(BaseModel):
    group_ids: list[uuid.UUID] = Field(..., min_length=1)
    content: str = Field(..., min_length=1, max_length=1600)
    type: str = Field(default="marketing", pattern="^(marketing|transactional|birthday|reminder|promotional)$")


@router.post("/send-to-groups", status_code=status.HTTP_202_ACCEPTED)
async def send_to_groups(
    data: SendToGroupsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Envoyer un SMS à tous les contacts d'un ou plusieurs groupes via 3MI."""
    # Récupérer tous les contacts des groupes sélectionnés
    contacts_query = (
        select(Contact)
        .join(ContactGroupMember, ContactGroupMember.contact_id == Contact.id)
        .join(ContactGroup, ContactGroup.id == ContactGroupMember.group_id)
        .where(
            ContactGroup.tenant_id == current_user.tenant_id,
            ContactGroupMember.group_id.in_(data.group_ids),
            Contact.is_subscribed == True,
        )
        .distinct()
    )
    result = await db.execute(contacts_query)
    contacts = result.scalars().all()

    if not contacts:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Aucun contact abonné dans les groupes sélectionnés",
        )

    total_sms = len(contacts)
    phones = [c.phone for c in contacts]

    tenant_result = await db.execute(
        select(Tenant).where(Tenant.id == current_user.tenant_id)
    )
    tenant = tenant_result.scalar_one()

    # Calculer le nombre de segments par message
    segments_per_msg = max(1, (len(data.content) + 159) // 160)

    provider = get_sms_provider(tenant.sms_provider, tenant=tenant)

    # Vérification du solde avant envoi
    from app.services.sms_pricing import calculate_sms_cost
    cost_info = await calculate_sms_cost(db, phones[0] if phones else "+22670000000", data.content)
    estimated_total_cost = (cost_info["total_cost"] or 0) * total_sms

    try:
        if hasattr(provider, "get_balance"):
            balance = await provider.get_balance()
            current_balance = balance.get("amount", 0)
            if current_balance < estimated_total_cost:
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail=f"Solde insuffisant. Solde actuel : {current_balance:.0f} FCFA. Coût estimé : {estimated_total_cost:.0f} FCFA pour {total_sms} SMS.",
                )
    except HTTPException:
        raise
    except Exception:
        pass  # Si le check de solde échoue, on continue quand même

    try:
        # Envoi bulk via 3MI
        if hasattr(provider, "send_bulk"):
            results = await provider.send_bulk(
                phones=phones,
                content=data.content,
                sender=tenant.smsbus_sender_id,
            )

            for i, r in enumerate(results):
                contact = contacts[i] if i < len(contacts) else None
                message = Message(
                    tenant_id=current_user.tenant_id,
                    contact_id=contact.id if contact else None,
                    phone=r["phone"],
                    content=data.content,
                    type=data.type,
                    status=r.get("status", "sent"),
                    provider=tenant.sms_provider,
                    provider_id=r.get("provider_id"),
                    sent_at=datetime.utcnow(),
                    segments_count=max(1, (len(data.content) + 159) // 160),
                )
                db.add(message)
        else:
            # Fallback: envoi un par un
            for contact in contacts:
                try:
                    r = await provider.send(
                        phone=contact.phone,
                        content=data.content,
                        sender=tenant.smsbus_sender_id,
                    )
                    message = Message(
                        tenant_id=current_user.tenant_id,
                        contact_id=contact.id,
                        phone=contact.phone,
                        content=data.content,
                        type=data.type,
                        status=r.get("status", "sent"),
                        provider=tenant.sms_provider,
                        provider_id=r.get("provider_id"),
                        sent_at=datetime.utcnow(),
                        segments_count=max(1, (len(data.content) + 159) // 160),
                    )
                    db.add(message)
                except Exception as e:
                    message = Message(
                        tenant_id=current_user.tenant_id,
                        contact_id=contact.id,
                        phone=contact.phone,
                        content=data.content,
                        type=data.type,
                        status="failed",
                        provider=tenant.sms_provider,
                        error_message=str(e),
                        segments_count=max(1, (len(data.content) + 159) // 160),
                    )
                    db.add(message)

        await db.flush()

        from app.core.audit import log_audit
        log_audit("SMS_GROUP_SENT", user_id=str(current_user.id), tenant_id=str(current_user.tenant_id), details={"total": total_sms, "groups": len(data.group_ids)})

        return {
            "message": f"{total_sms} SMS envoyés aux groupes",
            "total_queued": total_sms,
            "groups_count": len(data.group_ids),
        }

    except HTTPException:
        raise
    except Exception as e:
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Erreur d'envoi aux groupes: {str(e)}",
        )


# ============================================
# VÉRIFICATION MANUELLE DU STATUT (polling 3MI)
# ============================================


@router.get("/messages/{message_id}/status", status_code=status.HTTP_200_OK)
async def check_message_status(
    message_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Vérifier le statut d'un message directement auprès de 3MI."""
    # Récupérer le message
    result = await db.execute(
        select(Message).where(
            Message.id == message_id,
            Message.tenant_id == current_user.tenant_id,
        )
    )
    message = result.scalar_one_or_none()
    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message non trouvé")

    if not message.provider_id:
        return {
            "message_id": str(message.id),
            "status": message.status,
            "provider_status": None,
            "detail": "Pas d'ID provider — impossible de vérifier le statut",
        }

    # Récupérer le tenant pour les identifiants API
    tenant_result = await db.execute(
        select(Tenant).where(Tenant.id == current_user.tenant_id)
    )
    tenant = tenant_result.scalar_one()

    provider = get_sms_provider(tenant.sms_provider, tenant=tenant)

    try:
        provider_status = await provider.get_status(message.provider_id)

        # Mapper le statut DLR 3MI
        # Doc 3MI : ENROUTE, DELIVERED, EXPIRED, DELETED, UNDELIVERABLE, UNKNOWN
        status_mapping = {
            "enroute": "sent",
            "delivered": "delivered",
            "expired": "failed",
            "deleted": "failed",
            "undeliverable": "failed",
            "unknown": message.status,
        }

        new_status = status_mapping.get(provider_status, message.status)

        # Mettre à jour si le statut a changé
        if new_status != message.status:
            message.status = new_status
            if new_status == "delivered":
                message.delivered_at = datetime.utcnow()
            elif new_status == "failed":
                message.error_message = f"DLR: {provider_status}"
            await db.commit()

        return {
            "message_id": str(message.id),
            "status": message.status,
            "provider_status": provider_status,
            "updated": new_status != message.status,
        }

    except Exception as e:
        return {
            "message_id": str(message.id),
            "status": message.status,
            "provider_status": None,
            "error": str(e),
        }


# ============================================
# VÉRIFICATION BATCH DES STATUTS DLR
# ============================================


class CheckStatusBatchRequest(BaseModel):
    message_ids: list[uuid.UUID] = Field(..., min_length=1, max_length=50, description="IDs des messages à vérifier (max 50)")


@router.post("/messages/check-status", status_code=status.HTTP_200_OK)
async def check_messages_status_batch(
    data: CheckStatusBatchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Vérifier le statut DLR de plusieurs messages en une seule requête.

    Interroge l'API 3MI (smsState) pour chaque message et met à jour
    les statuts en base de données.

    Limité à 50 messages par requête pour éviter les timeouts.
    """
    from app.models import Campaign

    # Récupérer les messages du tenant
    result = await db.execute(
        select(Message).where(
            Message.id.in_(data.message_ids),
            Message.tenant_id == current_user.tenant_id,
        )
    )
    messages = result.scalars().all()

    if not messages:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucun message trouvé",
        )

    # Récupérer le tenant pour les identifiants API
    tenant_result = await db.execute(
        select(Tenant).where(Tenant.id == current_user.tenant_id)
    )
    tenant = tenant_result.scalar_one()

    provider = get_sms_provider(tenant.sms_provider or "3mi", tenant=tenant)

    # Mapping des statuts DLR 3MI
    # Doc 3MI : ENROUTE, DELIVERED, EXPIRED, DELETED, UNDELIVERABLE, UNKNOWN
    status_mapping = {
        "enroute": "sent",
        "delivered": "delivered",
        "expired": "failed",
        "deleted": "failed",
        "undeliverable": "failed",
        "unknown": "sent",
    }

    results = []

    for message in messages:
        entry = {
            "message_id": str(message.id),
            "phone": message.phone,
            "previous_status": message.status,
            "current_status": message.status,
            "provider_status": None,
            "updated": False,
            "error": None,
        }

        # Si pas de provider_id, on ne peut pas vérifier
        if not message.provider_id:
            entry["error"] = "Pas d'ID provider"
            results.append(entry)
            continue

        # Si déjà en statut final, pas besoin de revérifier
        if message.status in ("delivered", "failed"):
            entry["provider_status"] = message.status
            results.append(entry)
            continue

        try:
            provider_status = await provider.get_status(message.provider_id)
            entry["provider_status"] = provider_status

            new_status = status_mapping.get(provider_status, message.status)

            if new_status != message.status:
                old_status = message.status
                message.status = new_status
                entry["current_status"] = new_status
                entry["updated"] = True

                if new_status == "delivered":
                    message.delivered_at = datetime.utcnow()
                elif new_status == "failed":
                    message.error_message = f"DLR: {provider_status}"

                # Mettre à jour les compteurs de campagne
                if message.campaign_id and new_status in ("delivered", "failed"):
                    campaign_result = await db.execute(
                        select(Campaign).where(Campaign.id == message.campaign_id)
                    )
                    campaign = campaign_result.scalar_one_or_none()
                    if campaign:
                        if new_status == "delivered" and old_status != "delivered":
                            campaign.total_delivered = (campaign.total_delivered or 0) + 1
                        elif new_status == "failed" and old_status != "failed":
                            campaign.total_failed = (campaign.total_failed or 0) + 1

        except Exception as e:
            entry["error"] = str(e)

        results.append(entry)

    await db.commit()

    # Résumé
    total_checked = len(results)
    total_updated = sum(1 for r in results if r["updated"])
    total_delivered = sum(1 for r in results if r["current_status"] == "delivered")
    total_failed = sum(1 for r in results if r["current_status"] == "failed")

    return {
        "summary": {
            "total_checked": total_checked,
            "total_updated": total_updated,
            "total_delivered": total_delivered,
            "total_failed": total_failed,
        },
        "results": results,
    }


# ============================================
# STATISTIQUES DE CONSOMMATION
# ============================================


@router.get("/stats", status_code=status.HTTP_200_OK)
async def get_sms_stats(
    period: str = Query("30d", pattern="^(7d|30d|90d|12m)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Statistiques de consommation SMS par période."""
    from sqlalchemy import cast, Date, case

    now = datetime.utcnow()

    if period == "7d":
        start_date = now - __import__("datetime").timedelta(days=7)
        group_by = "day"
    elif period == "30d":
        start_date = now - __import__("datetime").timedelta(days=30)
        group_by = "day"
    elif period == "90d":
        start_date = now - __import__("datetime").timedelta(days=90)
        group_by = "week"
    else:  # 12m
        start_date = now - __import__("datetime").timedelta(days=365)
        group_by = "month"

    # Stats globales sur la période
    base_query = select(Message).where(
        Message.tenant_id == current_user.tenant_id,
        Message.created_at >= start_date,
    )

    total_messages = (await db.execute(
        select(func.count()).select_from(base_query.subquery())
    )).scalar()

    sent_messages = (await db.execute(
        select(func.count()).select_from(
            base_query.where(Message.status.in_(["sent", "delivered"])).subquery()
        )
    )).scalar()

    failed_messages = (await db.execute(
        select(func.count()).select_from(
            base_query.where(Message.status == "failed").subquery()
        )
    )).scalar()

    delivered_messages = (await db.execute(
        select(func.count()).select_from(
            base_query.where(Message.status == "delivered").subquery()
        )
    )).scalar()

    # Stats par type
    marketing_count = (await db.execute(
        select(func.count()).select_from(
            base_query.where(Message.type == "marketing").subquery()
        )
    )).scalar()

    transactional_count = (await db.execute(
        select(func.count()).select_from(
            base_query.where(Message.type == "transactional").subquery()
        )
    )).scalar()

    promotional_count = (await db.execute(
        select(func.count()).select_from(
            base_query.where(Message.type == "promotional").subquery()
        )
    )).scalar()

    birthday_count = (await db.execute(
        select(func.count()).select_from(
            base_query.where(Message.type == "birthday").subquery()
        )
    )).scalar()

    reminder_count = (await db.execute(
        select(func.count()).select_from(
            base_query.where(Message.type == "reminder").subquery()
        )
    )).scalar()



    # Données chronologiques (par jour)
    if group_by == "day":
        daily_query = (
            select(
                cast(Message.created_at, Date).label("date"),
                func.count().label("total"),
                func.count(case((Message.status.in_(["sent", "delivered"]), 1))).label("sent"),
                func.count(case((Message.status == "failed", 1))).label("failed"),
            )
            .where(
                Message.tenant_id == current_user.tenant_id,
                Message.created_at >= start_date,
            )
            .group_by(cast(Message.created_at, Date))
            .order_by(cast(Message.created_at, Date))
        )
        daily_result = await db.execute(daily_query)
        chart_data = [
            {"date": row.date.isoformat(), "total": row.total, "sent": row.sent, "failed": row.failed}
            for row in daily_result
        ]
    else:
        # Grouper par semaine ou mois (simplifié: par semaine = 7 jours)
        daily_query = (
            select(
                cast(Message.created_at, Date).label("date"),
                func.count().label("total"),
                func.count(case((Message.status.in_(["sent", "delivered"]), 1))).label("sent"),
                func.count(case((Message.status == "failed", 1))).label("failed"),
            )
            .where(
                Message.tenant_id == current_user.tenant_id,
                Message.created_at >= start_date,
            )
            .group_by(cast(Message.created_at, Date))
            .order_by(cast(Message.created_at, Date))
        )
        daily_result = await db.execute(daily_query)
        chart_data = [
            {"date": row.date.isoformat(), "total": row.total, "sent": row.sent, "failed": row.failed}
            for row in daily_result
        ]

    # Taux de délivrance
    delivery_rate = round((sent_messages / total_messages * 100), 1) if total_messages > 0 else 0

    return {
        "period": period,
        "summary": {
            "total": total_messages,
            "sent": sent_messages,
            "delivered": delivered_messages,
            "failed": failed_messages,
            "delivery_rate": delivery_rate,
            "by_type": {
                "marketing": marketing_count,
                "transactional": transactional_count,
                "promotional": promotional_count,
                "birthday": birthday_count,
                "reminder": reminder_count,
            },
        },
        "chart_data": chart_data,
    }
