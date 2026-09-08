from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import Contact, User
from app.schemas import ContactCreate, ContactResponse, ContactUpdate, PaginatedResponse
from app.services.welcome_automation import trigger_welcome_automation

router = APIRouter(prefix="/contacts", tags=["Contacts"])


@router.get("", response_model=PaginatedResponse)
async def list_contacts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    tags: str | None = None,
    is_subscribed: bool | None = None,
    city: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lister les contacts de l'entreprise avec filtres et pagination."""
    query = select(Contact).where(Contact.tenant_id == current_user.tenant_id)

    # Filtres
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            (Contact.first_name.ilike(search_filter))
            | (Contact.last_name.ilike(search_filter))
            | (Contact.phone.ilike(search_filter))
            | (Contact.email.ilike(search_filter))
        )

    if tags:
        tag_list = tags.split(",")
        query = query.where(Contact.tags.overlap(tag_list))

    if is_subscribed is not None:
        query = query.where(Contact.is_subscribed == is_subscribed)

    if city:
        query = query.where(Contact.city.ilike(f"%{city}%"))

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(Contact.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    contacts = result.scalars().all()

    return PaginatedResponse(
        items=[ContactResponse.model_validate(c) for c in contacts],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.post("", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
async def create_contact(
    data: ContactCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Ajouter un nouveau contact."""
    # Vérifier si le numéro existe déjà pour ce tenant
    existing = await db.execute(
        select(Contact).where(
            Contact.tenant_id == current_user.tenant_id,
            Contact.phone == data.phone,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Un contact avec ce numéro existe déjà",
        )

    contact = Contact(
        tenant_id=current_user.tenant_id,
        phone=data.phone,
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        birth_date=data.birth_date,
        gender=data.gender,
        city=data.city,
        country=data.country,
        tags=data.tags,
        metadata_=data.metadata,
    )
    db.add(contact)
    await db.flush()
    await db.refresh(contact)

    # Déclencher l'automation de bienvenue en arrière-plan
    trigger_welcome_automation(current_user.tenant_id, contact.id)

    return contact


@router.get("/{contact_id}", response_model=ContactResponse)
async def get_contact(
    contact_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Récupérer les détails d'un contact."""
    result = await db.execute(
        select(Contact).where(
            Contact.id == contact_id,
            Contact.tenant_id == current_user.tenant_id,
        )
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact non trouvé")
    return contact


@router.patch("/{contact_id}", response_model=ContactResponse)
async def update_contact(
    contact_id: UUID,
    data: ContactUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Modifier un contact."""
    result = await db.execute(
        select(Contact).where(
            Contact.id == contact_id,
            Contact.tenant_id == current_user.tenant_id,
        )
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact non trouvé")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "metadata":
            setattr(contact, "metadata_", value)
        else:
            setattr(contact, field, value)

    await db.flush()
    await db.refresh(contact)
    return contact


@router.delete("/{contact_id}", status_code=status.HTTP_200_OK)
async def delete_contact(
    contact_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Supprimer un contact. Réservé au propriétaire (owner) du tenant."""
    if current_user.role != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seul le propriétaire peut supprimer des contacts",
        )

    result = await db.execute(
        select(Contact).where(
            Contact.id == contact_id,
            Contact.tenant_id == current_user.tenant_id,
        )
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact non trouvé")

    await db.delete(contact)
    return {"message": "Contact supprimé avec succès"}


@router.post("/{contact_id}/unsubscribe", status_code=status.HTTP_200_OK)
async def unsubscribe_contact(
    contact_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Désinscrire un contact (opt-out)."""
    result = await db.execute(
        select(Contact).where(
            Contact.id == contact_id,
            Contact.tenant_id == current_user.tenant_id,
        )
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact non trouvé")

    from datetime import datetime, timezone

    contact.is_subscribed = False
    contact.unsubscribed_at = datetime.now(timezone.utc)
    await db.flush()

    return {"message": "Contact désinscrit avec succès"}


@router.post("/import", status_code=status.HTTP_201_CREATED)
async def import_contacts(
    file: UploadFile,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Importer des contacts depuis un fichier CSV ou Excel.

    Format attendu (colonnes) :
    phone (obligatoire), first_name, last_name, email, gender, birth_date, city, country

    La première ligne doit être l'en-tête.
    """
    import csv
    import io

    filename = file.filename or ""
    content = await file.read()

    contacts_data = []

    if filename.endswith(".csv"):
        # Parser CSV
        text = content.decode("utf-8-sig")  # utf-8-sig pour gérer le BOM
        reader = csv.DictReader(io.StringIO(text))
        for row in reader:
            contacts_data.append(row)

    elif filename.endswith(".xlsx") or filename.endswith(".xls"):
        # Parser Excel
        try:
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True)
            ws = wb.active
            rows = list(ws.iter_rows(values_only=True))
            if len(rows) < 2:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Le fichier est vide")

            headers = [str(h).strip().lower() if h else "" for h in rows[0]]
            for row in rows[1:]:
                row_dict = {}
                for i, value in enumerate(row):
                    if i < len(headers) and headers[i]:
                        row_dict[headers[i]] = str(value).strip() if value else ""
                contacts_data.append(row_dict)
        except ImportError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Le format Excel nécessite le package openpyxl. Utilisez le format CSV.",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format non supporté. Utilisez un fichier .csv ou .xlsx",
        )

    if not contacts_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Aucun contact trouvé dans le fichier")

    # Importer les contacts
    imported = 0
    skipped = 0
    errors = []

    for i, row in enumerate(contacts_data, start=2):
        phone = row.get("phone", "").strip()
        if not phone:
            errors.append(f"Ligne {i}: numéro de téléphone manquant")
            skipped += 1
            continue

        # Vérifier si le numéro existe déjà
        existing = await db.execute(
            select(Contact).where(
                Contact.tenant_id == current_user.tenant_id,
                Contact.phone == phone,
            )
        )
        if existing.scalar_one_or_none():
            skipped += 1
            continue

        # Créer le contact
        birth_date_value = None
        birth_date_str = row.get("birth_date", "").strip()
        if birth_date_str:
            try:
                from datetime import datetime as dt
                birth_date_value = dt.strptime(birth_date_str, "%Y-%m-%d")
            except ValueError:
                try:
                    birth_date_value = dt.strptime(birth_date_str, "%d/%m/%Y")
                except ValueError:
                    pass  # Ignorer les dates invalides

        contact = Contact(
            tenant_id=current_user.tenant_id,
            phone=phone,
            first_name=row.get("first_name", "").strip() or None,
            last_name=row.get("last_name", "").strip() or None,
            email=row.get("email", "").strip() or None,
            gender=row.get("gender", "").strip() or None,
            birth_date=birth_date_value,
            city=row.get("city", "").strip() or None,
            country=row.get("country", "").strip() or None,
        )
        db.add(contact)
        imported += 1

    await db.flush()

    return {
        "message": f"{imported} contact(s) importé(s), {skipped} ignoré(s)",
        "imported": imported,
        "skipped": skipped,
        "errors": errors[:10],  # Limiter les erreurs affichées
        "total_rows": len(contacts_data),
    }
