from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import Automation, Template, User

router = APIRouter(prefix="/automations", tags=["Automations"])


# ============================================
# SCHEMAS
# ============================================


class AutomationCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    type: str = Field(..., pattern="^(birthday|welcome|inactivity|recurring)$")
    template_id: UUID | None = None
    message_content: str | None = None
    trigger_config: dict = Field(default_factory=dict)
    target_filters: dict | None = None


class AutomationUpdate(BaseModel):
    name: str | None = None
    type: str | None = None
    template_id: UUID | None = None
    message_content: str | None = None
    trigger_config: dict | None = None
    target_filters: dict | None = None


class AutomationResponse(BaseModel):
    id: str
    name: str
    type: str
    template_id: str | None
    message_content: str | None
    is_active: bool
    trigger_config: dict
    target_filters: dict | None
    last_run_at: str | None
    next_run_at: str | None
    total_sent: int
    created_at: str | None


# ============================================
# ENDPOINTS
# ============================================


@router.get("")
async def list_automations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lister les automations de l'entreprise."""
    query = select(Automation).where(Automation.tenant_id == current_user.tenant_id)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    offset = (page - 1) * page_size
    query = query.order_by(Automation.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    automations = result.scalars().all()

    return {
        "items": [
            {
                "id": str(a.id),
                "name": a.name,
                "type": a.type,
                "template_id": str(a.template_id) if a.template_id else None,
                "message_content": a.trigger_config.get("message_content"),
                "is_active": a.is_active,
                "trigger_config": a.trigger_config,
                "target_filters": a.target_filters,
                "last_run_at": a.last_run_at.isoformat() if a.last_run_at else None,
                "next_run_at": a.next_run_at.isoformat() if a.next_run_at else None,
                "total_sent": a.total_sent,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in automations
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_automation(
    data: AutomationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Créer une nouvelle automation."""
    # Vérifier le template si fourni
    if data.template_id:
        tpl_result = await db.execute(
            select(Template).where(
                Template.id == data.template_id,
                Template.tenant_id == current_user.tenant_id,
            )
        )
        if not tpl_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template non trouvé")

    # Stocker le message_content dans trigger_config
    trigger_config = data.trigger_config or {}
    if data.message_content:
        trigger_config["message_content"] = data.message_content

    automation = Automation(
        tenant_id=current_user.tenant_id,
        name=data.name,
        type=data.type,
        template_id=data.template_id,
        trigger_config=trigger_config,
        target_filters=data.target_filters,
        is_active=True,
    )
    db.add(automation)
    await db.flush()
    await db.refresh(automation)

    return {
        "id": str(automation.id),
        "name": automation.name,
        "type": automation.type,
        "is_active": automation.is_active,
        "message": "Automation créée avec succès",
    }


@router.patch("/{automation_id}")
async def update_automation(
    automation_id: UUID,
    data: AutomationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Modifier une automation."""
    result = await db.execute(
        select(Automation).where(
            Automation.id == automation_id,
            Automation.tenant_id == current_user.tenant_id,
        )
    )
    automation = result.scalar_one_or_none()
    if not automation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Automation non trouvée")

    update_data = data.model_dump(exclude_unset=True)

    # Gérer message_content dans trigger_config
    if "message_content" in update_data:
        msg_content = update_data.pop("message_content")
        if msg_content:
            config = automation.trigger_config or {}
            config["message_content"] = msg_content
            automation.trigger_config = config

    for field, value in update_data.items():
        setattr(automation, field, value)

    await db.flush()

    return {"message": "Automation mise à jour", "id": str(automation.id)}


@router.patch("/{automation_id}/toggle")
async def toggle_automation(
    automation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Activer/désactiver une automation."""
    result = await db.execute(
        select(Automation).where(
            Automation.id == automation_id,
            Automation.tenant_id == current_user.tenant_id,
        )
    )
    automation = result.scalar_one_or_none()
    if not automation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Automation non trouvée")

    automation.is_active = not automation.is_active
    await db.flush()

    status_text = "activée" if automation.is_active else "désactivée"
    return {
        "message": f"Automation {status_text}",
        "id": str(automation.id),
        "is_active": automation.is_active,
    }


@router.delete("/{automation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_automation(
    automation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Supprimer une automation."""
    result = await db.execute(
        select(Automation).where(
            Automation.id == automation_id,
            Automation.tenant_id == current_user.tenant_id,
        )
    )
    automation = result.scalar_one_or_none()
    if not automation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Automation non trouvée")

    await db.delete(automation)
