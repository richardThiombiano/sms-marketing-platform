from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import Notification, User

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("")
async def list_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    unread_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lister les notifications de l'utilisateur."""
    query = select(Notification).where(
        Notification.tenant_id == current_user.tenant_id,
        (Notification.user_id == current_user.id) | (Notification.user_id.is_(None)),
    )

    if unread_only:
        query = query.where(Notification.is_read == False)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    # Compteur non lues
    unread_count_query = select(func.count()).select_from(
        select(Notification).where(
            Notification.tenant_id == current_user.tenant_id,
            (Notification.user_id == current_user.id) | (Notification.user_id.is_(None)),
            Notification.is_read == False,
        ).subquery()
    )
    unread_count = (await db.execute(unread_count_query)).scalar()

    offset = (page - 1) * page_size
    query = query.order_by(Notification.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    notifications = result.scalars().all()

    return {
        "items": [
            {
                "id": str(n.id),
                "type": n.type,
                "title": n.title,
                "message": n.message,
                "is_read": n.is_read,
                "data": n.data,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in notifications
        ],
        "total": total,
        "unread_count": unread_count,
    }


@router.post("/read-all", status_code=status.HTTP_200_OK)
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Marquer toutes les notifications comme lues."""
    await db.execute(
        update(Notification)
        .where(
            Notification.tenant_id == current_user.tenant_id,
            (Notification.user_id == current_user.id) | (Notification.user_id.is_(None)),
            Notification.is_read == False,
        )
        .values(is_read=True)
    )
    await db.flush()

    return {"message": "Toutes les notifications marquées comme lues"}


@router.post("/{notification_id}/read", status_code=status.HTTP_200_OK)
async def mark_as_read(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Marquer une notification comme lue."""
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.tenant_id == current_user.tenant_id,
        )
    )
    notification = result.scalar_one_or_none()
    if notification:
        notification.is_read = True
        await db.flush()

    return {"message": "Notification marquée comme lue"}
