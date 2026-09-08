"""
Endpoints d'administration de la facturation.
Accessible uniquement par le superadmin.
Permet de :
- Gérer les abonnements des tenants (activer, renouveler, résilier)
- Enregistrer les rechargements de crédits SMS
- Voir l'historique global des paiements et recharges
"""

from datetime import datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import CreditRecharge, Payment, Subscription, Tenant, User

router = APIRouter(prefix="/admin/billing", tags=["Administration Facturation"])


def require_superadmin():
    """Vérifier que l'utilisateur est le superadmin de la plateforme."""

    async def checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role != "superadmin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Accès réservé à l'administrateur de la plateforme",
            )
        return current_user

    return checker


# ============================================
# SCHEMAS
# ============================================


class ActivateSubscriptionRequest(BaseModel):
    tenant_id: UUID
    months: int = 1  # Nombre de mois à activer
    payment_method: str = "orange_money"
    payment_reference: str | None = None
    notes: str | None = None


class RenewSubscriptionRequest(BaseModel):
    months: int = 1
    payment_method: str = "orange_money"
    payment_reference: str | None = None
    notes: str | None = None


class RegisterRechargeRequest(BaseModel):
    tenant_id: UUID
    amount: int  # Montant en FCFA rechargé sur 3MI
    method: str = "orange_money"
    reference: str | None = None  # Référence de la transaction du client
    notes: str | None = None


class ConfirmPaymentRequest(BaseModel):
    notes: str | None = None


# ============================================
# ABONNEMENTS
# ============================================


@router.get("/subscriptions")
async def list_subscriptions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    tenant_id: UUID | None = None,
    subscription_status: str | None = Query(None, alias="status"),
    current_user: User = Depends(require_superadmin()),
    db: AsyncSession = Depends(get_db),
):
    """Lister tous les abonnements de la plateforme."""
    query = (
        select(Subscription)
        .order_by(Subscription.created_at.desc())
    )

    if tenant_id:
        query = query.where(Subscription.tenant_id == tenant_id)
    if subscription_status:
        query = query.where(Subscription.status == subscription_status)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    subscriptions = result.scalars().all()

    items = []
    for sub in subscriptions:
        # Récupérer le nom du tenant
        tenant_result = await db.execute(select(Tenant.name).where(Tenant.id == sub.tenant_id))
        tenant_name = tenant_result.scalar_one_or_none() or "Inconnu"

        now = datetime.utcnow()
        end_date = sub.end_date

        days_remaining = max(0, (end_date - now).days)
        is_expired = now > end_date

        items.append({
            "id": str(sub.id),
            "tenant_id": str(sub.tenant_id),
            "tenant_name": tenant_name,
            "status": "expired" if is_expired else sub.status,
            "amount": sub.amount,
            "currency": sub.currency,
            "start_date": sub.start_date.isoformat(),
            "end_date": sub.end_date.isoformat(),
            "days_remaining": days_remaining,
            "is_expired": is_expired,
            "created_at": sub.created_at.isoformat() if sub.created_at else None,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/subscriptions/activate")
async def activate_subscription(
    data: ActivateSubscriptionRequest,
    current_user: User = Depends(require_superadmin()),
    db: AsyncSession = Depends(get_db),
):
    """
    Activer un abonnement pour un tenant.
    Crée un nouvel abonnement actif et un paiement associé.
    """
    # Vérifier que le tenant existe
    tenant_result = await db.execute(select(Tenant).where(Tenant.id == data.tenant_id))
    tenant = tenant_result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entreprise non trouvée",
        )

    # Calculer les dates
    now = datetime.utcnow()

    # Si un abonnement actif existe déjà, prolonger à partir de sa fin
    existing_sub = await db.execute(
        select(Subscription).where(
            Subscription.tenant_id == data.tenant_id,
            Subscription.status == "active",
            Subscription.end_date >= now,
        ).order_by(Subscription.end_date.desc()).limit(1)
    )
    active_sub = existing_sub.scalar_one_or_none()

    if active_sub:
        start_date = active_sub.end_date
    else:
        start_date = now

    end_date = start_date + timedelta(days=30 * data.months)
    total_amount = 25000 * data.months

    # Créer le paiement
    payment = Payment(
        tenant_id=data.tenant_id,
        type="subscription",
        amount=total_amount,
        currency="XOF",
        method=data.payment_method,
        status="confirmed",
        reference=data.payment_reference,
        confirmed_by=current_user.id,
        confirmed_at=now,
        notes=data.notes,
    )
    db.add(payment)
    await db.flush()

    # Créer l'abonnement
    subscription = Subscription(
        tenant_id=data.tenant_id,
        status="active",
        amount=total_amount,
        currency="XOF",
        start_date=start_date,
        end_date=end_date,
        payment_id=payment.id,
    )
    db.add(subscription)

    # Si le tenant était expiré, le marquer actif
    if active_sub is None:
        # Marquer les anciens abonnements comme expirés
        old_subs = await db.execute(
            select(Subscription).where(
                Subscription.tenant_id == data.tenant_id,
                Subscription.status == "active",
                Subscription.end_date < now,
            )
        )
        for old_sub in old_subs.scalars().all():
            old_sub.status = "expired"

    await db.flush()

    return {
        "message": f"Abonnement activé pour {tenant.name} ({data.months} mois)",
        "subscription_id": str(subscription.id),
        "payment_id": str(payment.id),
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "amount": total_amount,
    }


@router.post("/subscriptions/{subscription_id}/renew")
async def renew_subscription(
    subscription_id: UUID,
    data: RenewSubscriptionRequest,
    current_user: User = Depends(require_superadmin()),
    db: AsyncSession = Depends(get_db),
):
    """Renouveler un abonnement existant."""
    result = await db.execute(select(Subscription).where(Subscription.id == subscription_id))
    subscription = result.scalar_one_or_none()

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Abonnement non trouvé",
        )

    now = datetime.utcnow()
    total_amount = 25000 * data.months

    # Si l'abonnement est encore actif, prolonger
    end_date = subscription.end_date

    if end_date > now:
        new_end = end_date + timedelta(days=30 * data.months)
    else:
        # Abonnement expiré, recommencer à partir de maintenant
        subscription.start_date = now
        new_end = now + timedelta(days=30 * data.months)

    # Créer le paiement
    payment = Payment(
        tenant_id=subscription.tenant_id,
        type="subscription",
        amount=total_amount,
        currency="XOF",
        method=data.payment_method,
        status="confirmed",
        reference=data.payment_reference,
        confirmed_by=current_user.id,
        confirmed_at=now,
        notes=data.notes,
    )
    db.add(payment)
    await db.flush()

    # Mettre à jour l'abonnement
    subscription.end_date = new_end
    subscription.status = "active"
    subscription.payment_id = payment.id

    await db.flush()

    return {
        "message": f"Abonnement renouvelé pour {data.months} mois",
        "subscription_id": str(subscription.id),
        "payment_id": str(payment.id),
        "new_end_date": new_end.isoformat(),
        "amount": total_amount,
    }


@router.post("/subscriptions/{subscription_id}/cancel")
async def cancel_subscription(
    subscription_id: UUID,
    current_user: User = Depends(require_superadmin()),
    db: AsyncSession = Depends(get_db),
):
    """Résilier un abonnement."""
    result = await db.execute(select(Subscription).where(Subscription.id == subscription_id))
    subscription = result.scalar_one_or_none()

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Abonnement non trouvé",
        )

    subscription.status = "cancelled"
    await db.flush()

    return {
        "message": "Abonnement résilié",
        "subscription_id": str(subscription.id),
    }


# ============================================
# RECHARGEMENTS DE CRÉDITS SMS
# ============================================


@router.get("/recharges")
async def list_recharges(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    tenant_id: UUID | None = None,
    recharge_status: str | None = Query(None, alias="status"),
    current_user: User = Depends(require_superadmin()),
    db: AsyncSession = Depends(get_db),
):
    """Lister toutes les recharges de crédits SMS."""
    query = (
        select(CreditRecharge)
        .order_by(CreditRecharge.created_at.desc())
    )

    if tenant_id:
        query = query.where(CreditRecharge.tenant_id == tenant_id)
    if recharge_status:
        query = query.where(CreditRecharge.status == recharge_status)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    recharges = result.scalars().all()

    items = []
    for r in recharges:
        tenant_result = await db.execute(select(Tenant.name).where(Tenant.id == r.tenant_id))
        tenant_name = tenant_result.scalar_one_or_none() or "Inconnu"

        items.append({
            "id": str(r.id),
            "tenant_id": str(r.tenant_id),
            "tenant_name": tenant_name,
            "amount": r.amount,
            "method": r.method,
            "reference": r.reference,
            "status": r.status,
            "notes": r.notes,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "credited_at": r.credited_at.isoformat() if r.credited_at else None,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/recharges")
async def register_recharge(
    data: RegisterRechargeRequest,
    current_user: User = Depends(require_superadmin()),
    db: AsyncSession = Depends(get_db),
):
    """
    Enregistrer un rechargement de crédits SMS.
    Le superadmin utilise cet endpoint après avoir :
    1. Reçu un transfert Orange Money du client
    2. Crédité manuellement le compte 3MI du tenant
    """
    # Vérifier que le tenant existe
    tenant_result = await db.execute(select(Tenant).where(Tenant.id == data.tenant_id))
    tenant = tenant_result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entreprise non trouvée",
        )

    now = datetime.utcnow()

    # Créer la recharge (directement confirmée car le superadmin a déjà fait le crédit)
    recharge = CreditRecharge(
        tenant_id=data.tenant_id,
        amount=data.amount,
        method=data.method,
        reference=data.reference,
        status="credited",
        credited_by=current_user.id,
        credited_at=now,
        notes=data.notes,
    )
    db.add(recharge)
    await db.flush()

    return {
        "message": f"Recharge de {data.amount} FCFA enregistrée pour {tenant.name}",
        "recharge_id": str(recharge.id),
        "tenant_name": tenant.name,
        "amount": data.amount,
    }


@router.patch("/recharges/{recharge_id}/confirm")
async def confirm_recharge(
    recharge_id: UUID,
    data: ConfirmPaymentRequest | None = None,
    current_user: User = Depends(require_superadmin()),
    db: AsyncSession = Depends(get_db),
):
    """Confirmer un rechargement en attente (si créé avec statut pending)."""
    result = await db.execute(select(CreditRecharge).where(CreditRecharge.id == recharge_id))
    recharge = result.scalar_one_or_none()

    if not recharge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recharge non trouvée",
        )

    if recharge.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cette recharge a déjà le statut '{recharge.status}'",
        )

    now = datetime.utcnow()
    recharge.status = "credited"
    recharge.credited_by = current_user.id
    recharge.credited_at = now
    if data and data.notes:
        recharge.notes = data.notes

    await db.flush()

    from app.core.audit import log_audit
    log_audit("PAYMENT_CONFIRMED", user_id=str(current_user.id), details={"recharge_id": str(recharge.id), "tenant_id": str(recharge.tenant_id), "amount": recharge.amount})

    return {
        "message": "Recharge confirmée",
        "recharge_id": str(recharge.id),
    }


@router.patch("/recharges/{recharge_id}/reject")
async def reject_recharge(
    recharge_id: UUID,
    data: ConfirmPaymentRequest | None = None,
    current_user: User = Depends(require_superadmin()),
    db: AsyncSession = Depends(get_db),
):
    """Rejeter un rechargement."""
    result = await db.execute(select(CreditRecharge).where(CreditRecharge.id == recharge_id))
    recharge = result.scalar_one_or_none()

    if not recharge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recharge non trouvée",
        )

    recharge.status = "rejected"
    if data and data.notes:
        recharge.notes = data.notes

    await db.flush()

    from app.core.audit import log_audit
    log_audit("PAYMENT_REJECTED", user_id=str(current_user.id), details={"recharge_id": str(recharge.id), "tenant_id": str(recharge.tenant_id), "amount": recharge.amount})

    return {
        "message": "Recharge rejetée",
        "recharge_id": str(recharge.id),
    }


# ============================================
# PAIEMENTS
# ============================================


@router.get("/payments")
async def list_payments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    tenant_id: UUID | None = None,
    payment_type: str | None = Query(None, alias="type"),
    payment_status: str | None = Query(None, alias="status"),
    current_user: User = Depends(require_superadmin()),
    db: AsyncSession = Depends(get_db),
):
    """Lister tous les paiements de la plateforme."""
    query = (
        select(Payment)
        .order_by(Payment.created_at.desc())
    )

    if tenant_id:
        query = query.where(Payment.tenant_id == tenant_id)
    if payment_type:
        query = query.where(Payment.type == payment_type)
    if payment_status:
        query = query.where(Payment.status == payment_status)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    payments = result.scalars().all()

    items = []
    for p in payments:
        tenant_result = await db.execute(select(Tenant.name).where(Tenant.id == p.tenant_id))
        tenant_name = tenant_result.scalar_one_or_none() or "Inconnu"

        items.append({
            "id": str(p.id),
            "tenant_id": str(p.tenant_id),
            "tenant_name": tenant_name,
            "type": p.type,
            "amount": p.amount,
            "currency": p.currency,
            "method": p.method,
            "status": p.status,
            "reference": p.reference,
            "notes": p.notes,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "confirmed_at": p.confirmed_at.isoformat() if p.confirmed_at else None,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/stats")
async def billing_stats(
    current_user: User = Depends(require_superadmin()),
    db: AsyncSession = Depends(get_db),
):
    """Statistiques de facturation globales."""
    now = datetime.utcnow()

    # Abonnements actifs
    active_subs = (await db.execute(
        select(func.count()).select_from(
            select(Subscription).where(
                Subscription.status == "active",
                Subscription.end_date >= now,
            ).subquery()
        )
    )).scalar()

    # Abonnements expirés
    expired_subs = (await db.execute(
        select(func.count()).select_from(
            select(Subscription).where(
                Subscription.end_date < now,
            ).subquery()
        )
    )).scalar()

    # Revenus du mois (paiements confirmés)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    monthly_revenue = (await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.status == "confirmed",
            Payment.created_at >= start_of_month,
        )
    )).scalar()

    # Total des recharges du mois
    monthly_recharges = (await db.execute(
        select(func.coalesce(func.sum(CreditRecharge.amount), 0)).where(
            CreditRecharge.status == "credited",
            CreditRecharge.created_at >= start_of_month,
        )
    )).scalar()

    # Recharges en attente
    pending_recharges = (await db.execute(
        select(func.count()).select_from(
            select(CreditRecharge).where(
                CreditRecharge.status == "pending",
            ).subquery()
        )
    )).scalar()

    return {
        "active_subscriptions": active_subs,
        "expired_subscriptions": expired_subs,
        "monthly_revenue": monthly_revenue,
        "monthly_recharges": monthly_recharges,
        "pending_recharges": pending_recharges,
        "currency": "XOF",
    }


# ============================================
# CONFIRMATION / REJET DES DEMANDES DE PAIEMENT
# ============================================


@router.get("/pending-payments")
async def list_pending_payments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_superadmin()),
    db: AsyncSession = Depends(get_db),
):
    """Lister les paiements en attente de validation."""
    query = (
        select(Payment)
        .where(Payment.status == "pending")
        .order_by(Payment.created_at.desc())
    )

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    payments = result.scalars().all()

    items = []
    for p in payments:
        tenant_result = await db.execute(select(Tenant.name).where(Tenant.id == p.tenant_id))
        tenant_name = tenant_result.scalar_one_or_none() or "Inconnu"

        items.append({
            "id": str(p.id),
            "tenant_id": str(p.tenant_id),
            "tenant_name": tenant_name,
            "type": p.type,
            "amount": p.amount,
            "currency": p.currency,
            "method": p.method,
            "status": p.status,
            "reference": p.reference,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/payments/{payment_id}/confirm")
async def confirm_payment(
    payment_id: UUID,
    current_user: User = Depends(require_superadmin()),
    db: AsyncSession = Depends(get_db),
):
    """
    Confirmer un paiement en attente.
    - Si type = 'subscription' : crée/prolonge l'abonnement automatiquement.
    - Si type = 'recharge' : enregistre la recharge comme créditée.
    """
    result = await db.execute(select(Payment).where(Payment.id == payment_id))
    payment = result.scalar_one_or_none()

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paiement non trouvé",
        )

    if payment.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ce paiement a déjà le statut '{payment.status}'",
        )

    now = datetime.utcnow()

    # Confirmer le paiement
    payment.status = "confirmed"
    payment.confirmed_by = current_user.id
    payment.confirmed_at = now

    # Récupérer le tenant
    tenant_result = await db.execute(select(Tenant).where(Tenant.id == payment.tenant_id))
    tenant = tenant_result.scalar_one_or_none()
    tenant_name = tenant.name if tenant else "Inconnu"

    response_extra = {}

    if payment.type == "subscription":
        # Calculer le nombre de mois payés
        months = max(1, payment.amount // 25000)

        # Chercher un abonnement actif existant
        existing_sub = await db.execute(
            select(Subscription).where(
                Subscription.tenant_id == payment.tenant_id,
                Subscription.status == "active",
                Subscription.end_date >= now,
            ).order_by(Subscription.end_date.desc()).limit(1)
        )
        active_sub = existing_sub.scalar_one_or_none()

        if active_sub:
            # Prolonger l'abonnement existant
            active_sub.end_date = active_sub.end_date + timedelta(days=30 * months)
            active_sub.payment_id = payment.id
            response_extra = {
                "subscription_id": str(active_sub.id),
                "new_end_date": active_sub.end_date.isoformat(),
                "months_added": months,
            }
        else:
            # Créer un nouvel abonnement
            start_date = now
            end_date = start_date + timedelta(days=30 * months)

            subscription = Subscription(
                tenant_id=payment.tenant_id,
                status="active",
                amount=payment.amount,
                currency="XOF",
                start_date=start_date,
                end_date=end_date,
                payment_id=payment.id,
            )
            db.add(subscription)

            # Marquer les anciens abonnements comme expirés
            old_subs = await db.execute(
                select(Subscription).where(
                    Subscription.tenant_id == payment.tenant_id,
                    Subscription.status == "active",
                    Subscription.end_date < now,
                )
            )
            for old_sub in old_subs.scalars().all():
                old_sub.status = "expired"

            response_extra = {
                "subscription_created": True,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "months": months,
            }

    elif payment.type == "recharge":
        # Enregistrer comme recharge créditée
        recharge = CreditRecharge(
            tenant_id=payment.tenant_id,
            amount=payment.amount,
            method=payment.method,
            reference=payment.reference,
            status="credited",
            credited_by=current_user.id,
            credited_at=now,
            notes=f"Confirmé depuis paiement #{str(payment.id)[:8]}",
        )
        db.add(recharge)
        response_extra = {"recharge_registered": True}

    await db.flush()

    # Envoyer un SMS de confirmation au owner (via le compte plateforme)
    if tenant and tenant.phone:
        try:
            from app.services.sms_provider import get_sms_provider
            from app.core.config import get_settings
            platform_settings = get_settings()

            provider = get_sms_provider("3mi")  # Provider plateforme
            if payment.type == "subscription":
                sms_content = (
                    f"SMS Pro - Votre abonnement a été activé avec succès. "
                    f"Montant : {payment.amount} FCFA. "
                    f"Merci pour votre confiance."
                )
            else:
                sms_content = (
                    f"SMS Pro - Votre recharge de {payment.amount} FCFA a été validée. "
                    f"Votre solde a été crédité. "
                    f"Merci pour votre confiance."
                )

            await provider.send(
                phone=tenant.phone,
                content=sms_content,
                sender=platform_settings.smsbus_sender_id or "SMSPro",
            )
        except Exception as e:
            # Ne pas bloquer la confirmation si le SMS échoue
            pass

    return {
        "message": f"Paiement de {payment.amount} FCFA confirmé pour {tenant_name}",
        "payment_id": str(payment.id),
        "type": payment.type,
        **response_extra,
    }


@router.post("/payments/{payment_id}/reject")
async def reject_payment(
    payment_id: UUID,
    current_user: User = Depends(require_superadmin()),
    db: AsyncSession = Depends(get_db),
):
    """Rejeter un paiement en attente."""
    result = await db.execute(select(Payment).where(Payment.id == payment_id))
    payment = result.scalar_one_or_none()

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paiement non trouvé",
        )

    if payment.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ce paiement a déjà le statut '{payment.status}'",
        )

    payment.status = "rejected"
    await db.flush()

    return {
        "message": "Paiement rejeté",
        "payment_id": str(payment.id),
    }
