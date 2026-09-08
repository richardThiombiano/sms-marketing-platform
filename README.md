# SMS Marketing Platform

Plateforme SaaS multi-tenant d'envoi de SMS marketing, fidélisation et transactionnels.

## Architecture

```
sms-marketing-platform/
├── backend/          → API FastAPI (Python 3.12) - déployée sur AWS Lambda
├── web/              → Dashboard Next.js (React) - shadcn/ui + Tremor
├── mobile/           → App React Native (Expo) - NativeWind
└── infra/            → Infrastructure AWS (SAM template)
```

## Stack technique

| Couche | Technologie |
|--------|-------------|
| API | FastAPI (Python 3.12) sur AWS Lambda |
| Gateway | API Gateway |
| BDD | PostgreSQL (RDS) |
| Cache | ElastiCache (Redis) |
| Queue | SQS + EventBridge |
| Storage | S3 |
| Web | Next.js + shadcn/ui + Tremor + Tailwind |
| Mobile | React Native Expo + NativeWind |
| SMS | Twilio / Vonage / Orange API |
| Auth | JWT |
| IaC | AWS SAM |

## Démarrage rapide (Backend)

```bash
cd backend

# Installer les dépendances
pip install -e ".[dev]"

# Copier la config
cp .env.example .env

# Lancer PostgreSQL (Docker)
docker run -d --name sms-pg -p 5432:5432 -e POSTGRES_DB=sms_marketing -e POSTGRES_PASSWORD=postgres postgres:16

# Migrations
alembic upgrade head

# Lancer le serveur (développement local)
uvicorn app.main:app --reload --port 8000
```

L'API est accessible sur http://localhost:8000/docs (Swagger UI).

## Déploiement AWS

```bash
cd infra
sam build
sam deploy --guided
```

## Fonctionnalités

- ✅ Multi-tenant (isolation par entreprise)
- ✅ Gestion des contacts (CRUD, import CSV, segmentation)
- ✅ Campagnes SMS (création, envoi, programmation)
- ✅ Templates réutilisables avec variables
- ✅ Automations (anniversaires, rappels, bienvenue)
- ✅ SMS direct (unitaire et bulk)
- ✅ Système de crédits
- ✅ A/B Testing
- ✅ Multi-providers (Twilio, Vonage, Orange)
- ✅ Webhooks (delivery reports)
- ✅ Statistiques et analytics
