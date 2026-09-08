"""
Script pour créer le superadmin dans la base de données.
À exécuter une seule fois lors de l'installation.

Usage:
    cd backend
    python ../tests/create_superadmin.py
"""

import asyncio
import sys
import os

# Ajouter le dossier backend au path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.core.database import async_session, engine, Base
from app.core.security import hash_password
from app.models import Tenant, User


async def create_superadmin():
    """Créer le tenant plateforme et le superadmin."""

    # Créer les tables si elles n'existent pas
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        from sqlalchemy import select

        # Vérifier si le superadmin existe déjà
        result = await db.execute(select(User).where(User.role == "superadmin"))
        existing = result.scalar_one_or_none()

        if existing:
            print("⚠️  Le superadmin existe déjà !")
            print(f"   Email: {existing.email}")
            return

        # Créer le tenant "plateforme" (tenant interne pour le superadmin)
        tenant = Tenant(
            name="SMS Pro Platform",
            slug="sms-pro-platform",
            email="admin@sms-pro.com",
            plan="enterprise",
            sms_provider="3mi",
        )
        db.add(tenant)
        await db.flush()

        # Créer l'utilisateur superadmin
        superadmin = User(
            tenant_id=tenant.id,
            username="superadmin",
            email="admin@sms-pro.com",
            password_hash=hash_password("Admin@2024!"),
            first_name="Admin",
            last_name="SMS Pro",
            role="superadmin",
        )
        db.add(superadmin)
        await db.commit()

        print("✅ Superadmin créé avec succès !")
        print("")
        print("   ┌──────────────────────────────────────┐")
        print("   │  IDENTIFIANTS SUPERADMIN              │")
        print("   ├──────────────────────────────────────┤")
        print("   │  Email:    admin@sms-pro.com         │")
        print("   │  Password: Admin@2024!               │")
        print("   │  Rôle:     superadmin                │")
        print("   └──────────────────────────────────────┘")
        print("")
        print("   ⚠️  Changez le mot de passe en production !")


if __name__ == "__main__":
    asyncio.run(create_superadmin())
