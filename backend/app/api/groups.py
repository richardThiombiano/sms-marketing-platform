from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import Contact, ContactGroup, ContactGroupMember, User
from app.schemas import GroupCreate, GroupResponse, PaginatedResponse

router = APIRouter(prefix="/groups", tags=["Groupes"])


@router.get("", response_model=PaginatedResponse)
async def list_groups(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lister les groupes de contacts."""
    query = select(ContactGroup).where(ContactGroup.tenant_id == current_user.tenant_id)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    offset = (page - 1) * page_size
    query = query.order_by(ContactGroup.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    groups = result.scalars().all()

    return PaginatedResponse(
        items=[GroupResponse.model_validate(g) for g in groups],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.post("", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
async def create_group(
    data: GroupCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Créer un nouveau groupe de contacts."""
    group = ContactGroup(
        tenant_id=current_user.tenant_id,
        name=data.name,
        description=data.description,
        is_dynamic=data.is_dynamic,
        filters=data.filters,
        contact_count=0,
    )
    db.add(group)
    await db.flush()
    await db.refresh(group)
    return group


@router.get("/{group_id}", response_model=GroupResponse)
async def get_group(
    group_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Récupérer les détails d'un groupe."""
    result = await db.execute(
        select(ContactGroup).where(
            ContactGroup.id == group_id,
            ContactGroup.tenant_id == current_user.tenant_id,
        )
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Groupe non trouvé")
    return group


@router.patch("/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: UUID,
    data: GroupCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Modifier un groupe."""
    result = await db.execute(
        select(ContactGroup).where(
            ContactGroup.id == group_id,
            ContactGroup.tenant_id == current_user.tenant_id,
        )
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Groupe non trouvé")

    group.name = data.name
    if data.description is not None:
        group.description = data.description
    group.is_dynamic = data.is_dynamic
    if data.filters is not None:
        group.filters = data.filters

    await db.flush()
    await db.refresh(group)
    return group


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(
    group_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Supprimer un groupe."""
    result = await db.execute(
        select(ContactGroup).where(
            ContactGroup.id == group_id,
            ContactGroup.tenant_id == current_user.tenant_id,
        )
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Groupe non trouvé")

    await db.delete(group)


# ============================================
# MEMBRES DU GROUPE
# ============================================


@router.get("/{group_id}/members")
async def list_group_members(
    group_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lister les membres d'un groupe."""
    # Vérifier que le groupe appartient au tenant
    group_result = await db.execute(
        select(ContactGroup).where(
            ContactGroup.id == group_id,
            ContactGroup.tenant_id == current_user.tenant_id,
        )
    )
    group = group_result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Groupe non trouvé")

    query = (
        select(Contact)
        .join(ContactGroupMember, ContactGroupMember.contact_id == Contact.id)
        .where(ContactGroupMember.group_id == group_id)
    )

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    offset = (page - 1) * page_size
    query = query.order_by(Contact.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    contacts = result.scalars().all()

    return {
        "items": [
            {
                "id": str(c.id),
                "phone": c.phone,
                "first_name": c.first_name,
                "last_name": c.last_name,
                "email": c.email,
                "city": c.city,
                "is_subscribed": c.is_subscribed,
                "tags": c.tags,
            }
            for c in contacts
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("/{group_id}/members", status_code=status.HTTP_201_CREATED)
async def add_members(
    group_id: UUID,
    contact_ids: list[UUID],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Ajouter des contacts à un groupe."""
    # Vérifier le groupe
    group_result = await db.execute(
        select(ContactGroup).where(
            ContactGroup.id == group_id,
            ContactGroup.tenant_id == current_user.tenant_id,
        )
    )
    group = group_result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Groupe non trouvé")

    added = 0
    for contact_id in contact_ids:
        # Vérifier que le contact appartient au tenant
        contact_result = await db.execute(
            select(Contact).where(
                Contact.id == contact_id,
                Contact.tenant_id == current_user.tenant_id,
            )
        )
        contact = contact_result.scalar_one_or_none()
        if not contact:
            continue

        # Vérifier s'il est déjà membre
        existing = await db.execute(
            select(ContactGroupMember).where(
                ContactGroupMember.contact_id == contact_id,
                ContactGroupMember.group_id == group_id,
            )
        )
        if existing.scalar_one_or_none():
            continue

        member = ContactGroupMember(contact_id=contact_id, group_id=group_id)
        db.add(member)
        added += 1

    # Mettre à jour le compteur
    group.contact_count += added
    await db.flush()

    return {"message": f"{added} contact(s) ajouté(s) au groupe", "added": added}


@router.delete("/{group_id}/members/{contact_id}", status_code=status.HTTP_200_OK)
async def remove_member(
    group_id: UUID,
    contact_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retirer un contact d'un groupe."""
    # Vérifier le groupe
    group_result = await db.execute(
        select(ContactGroup).where(
            ContactGroup.id == group_id,
            ContactGroup.tenant_id == current_user.tenant_id,
        )
    )
    group = group_result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Groupe non trouvé")

    # Vérifier le membre
    member_result = await db.execute(
        select(ContactGroupMember).where(
            ContactGroupMember.contact_id == contact_id,
            ContactGroupMember.group_id == group_id,
        )
    )
    member = member_result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact non trouvé dans ce groupe")

    await db.delete(member)
    group.contact_count = max(0, group.contact_count - 1)
    await db.flush()

    return {"message": "Contact retiré du groupe"}
