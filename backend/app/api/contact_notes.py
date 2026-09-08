"""
Endpoints pour les notes/interactions des contacts.
Permet d'ajouter, lister et supprimer des notes associées à un contact.
"""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import Contact, ContactNote, User

router = APIRouter(prefix="/contacts", tags=["Contact Notes"])


# ============================================
# TYPES D'INTERACTION DISPONIBLES
# ============================================

INTERACTION_TYPES = [
    {"value": "note", "label": "Note", "icon": "document-text", "color": "#64748B"},
    {"value": "visit", "label": "Visite", "icon": "walk", "color": "#2563EB"},
    {"value": "purchase", "label": "Achat", "icon": "cart", "color": "#059669"},
    {"value": "complaint", "label": "Réclamation", "icon": "alert-circle", "color": "#DC2626"},
    {"value": "call_in", "label": "Appel entrant", "icon": "call", "color": "#7C3AED"},
    {"value": "call_out", "label": "Appel sortant", "icon": "call-outline", "color": "#7C3AED"},
    {"value": "email", "label": "Email", "icon": "mail", "color": "#0891B2"},
    {"value": "meeting", "label": "Rendez-vous", "icon": "calendar", "color": "#D97706"},
    {"value": "quote", "label": "Devis", "icon": "document", "color": "#4F46E5"},
    {"value": "payment", "label": "Paiement", "icon": "card", "color": "#059669"},
    {"value": "return", "label": "Retour produit", "icon": "arrow-undo", "color": "#EA580C"},
    {"value": "support", "label": "Support technique", "icon": "build", "color": "#6366F1"},
    {"value": "feedback", "label": "Avis client", "icon": "star", "color": "#EAB308"},
    {"value": "other", "label": "Autre", "icon": "ellipsis-horizontal", "color": "#94A3B8"},
]


# ============================================
# SCHEMAS
# ============================================


class NoteCreate(BaseModel):
    interaction_type: str = Field("note", description="Type d'interaction")
    content: str = Field(..., min_length=1, max_length=2000, description="Contenu de la note")


class NoteResponse(BaseModel):
    id: str
    contact_id: str
    user_id: str
    user_name: str
    interaction_type: str
    content: str
    created_at: str


# ============================================
# ENDPOINTS
# ============================================


@router.get("/interaction-types")
async def get_interaction_types(
    current_user: User = Depends(get_current_user),
):
    """Récupérer la liste des types d'interaction disponibles."""
    return INTERACTION_TYPES


@router.get("/{contact_id}/notes")
async def list_contact_notes(
    contact_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    interaction_type: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lister les notes d'un contact (ordre chronologique inversé)."""
    # Vérifier que le contact appartient au tenant
    contact_result = await db.execute(
        select(Contact).where(
            Contact.id == contact_id,
            Contact.tenant_id == current_user.tenant_id,
        )
    )
    if not contact_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact non trouvé")

    # Requête notes avec info utilisateur
    query = (
        select(ContactNote, User.first_name, User.last_name)
        .join(User, ContactNote.user_id == User.id)
        .where(
            ContactNote.contact_id == contact_id,
            ContactNote.tenant_id == current_user.tenant_id,
        )
    )

    if interaction_type:
        query = query.where(ContactNote.interaction_type == interaction_type)

    # Count total
    count_query = select(func.count()).select_from(
        select(ContactNote.id).where(
            ContactNote.contact_id == contact_id,
            ContactNote.tenant_id == current_user.tenant_id,
        ).subquery()
    )
    if interaction_type:
        count_query = select(func.count()).select_from(
            select(ContactNote.id).where(
                ContactNote.contact_id == contact_id,
                ContactNote.tenant_id == current_user.tenant_id,
                ContactNote.interaction_type == interaction_type,
            ).subquery()
        )
    total = (await db.execute(count_query)).scalar() or 0

    # Pagination
    query = query.order_by(ContactNote.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    rows = result.all()

    items = [
        {
            "id": str(note.id),
            "contact_id": str(note.contact_id),
            "user_id": str(note.user_id),
            "user_name": f"{first_name or ''} {last_name or ''}".strip() or "Utilisateur",
            "interaction_type": note.interaction_type,
            "content": note.content,
            "created_at": note.created_at.isoformat() if note.created_at else None,
        }
        for note, first_name, last_name in rows
    ]

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("/{contact_id}/notes", status_code=status.HTTP_201_CREATED)
async def create_contact_note(
    contact_id: uuid.UUID,
    data: NoteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Ajouter une note à un contact."""
    # Vérifier que le contact appartient au tenant
    contact_result = await db.execute(
        select(Contact).where(
            Contact.id == contact_id,
            Contact.tenant_id == current_user.tenant_id,
        )
    )
    if not contact_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact non trouvé")

    # Valider le type d'interaction
    valid_types = [t["value"] for t in INTERACTION_TYPES]
    if data.interaction_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Type d'interaction invalide. Types possibles : {', '.join(valid_types)}",
        )

    note = ContactNote(
        tenant_id=current_user.tenant_id,
        contact_id=contact_id,
        user_id=current_user.id,
        interaction_type=data.interaction_type,
        content=data.content,
    )
    db.add(note)
    await db.flush()

    return {
        "id": str(note.id),
        "contact_id": str(note.contact_id),
        "user_id": str(current_user.id),
        "user_name": f"{current_user.first_name or ''} {current_user.last_name or ''}".strip(),
        "interaction_type": note.interaction_type,
        "content": note.content,
        "created_at": note.created_at.isoformat() if note.created_at else datetime.utcnow().isoformat(),
    }


@router.delete("/{contact_id}/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact_note(
    contact_id: uuid.UUID,
    note_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Supprimer une note (uniquement par son auteur ou un admin)."""
    result = await db.execute(
        select(ContactNote).where(
            ContactNote.id == note_id,
            ContactNote.contact_id == contact_id,
            ContactNote.tenant_id == current_user.tenant_id,
        )
    )
    note = result.scalar_one_or_none()

    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note non trouvée")

    # Seul l'auteur ou un admin/owner peut supprimer
    if note.user_id != current_user.id and current_user.role not in ("admin", "owner", "superadmin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vous ne pouvez supprimer que vos propres notes")

    await db.delete(note)
