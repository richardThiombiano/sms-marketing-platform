"""
Endpoints de facturation côté tenant/owner.
Permet de voir son abonnement, l'historique des recharges,
et les informations de paiement Orange Money (code marchand + QR).
"""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import CreditRecharge, Payment, Subscription, Tenant, User

router = APIRouter(prefix="/billing", tags=["Facturation"])
settings = get_settings()


# ============================================
# SCHEMAS
# ============================================


class SubscriptionResponse(BaseModel):
    id: str
    status: str
    amount: int
    currency: str
    start_date: str
    end_date: str
    days_remaining: int
    is_expired: bool

    class Config:
        from_attributes = True


class PaymentInfoResponse(BaseModel):
    """Informations de paiement Orange Money pour le client."""
    merchant_code: str
    merchant_name: str
    qr_code_url: str | None
    subscription_amount: int
    currency: str
    instructions: str


class RechargeHistoryItem(BaseModel):
    id: str
    amount: int
    method: str
    reference: str | None
    status: str
    created_at: str
    credited_at: str | None

    class Config:
        from_attributes = True


class PaymentHistoryItem(BaseModel):
    id: str
    type: str
    amount: int
    currency: str
    method: str
    status: str
    reference: str | None
    created_at: str

    class Config:
        from_attributes = True


class PaymentRequestCreate(BaseModel):
    """Demande de paiement soumise par le owner."""
    type: str  # "subscription" ou "recharge"
    amount: int  # Montant payé en FCFA
    reference: str  # Référence de transaction Orange Money


# ============================================
# ENDPOINTS
# ============================================


@router.get("/subscription", response_model=SubscriptionResponse | None)
async def get_my_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Récupérer l'abonnement actuel du tenant."""
    result = await db.execute(
        select(Subscription)
        .where(Subscription.tenant_id == current_user.tenant_id)
        .order_by(Subscription.end_date.desc())
        .limit(1)
    )
    subscription = result.scalar_one_or_none()

    if subscription is None:
        return None

    now = datetime.utcnow()
    end_date = subscription.end_date

    days_remaining = max(0, (end_date - now).days)
    is_expired = now > end_date

    return SubscriptionResponse(
        id=str(subscription.id),
        status="expired" if is_expired else subscription.status,
        amount=subscription.amount,
        currency=subscription.currency,
        start_date=subscription.start_date.isoformat(),
        end_date=subscription.end_date.isoformat(),
        days_remaining=days_remaining,
        is_expired=is_expired,
    )


@router.get("/payment-info", response_model=PaymentInfoResponse)
async def get_payment_info(
    current_user: User = Depends(get_current_user),
):
    """
    Récupérer les informations de paiement Orange Money.
    Affiche le code marchand et le QR code pour que le client puisse payer.
    """
    return PaymentInfoResponse(
        merchant_code=settings.orange_money_merchant_code,
        merchant_name=settings.orange_money_merchant_name,
        qr_code_url=settings.orange_money_qr_code_url or None,
        subscription_amount=settings.subscription_monthly_price,
        currency="XOF",
        instructions=(
            f"Pour payer votre abonnement ou recharger vos crédits SMS :\n"
            f"1. Ouvrez Orange Money sur votre téléphone\n"
            f"2. Sélectionnez 'Paiement marchand'\n"
            f"3. Entrez le code marchand : {settings.orange_money_merchant_code}\n"
            f"4. Entrez le montant\n"
            f"5. Validez le paiement\n"
            f"Ou scannez le QR code ci-dessous."
        ),
    )


@router.get("/recharges")
async def get_my_recharges(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Historique des rechargements de crédits SMS du tenant."""
    query = (
        select(CreditRecharge)
        .where(CreditRecharge.tenant_id == current_user.tenant_id)
        .order_by(CreditRecharge.created_at.desc())
    )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    # Pagination
    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    recharges = result.scalars().all()

    items = [
        {
            "id": str(r.id),
            "amount": r.amount,
            "method": r.method,
            "reference": r.reference,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "credited_at": r.credited_at.isoformat() if r.credited_at else None,
        }
        for r in recharges
    ]

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/payments")
async def get_my_payments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Historique des paiements du tenant (abonnements + recharges)."""
    query = (
        select(Payment)
        .where(Payment.tenant_id == current_user.tenant_id)
        .order_by(Payment.created_at.desc())
    )

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    payments = result.scalars().all()

    items = [
        {
            "id": str(p.id),
            "type": p.type,
            "amount": p.amount,
            "currency": p.currency,
            "method": p.method,
            "status": p.status,
            "reference": p.reference,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in payments
    ]

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/payment-request", status_code=status.HTTP_201_CREATED)
async def create_payment_request(
    data: PaymentRequestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Soumettre une demande de paiement.
    Le owner effectue le paiement Orange Money (USSD), puis saisit
    la référence de transaction reçue par SMS pour confirmer.
    La demande est créée en statut 'pending' et attend validation du superadmin.
    """
    # Vérifier que le type est valide
    if data.type not in ("subscription", "recharge"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le type doit être 'subscription' ou 'recharge'",
        )

    # Vérifier que le montant est cohérent
    if data.type == "subscription" and data.amount < settings.subscription_monthly_price:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Le montant minimum pour un abonnement est de {settings.subscription_monthly_price} FCFA",
        )

    if data.type == "recharge" and data.amount < 1000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le montant minimum pour une recharge est de 1 000 FCFA",
        )

    # Les recharges ne sont permises que si un abonnement actif existe
    if data.type == "recharge":
        now = datetime.utcnow()
        sub_result = await db.execute(
            select(Subscription).where(
                Subscription.tenant_id == current_user.tenant_id,
                Subscription.status == "active",
                Subscription.end_date >= now,
            ).limit(1)
        )
        if sub_result.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous devez avoir un abonnement actif pour effectuer une recharge de crédits.",
            )

    # Vérifier qu'il n'y a pas déjà une demande en attente avec la même référence
    existing = await db.execute(
        select(Payment).where(
            Payment.reference == data.reference,
            Payment.status == "pending",
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Une demande avec cette référence de transaction existe déjà",
        )

    # Créer le paiement en statut pending
    payment = Payment(
        tenant_id=current_user.tenant_id,
        type=data.type,
        amount=data.amount,
        currency="XOF",
        method="orange_money",
        status="pending",
        reference=data.reference,
    )
    db.add(payment)
    await db.flush()

    return {
        "message": "Demande de paiement enregistrée. Elle sera validée par l'administrateur.",
        "payment_id": str(payment.id),
        "type": data.type,
        "amount": data.amount,
        "reference": data.reference,
        "status": "pending",
    }
