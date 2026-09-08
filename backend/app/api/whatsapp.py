"""
API WhatsApp Business.

Endpoints pour l'envoi de messages WhatsApp, la gestion des templates,
et l'historique des messages WhatsApp.
"""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import Contact, ContactGroup, ContactGroupMember, Message, Tenant, User, WhatsAppTemplate
from app.services.sms_provider import get_whatsapp_provider

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])


# ============================================
# SCHEMAS
# ============================================


class WhatsAppSendRequest(BaseModel):
    """Envoi d'un message WhatsApp unique."""
    phone: str = Field(..., min_length=8, max_length=20)
    template_name: str = Field(..., min_length=1, max_length=255)
    language_code: str = Field(default="fr", max_length=10)
    components: list[dict] | None = None  # Paramètres dynamiques du template


class WhatsAppSendTextRequest(BaseModel):
    """Envoi d'un message texte libre (fenêtre 24h uniquement)."""
    phone: str = Field(..., min_length=8, max_length=20)
    content: str = Field(..., min_length=1, max_length=4096)


class WhatsAppBulkRequest(BaseModel):
    """Envoi broadcast WhatsApp via template."""
    phones: list[str] = Field(default=None, min_length=1, max_length=500)
    group_id: uuid.UUID | None = None  # Envoyer à un groupe de contacts
    template_name: str = Field(..., min_length=1, max_length=255)
    language_code: str = Field(default="fr", max_length=10)
    components: list[dict] | None = None


class WhatsAppSendResponse(BaseModel):
    message_id: uuid.UUID
    phone: str
    status: str
    template_name: str | None = None


class WhatsAppTemplateCreateRequest(BaseModel):
    """Créer un template WhatsApp à soumettre à Meta."""
    name: str = Field(..., min_length=1, max_length=255, pattern="^[a-z][a-z0-9_]*$")
    category: str = Field(..., pattern="^(MARKETING|UTILITY|AUTHENTICATION)$")
    language: str = Field(default="fr", max_length=10)
    components: list[dict] = Field(..., min_length=1)
    body_text: str | None = None
    header_text: str | None = None
    footer_text: str | None = None


class WhatsAppTemplateResponse(BaseModel):
    id: uuid.UUID
    meta_template_id: str | None
    name: str
    language: str
    category: str
    status: str
    components: dict | list
    body_text: str | None
    header_text: str | None
    footer_text: str | None
    is_active: bool
    last_synced_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================
# VÉRIFICATION WHATSAPP ACTIVÉ
# ============================================


async def _get_tenant_with_whatsapp(db: AsyncSession, tenant_id: uuid.UUID) -> Tenant:
    """Récupérer le tenant et vérifier que WhatsApp est activé."""
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one()

    if not tenant.whatsapp_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="WhatsApp Business n'est pas activé pour votre entreprise. "
                   "Configurez vos identifiants dans les paramètres.",
        )

    if not tenant.whatsapp_phone_number_id or not tenant.whatsapp_access_token:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Identifiants WhatsApp Business incomplets. "
                   "Veuillez configurer phone_number_id et access_token.",
        )

    return tenant


# ============================================
# ENVOI MESSAGE TEMPLATE
# ============================================


@router.post("/send", response_model=WhatsAppSendResponse, status_code=status.HTTP_202_ACCEPTED)
async def send_whatsapp_template(
    data: WhatsAppSendRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Envoyer un message WhatsApp via template pré-approuvé.

    Les templates doivent être approuvés par Meta avant utilisation.
    Utilisé pour les messages marketing, notifications, et alertes.
    """
    tenant = await _get_tenant_with_whatsapp(db, current_user.tenant_id)

    # Rechercher le contact_id par numéro
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

    # Envoyer via le provider WhatsApp
    provider = get_whatsapp_provider(tenant=tenant)

    try:
        result = await provider.send_template(
            phone=data.phone,
            template_name=data.template_name,
            language_code=data.language_code,
            components=data.components,
        )

        # Enregistrer le message en base
        message = Message(
            tenant_id=current_user.tenant_id,
            contact_id=contact_id,
            phone=data.phone,
            content=f"[Template: {data.template_name}]",
            channel="whatsapp",
            type="marketing",
            status=result.get("status", "sent"),
            provider="whatsapp",
            provider_id=result.get("provider_id"),
            sent_at=datetime.utcnow(),
            segments_count=1,
        )
        db.add(message)
        await db.flush()

        return WhatsAppSendResponse(
            message_id=message.id,
            phone=data.phone,
            status=result.get("status", "sent"),
            template_name=data.template_name,
        )

    except Exception as e:
        # Enregistrer l'échec
        message = Message(
            tenant_id=current_user.tenant_id,
            contact_id=contact_id,
            phone=data.phone,
            content=f"[Template: {data.template_name}]",
            channel="whatsapp",
            type="marketing",
            status="failed",
            provider="whatsapp",
            error_message=str(e)[:500],
            segments_count=1,
        )
        db.add(message)
        await db.commit()

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Erreur d'envoi WhatsApp: {str(e)}",
        )


# ============================================
# ENVOI MESSAGE TEXTE LIBRE (fenêtre 24h)
# ============================================


@router.post("/send-text", response_model=WhatsAppSendResponse, status_code=status.HTTP_202_ACCEPTED)
async def send_whatsapp_text(
    data: WhatsAppSendTextRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Envoyer un message texte libre via WhatsApp.

    IMPORTANT : Uniquement possible dans la fenêtre de 24h
    (après que le destinataire a envoyé un message).
    En dehors de cette fenêtre, utilisez un template.
    """
    tenant = await _get_tenant_with_whatsapp(db, current_user.tenant_id)

    # Rechercher le contact_id
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

    provider = get_whatsapp_provider(tenant=tenant)

    try:
        result = await provider.send_text(phone=data.phone, content=data.content)

        message = Message(
            tenant_id=current_user.tenant_id,
            contact_id=contact_id,
            phone=data.phone,
            content=data.content,
            channel="whatsapp",
            type="transactional",
            status=result.get("status", "sent"),
            provider="whatsapp",
            provider_id=result.get("provider_id"),
            sent_at=datetime.utcnow(),
            segments_count=1,
        )
        db.add(message)
        await db.flush()

        return WhatsAppSendResponse(
            message_id=message.id,
            phone=data.phone,
            status=result.get("status", "sent"),
        )

    except Exception as e:
        message = Message(
            tenant_id=current_user.tenant_id,
            contact_id=contact_id,
            phone=data.phone,
            content=data.content,
            channel="whatsapp",
            type="transactional",
            status="failed",
            provider="whatsapp",
            error_message=str(e)[:500],
            segments_count=1,
        )
        db.add(message)
        await db.commit()

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Erreur d'envoi WhatsApp: {str(e)}",
        )


# ============================================
# ENVOI BROADCAST (BULK)
# ============================================


@router.post("/send-bulk", status_code=status.HTTP_202_ACCEPTED)
async def send_whatsapp_bulk(
    data: WhatsAppBulkRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Envoyer un message WhatsApp template en masse (broadcast).

    Peut cibler :
    - Une liste de numéros (phones)
    - Un groupe de contacts (group_id)

    Les destinataires doivent avoir opté in (is_subscribed=True).
    """
    tenant = await _get_tenant_with_whatsapp(db, current_user.tenant_id)

    # Déterminer les destinataires
    phones = []

    if data.group_id:
        # Récupérer les contacts du groupe
        recipients_result = await db.execute(
            select(Contact)
            .join(ContactGroupMember, ContactGroupMember.contact_id == Contact.id)
            .where(
                ContactGroupMember.group_id == data.group_id,
                Contact.tenant_id == current_user.tenant_id,
                Contact.is_subscribed == True,
            )
        )
        recipients = recipients_result.scalars().all()
        phones = [c.phone for c in recipients]
    elif data.phones:
        phones = data.phones
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Fournir soit 'phones' soit 'group_id'",
        )

    if not phones:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Aucun destinataire éligible",
        )

    # Envoyer via le provider
    provider = get_whatsapp_provider(tenant=tenant)
    results = await provider.send_bulk_template(
        phones=phones,
        template_name=data.template_name,
        language_code=data.language_code,
        components=data.components,
    )

    # Enregistrer chaque message en base
    sent_count = 0
    failed_count = 0

    for r in results:
        # Trouver le contact_id
        contact_result = await db.execute(
            select(Contact.id).where(
                Contact.tenant_id == current_user.tenant_id,
                Contact.phone == r["phone"],
            ).limit(1)
        )
        contact_id = contact_result.scalar_one_or_none()

        msg = Message(
            tenant_id=current_user.tenant_id,
            contact_id=contact_id,
            phone=r["phone"],
            content=f"[Template: {data.template_name}]",
            channel="whatsapp",
            type="marketing",
            status=r.get("status", "sent"),
            provider="whatsapp",
            provider_id=r.get("provider_id", ""),
            error_message=r.get("error"),
            sent_at=datetime.utcnow() if r.get("status") != "failed" else None,
            segments_count=1,
        )
        db.add(msg)

        if r.get("status") == "failed":
            failed_count += 1
        else:
            sent_count += 1

    await db.commit()

    return {
        "total": len(phones),
        "sent": sent_count,
        "failed": failed_count,
        "template_name": data.template_name,
    }


# ============================================
# HISTORIQUE MESSAGES WHATSAPP
# ============================================


@router.get("/messages", status_code=status.HTTP_200_OK)
async def list_whatsapp_messages(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    phone: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lister l'historique des messages WhatsApp envoyés."""
    query = (
        select(Message, Contact.first_name.label("contact_first_name"), Contact.last_name.label("contact_last_name"))
        .outerjoin(Contact, Message.contact_id == Contact.id)
        .where(
            Message.tenant_id == current_user.tenant_id,
            Message.channel == "whatsapp",
        )
    )

    if status_filter:
        query = query.where(Message.status == status_filter)
    if phone:
        query = query.where(Message.phone.ilike(f"%{phone}%"))

    # Count total
    count_query = (
        select(func.count(Message.id))
        .where(
            Message.tenant_id == current_user.tenant_id,
            Message.channel == "whatsapp",
        )
    )
    if status_filter:
        count_query = count_query.where(Message.status == status_filter)
    if phone:
        count_query = count_query.where(Message.phone.ilike(f"%{phone}%"))

    total = (await db.execute(count_query)).scalar()

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
                "channel": m.channel,
                "type": m.type,
                "status": m.status,
                "provider_id": m.provider_id,
                "error_message": m.error_message,
                "sent_at": m.sent_at.isoformat() if m.sent_at else None,
                "delivered_at": m.delivered_at.isoformat() if m.delivered_at else None,
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
# GESTION DES TEMPLATES WHATSAPP
# ============================================


@router.get("/templates", status_code=status.HTTP_200_OK)
async def list_whatsapp_templates(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    category: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lister les templates WhatsApp du tenant."""
    query = select(WhatsAppTemplate).where(
        WhatsAppTemplate.tenant_id == current_user.tenant_id,
    )

    if status_filter:
        query = query.where(WhatsAppTemplate.status == status_filter)
    if category:
        query = query.where(WhatsAppTemplate.category == category)

    # Count
    count_query = select(func.count(WhatsAppTemplate.id)).where(
        WhatsAppTemplate.tenant_id == current_user.tenant_id,
    )
    if status_filter:
        count_query = count_query.where(WhatsAppTemplate.status == status_filter)
    if category:
        count_query = count_query.where(WhatsAppTemplate.category == category)

    total = (await db.execute(count_query)).scalar()

    offset = (page - 1) * page_size
    query = query.order_by(WhatsAppTemplate.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    templates = result.scalars().all()

    return {
        "items": [
            {
                "id": str(t.id),
                "meta_template_id": t.meta_template_id,
                "name": t.name,
                "language": t.language,
                "category": t.category,
                "status": t.status,
                "components": t.components,
                "body_text": t.body_text,
                "header_text": t.header_text,
                "footer_text": t.footer_text,
                "is_active": t.is_active,
                "last_synced_at": t.last_synced_at.isoformat() if t.last_synced_at else None,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in templates
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("/templates", status_code=status.HTTP_201_CREATED)
async def create_whatsapp_template(
    data: WhatsAppTemplateCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Créer un template WhatsApp et le soumettre à Meta pour approbation.

    Le template sera en statut PENDING jusqu'à l'approbation par Meta.
    Nom : uniquement lettres minuscules, chiffres et underscores.
    """
    tenant = await _get_tenant_with_whatsapp(db, current_user.tenant_id)

    # Vérifier unicité du nom pour ce tenant
    existing = await db.execute(
        select(WhatsAppTemplate).where(
            WhatsAppTemplate.tenant_id == current_user.tenant_id,
            WhatsAppTemplate.name == data.name,
            WhatsAppTemplate.language == data.language,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Un template '{data.name}' ({data.language}) existe déjà",
        )

    # Soumettre à Meta
    provider = get_whatsapp_provider(tenant=tenant)

    try:
        meta_result = await provider.create_template(
            name=data.name,
            category=data.category,
            language=data.language,
            components=data.components,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Erreur Meta: {str(e)}",
        )

    # Enregistrer en base
    template = WhatsAppTemplate(
        tenant_id=current_user.tenant_id,
        meta_template_id=meta_result.get("id"),
        name=data.name,
        language=data.language,
        category=data.category,
        status=meta_result.get("status", "PENDING"),
        components=data.components,
        body_text=data.body_text,
        header_text=data.header_text,
        footer_text=data.footer_text,
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)

    return {
        "id": str(template.id),
        "meta_template_id": template.meta_template_id,
        "name": template.name,
        "language": template.language,
        "category": template.category,
        "status": template.status,
        "message": "Template soumis à Meta pour approbation",
    }


@router.post("/templates/sync", status_code=status.HTTP_200_OK)
async def sync_whatsapp_templates(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Synchroniser les templates WhatsApp depuis Meta.

    Récupère tous les templates du compte Meta et met à jour la base locale.
    Utile pour :
    - Vérifier les statuts d'approbation
    - Importer des templates créés directement sur Meta Business Manager
    """
    tenant = await _get_tenant_with_whatsapp(db, current_user.tenant_id)
    provider = get_whatsapp_provider(tenant=tenant)

    try:
        meta_templates = await provider.get_templates()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Erreur de synchronisation avec Meta: {str(e)}",
        )

    synced = 0
    created = 0

    for tpl in meta_templates:
        # Chercher le template existant
        existing_result = await db.execute(
            select(WhatsAppTemplate).where(
                WhatsAppTemplate.tenant_id == current_user.tenant_id,
                WhatsAppTemplate.name == tpl["name"],
                WhatsAppTemplate.language == tpl["language"],
            )
        )
        existing = existing_result.scalar_one_or_none()

        if existing:
            # Mettre à jour le statut et les composants
            existing.meta_template_id = tpl["id"]
            existing.status = tpl["status"]
            existing.category = tpl["category"]
            existing.components = tpl["components"]
            existing.last_synced_at = datetime.utcnow()
            synced += 1
        else:
            # Créer le template en local
            # Extraire le body_text des composants
            body_text = None
            header_text = None
            footer_text = None
            for comp in tpl.get("components", []):
                if comp.get("type") == "BODY":
                    body_text = comp.get("text", "")
                elif comp.get("type") == "HEADER" and comp.get("format") == "TEXT":
                    header_text = comp.get("text", "")
                elif comp.get("type") == "FOOTER":
                    footer_text = comp.get("text", "")

            new_template = WhatsAppTemplate(
                tenant_id=current_user.tenant_id,
                meta_template_id=tpl["id"],
                name=tpl["name"],
                language=tpl["language"],
                category=tpl["category"],
                status=tpl["status"],
                components=tpl["components"],
                body_text=body_text,
                header_text=header_text,
                footer_text=footer_text,
                last_synced_at=datetime.utcnow(),
            )
            db.add(new_template)
            created += 1

    await db.commit()

    return {
        "synced": synced,
        "created": created,
        "total_from_meta": len(meta_templates),
        "message": f"Synchronisation terminée : {synced} mis à jour, {created} créés",
    }


@router.delete("/templates/{template_id}", status_code=status.HTTP_200_OK)
async def delete_whatsapp_template(
    template_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Supprimer un template WhatsApp (localement et chez Meta).
    """
    # Récupérer le template
    result = await db.execute(
        select(WhatsAppTemplate).where(
            WhatsAppTemplate.id == template_id,
            WhatsAppTemplate.tenant_id == current_user.tenant_id,
        )
    )
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template non trouvé",
        )

    tenant = await _get_tenant_with_whatsapp(db, current_user.tenant_id)
    provider = get_whatsapp_provider(tenant=tenant)

    # Supprimer chez Meta
    try:
        await provider.delete_template(template.name)
    except Exception as e:
        # On supprime quand même en local si Meta renvoie une erreur
        pass

    # Supprimer en local
    await db.delete(template)
    await db.commit()

    return {"message": f"Template '{template.name}' supprimé"}


# ============================================
# STATISTIQUES WHATSAPP
# ============================================


@router.get("/stats", status_code=status.HTTP_200_OK)
async def get_whatsapp_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Récupérer les statistiques WhatsApp du tenant."""
    tenant_id = current_user.tenant_id

    # Total messages envoyés
    total_result = await db.execute(
        select(func.count(Message.id)).where(
            Message.tenant_id == tenant_id,
            Message.channel == "whatsapp",
        )
    )
    total_messages = total_result.scalar() or 0

    # Par statut
    sent_result = await db.execute(
        select(func.count(Message.id)).where(
            Message.tenant_id == tenant_id,
            Message.channel == "whatsapp",
            Message.status == "sent",
        )
    )
    total_sent = sent_result.scalar() or 0

    delivered_result = await db.execute(
        select(func.count(Message.id)).where(
            Message.tenant_id == tenant_id,
            Message.channel == "whatsapp",
            Message.status == "delivered",
        )
    )
    total_delivered = delivered_result.scalar() or 0

    failed_result = await db.execute(
        select(func.count(Message.id)).where(
            Message.tenant_id == tenant_id,
            Message.channel == "whatsapp",
            Message.status == "failed",
        )
    )
    total_failed = failed_result.scalar() or 0

    read_result = await db.execute(
        select(func.count(Message.id)).where(
            Message.tenant_id == tenant_id,
            Message.channel == "whatsapp",
            Message.status == "read",
        )
    )
    total_read = read_result.scalar() or 0

    # Templates approuvés
    templates_result = await db.execute(
        select(func.count(WhatsAppTemplate.id)).where(
            WhatsAppTemplate.tenant_id == tenant_id,
            WhatsAppTemplate.status == "APPROVED",
        )
    )
    approved_templates = templates_result.scalar() or 0

    return {
        "total_messages": total_messages,
        "sent": total_sent,
        "delivered": total_delivered,
        "read": total_read,
        "failed": total_failed,
        "delivery_rate": round((total_delivered / total_sent * 100), 1) if total_sent > 0 else 0,
        "read_rate": round((total_read / total_delivered * 100), 1) if total_delivered > 0 else 0,
        "approved_templates": approved_templates,
    }
