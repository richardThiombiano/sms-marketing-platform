"""
Script pour initialiser la base de données.
Crée toutes les tables directement depuis les modèles SQLAlchemy.

Usage:
    cd backend
    python init_db.py
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import engine, Base
from app.models import *  # noqa: F401, F403 - Import tous les modèles


async def init_database():
    """Créer toutes les tables dans la base de données."""
    print("🔄 Connexion à la base de données...")

    try:
        async with engine.begin() as conn:
            print("🗑️  Suppression des tables existantes (si elles existent)...")
            await conn.run_sync(Base.metadata.drop_all)

            print("📦 Création des tables...")
            await conn.run_sync(Base.metadata.create_all)

        print("")
        print("✅ Base de données initialisée avec succès !")
        print("")
        print("   Tables créées :")
        for table in Base.metadata.sorted_tables:
            print(f"   • {table.name}")
        print("")
        print("   Prochaine étape : python ../tests/create_superadmin.py")

    except Exception as e:
        print(f"❌ Erreur : {e}")
        print("")
        print("   Vérifiez que :")
        print("   1. PostgreSQL est lancé (docker ps ou pg_isready)")
        print("   2. La base 'sms_marketing' existe (createdb sms_marketing)")
        print("   3. Le DATABASE_URL dans .env est correct")
        sys.exit(1)

    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(init_database())
