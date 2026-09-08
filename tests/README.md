# Tests API - SMS Marketing Platform

Ce dossier contient tout le nécessaire pour tester les API du backend.

## Prérequis

1. Le backend doit tourner sur `http://localhost:8000`
2. La base de données PostgreSQL doit être active
3. Un superadmin doit exister dans la base

## Démarrage rapide

```bash
# 1. Lancer le backend
cd backend
pip install -e ".[dev]"
cp .env.example .env
uvicorn app.main:app --reload --port 8000

# 2. Créer le superadmin (script fourni)
python tests/create_superadmin.py

# 3. Lancer les tests
python tests/test_api.py
```

## Fichiers

| Fichier | Description |
|---------|-------------|
| `create_superadmin.py` | Crée le superadmin dans la base |
| `test_api.py` | Tests automatisés de tous les endpoints |
| `api_requests.http` | Requêtes manuelles (pour VS Code REST Client / Kiro) |
| `postman_collection.json` | Collection Postman importable |
