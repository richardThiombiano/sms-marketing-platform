# SMS Pro - Documentation Technique

## Plateforme SaaS de SMS Marketing Multi-Tenant

---

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Stack technique](#stack-technique)
4. [Backend (API)](#backend-api)
5. [Frontend Web (Dashboard)](#frontend-web-dashboard)
6. [Application Mobile](#application-mobile)
7. [Infrastructure AWS](#infrastructure-aws)
8. [Modèle de données](#modèle-de-données)
9. [API Endpoints](#api-endpoints)
10. [Sécurité](#sécurité)
11. [Guide d'installation](#guide-dinstallation)
12. [Déploiement](#déploiement)
13. [Roadmap](#roadmap)

---

## Vue d'ensemble

**SMS Pro** est une plateforme SaaS permettant aux entreprises d'envoyer des SMS à leurs clients pour :

- 📣 **Marketing & Promotions** — Campagnes de masse, offres flash, soldes
- ❤️ **Fidélisation** — Points fidélité, récompenses, offres VIP
- 🎂 **Anniversaires** — Messages automatiques personnalisés
- 📋 **Transactionnels** — Confirmations, OTP, notifications
- 🔄 **Relance** — Clients inactifs, paniers abandonnés
- 📊 **Enquêtes** — Satisfaction, sondages par SMS
- 💬 **SMS conversationnel** — Réponses clients, opt-in/opt-out
- 🏢 **Communication interne** — Alertes RH, notifications d'urgence

### Modèle économique

| Plan | Description |
|------|-------------|
| **Starter** | 100 SMS/mois gratuits, fonctionnalités de base |
| **Pro** | 5 000 SMS/mois, automations, A/B testing |
| **Enterprise** | Volume illimité, API dédiée, support prioritaire |
| **Pay-as-you-go** | Achat de crédits à la demande |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTS                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  App Mobile   │    │  Dashboard    │    │  API Externe │  │
│  │  React Native │    │  Next.js      │    │  (Intégration)│  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘  │
└─────────┼────────────────────┼────────────────────┼─────────┘
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                   AWS API Gateway                            │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              AWS Lambda (FastAPI / Python 3.12)              │
│                                                              │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐              │
│  │ Auth       │ │ Contacts   │ │ Campaigns  │              │
│  │ Service    │ │ Service    │ │ Service    │              │
│  └────────────┘ └────────────┘ └────────────┘              │
└──────────┬──────────────┬───────────────┬───────────────────┘
           │              │               │
     ┌─────┼─────┐  ┌────┼────┐    ┌─────┼─────┐
     ▼     ▼     ▼  ▼    ▼    ▼    ▼     ▼     ▼
┌────────┐┌─────┐┌──────┐┌─────┐┌────────────────┐
│  RDS   ││Redis││  S3  ││ SQS ││  EventBridge   │
│(Postgre)││     ││      ││     ││  (Scheduler)   │
└────────┘└─────┘└──────┘└──┬──┘└────────────────┘
                             │
                             ▼
                   ┌──────────────────┐
                   │  Lambda Worker   │
                   │  (Envoi SMS)     │
                   └────────┬─────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
         ┌────────┐   ┌────────┐   ┌────────┐
         │ Twilio │   │ Vonage │   │ Orange │
         └────────┘   └────────┘   └────────┘
```

### Principes architecturaux

- **Multi-tenant** : Isolation des données par `tenant_id` sur chaque table
- **Serverless** : AWS Lambda pour le compute (pay-per-use, auto-scaling)
- **Event-driven** : SQS pour le traitement asynchrone des SMS
- **API-first** : Toute fonctionnalité est accessible via l'API REST

---

## Stack technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| **Backend API** | FastAPI (Python) | 3.12 |
| **ORM** | SQLAlchemy (async) | 2.0.35 |
| **Validation** | Pydantic | 2.9.2 |
| **Base de données** | PostgreSQL | 16 |
| **Cache** | Redis (ElastiCache) | 7.x |
| **Queue** | AWS SQS | — |
| **Scheduler** | AWS EventBridge | — |
| **Storage** | AWS S3 | — |
| **API Gateway** | AWS API Gateway | v2 |
| **Compute** | AWS Lambda | Python 3.12 |
| **Frontend Web** | Next.js (React) | 14.2.10 |
| **UI Components** | shadcn/ui + Tremor | — |
| **CSS** | Tailwind CSS | 3.4.11 |
| **Mobile** | React Native (Expo) | 51.0 |
| **Mobile CSS** | NativeWind | 4.0.1 |
| **Auth** | JWT (python-jose) | — |
| **SMS Providers** | 3MI (défaut), Twilio, Vonage, Orange API | — |
| **IaC** | AWS SAM | — |
| **Migrations** | Alembic | 1.13.2 |

---

## Backend (API)

### Structure des fichiers

```
backend/
├── pyproject.toml              # Dépendances et config
├── alembic.ini                 # Config migrations
├── .env.example                # Variables d'environnement
├── alembic/
│   └── env.py                  # Migrations DB
└── app/
    ├── main.py                 # Point d'entrée FastAPI + handler Lambda
    ├── core/
    │   ├── config.py           # Settings (Pydantic BaseSettings)
    │   ├── database.py         # Connexion PostgreSQL async
    │   ├── security.py         # JWT, hashage mots de passe
    │   └── dependencies.py     # Middleware auth, role guard
    ├── models/
    │   └── __init__.py         # 10 modèles SQLAlchemy
    ├── schemas/
    │   └── __init__.py         # Schemas Pydantic (request/response)
    ├── api/
    │   ├── auth.py             # Register, login, refresh, me
    │   ├── tenant.py           # Infos entreprise (GET/PATCH)
    │   ├── admin.py            # Administration plateforme (superadmin)
    │   ├── contacts.py         # CRUD contacts, filtres, pagination
    │   ├── campaigns.py        # CRUD campagnes, send, schedule, cancel
    │   ├── sms.py              # Envoi direct (unitaire, bulk)
    │   └── webhooks_3mi.py     # Webhooks DLR et MO pour 3MI
    ├── services/
    │   └── sms_provider.py     # Providers SMS (Factory) - 3MI, Twilio, Vonage, Orange
    └── workers/
        ├── sms_worker.py       # Lambda SQS (envoi, provider par tenant)
        └── scheduler.py        # Lambda EventBridge (campagnes programmées)
```

### Configuration

Les variables d'environnement sont gérées via `.env` et `Pydantic BaseSettings` :

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | URL PostgreSQL async |
| `REDIS_URL` | URL Redis |
| `JWT_SECRET_KEY` | Clé secrète JWT |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | Durée du token d'accès (30min) |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS` | Durée du refresh token (7j) |
| `SMSBUS_BASE_URL` | URL API 3MI (défaut: https://www.lesmsbus.com:7170/ines.smsbus) |
| `SMSBUS_USERNAME` | Login 3MI |
| `SMSBUS_PASSWORD` | Mot de passe 3MI |
| `SMSBUS_ID` | Terminal Web ID (alternatif à username/password) |
| `SMSBUS_SENDER_ID` | Sender ID par défaut (max 11 chars) |
| `TWILIO_ACCOUNT_SID` | SID compte Twilio (optionnel) |
| `TWILIO_AUTH_TOKEN` | Token Twilio (optionnel) |
| `TWILIO_PHONE_NUMBER` | Numéro expéditeur Twilio (optionnel) |
| `AWS_REGION` | Région AWS |
| `AWS_SQS_QUEUE_URL` | URL de la queue SQS |
| `AWS_S3_BUCKET` | Bucket S3 pour imports |

### Authentification

- **JWT** avec access token (30 min) + refresh token (7 jours)
- **Hashage** des mots de passe avec bcrypt
- **Middleware** automatique qui extrait le `tenant_id` du token
- **Role Guard** : `owner` > `admin` > `member`

### Providers SMS (Factory Pattern)

```python
from app.services.sms_provider import get_sms_provider

provider = get_sms_provider("3mi")  # par défaut
result = await provider.send(phone="22676837604", content="Message")
# → {"provider_id": "abc123", "status": "sent"}
```

Providers supportés :
- **3MI (LeSMSBUS)** — Burkina Faso, économique, **PROVIDER PAR DÉFAUT**
- **Twilio** — International, fiable, cher
- **Vonage (Nexmo)** — International, bon prix
- **Orange API** — Afrique de l'Ouest

### Provider 3MI (LeSMSBUS) — Documentation

**Site** : https://www.lesmsbus.com
**Société** : 3MI, Ouagadougou, Burkina Faso
**Contact** : support@3m-i.com | +226 76837604

#### Caractéristiques

| Fonctionnalité | Détail |
|---|---|
| **Envoi SMS** | +160 pays |
| **API** | HTTP GET/POST simple |
| **Auth** | Username/Password ou Terminal Web ID |
| **DLR** | Accusés de réception (DELIVERED, EXPIRED, UNDELIVERABLE) |
| **MO** | Réception de SMS entrants |
| **Bulk** | Numéros séparés par virgules |
| **SMS Flash** | Paramètre `flash=1` |
| **Encodage** | UTF-8, support des accents |
| **Programmation** | Paramètre `denv` (yyyy-MM-dd HH:mm:ss) |
| **Solde** | Endpoint `/Balance` |

#### Endpoints API 3MI

| Endpoint | Fonction |
|---|---|
| `GET /smsbusMt` | Envoi SMS |
| `GET /smsState` | Statut d'un message (DLR) |
| `GET /Balance` | Consulter le solde |
| `GET /SmsbusMoVas` | Récupérer les SMS reçus |

#### Codes de réponse 3MI

| Code | Description |
|------|-------------|
| `0000` | OK - Succès (format: `0000\|OK-numero-msgId`) |
| `0001` | Message vide |
| `0002` | Login/Mot de passe invalide |
| `0003` | Numéro invalide ou absent |
| `0005` | Erreur d'envoi |
| `0006` | Pas de route pour ce numéro |
| `0009` | Crédit SMS insuffisant |
| `00010` | Erreur Source |
| `00011` | Opération non autorisée |
| `00012` | Erreur interne serveur |

#### Statuts DLR 3MI

| Statut | Description |
|--------|-------------|
| `DELIVERED` | Message délivré au destinataire |
| `ENROUTE` | Message en route |
| `EXPIRED` | Expiré chez l'opérateur |
| `DELETED` | Supprimé par l'opérateur |
| `UNDELIVERABLE` | Numéro invalide ou injoignable |
| `UNKNOWN` | Statut inconnu |

#### Configuration 3MI (.env)

```env
SMSBUS_BASE_URL=https://www.lesmsbus.com:7170/ines.smsbus
SMSBUS_USERNAME=votre-login
SMSBUS_PASSWORD=votre-mot-de-passe
SMSBUS_ID=votre-terminal-web-id
SMSBUS_SENDER_ID=SMSPro
```

#### Webhooks à configurer chez 3MI

| Type | URL à fournir |
|------|---------------|
| **DLR** | `https://api.sms-pro.com/v1/webhooks/3mi/dlr?msg=DLR_STATUS&dnr=numero&msgId=id_du_message` |
| **MO** | `https://api.sms-pro.com/v1/webhooks/3mi/mo?msg=message&dnr=numero&srn=numero_court` |

#### Exemple d'utilisation

```python
from app.services.sms_provider import SmsbusProvider

provider = SmsbusProvider()

# Envoi simple
result = await provider.send(
    phone="22676837604",
    content="Bonjour ! Votre code est 1234",
    sender="MonEntreprise"
)

# Envoi bulk
results = await provider.send_bulk(
    phones=["22676837604", "22670123456"],
    content="Promo -30% aujourd'hui !"
)

# Vérifier le solde
balance = await provider.get_balance()
# → {"amount": 2500, "currency": "XOF"}

# Vérifier statut d'un message
status = await provider.get_status("msg123")
# → "delivered"
```

### Gestion du provider par tenant

- **Par défaut** : 3MI pour toutes les entreprises
- **Modifiable uniquement par le superadmin** (administrateur de la plateforme)
- **Les entreprises ne peuvent PAS changer leur provider**
- Champ `sms_provider` dans la table `tenants`
- Le worker SMS lit automatiquement le provider du tenant avant chaque envoi

---

## Frontend Web (Dashboard)

### Structure des fichiers

```
web/src/
├── app/
│   ├── layout.tsx              # Root layout (font Inter, metadata)
│   ├── page.tsx                # Redirect → /dashboard
│   ├── globals.css             # Thème CSS (light/dark, variables shadcn)
│   ├── (dashboard)/
│   │   ├── layout.tsx          # Layout avec sidebar + header
│   │   ├── dashboard/page.tsx  # Vue d'ensemble
│   │   ├── contacts/page.tsx   # Gestion contacts
│   │   ├── campaigns/page.tsx  # Gestion campagnes
│   │   └── templates/page.tsx  # Modèles de messages
│   └── auth/
│       ├── login/page.tsx      # Page connexion
│       └── register/page.tsx   # Page inscription
├── components/
│   ├── layout/
│   │   └── dashboard-layout.tsx  # Sidebar + Header
│   └── ui/                     # Composants shadcn/ui
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── badge.tsx
│       ├── avatar.tsx
│       └── separator.tsx
└── lib/
    └── utils.ts                # Fonction cn()
```

### Design System

| Élément | Spécification |
|---------|---------------|
| **Font** | Inter (Google Fonts) |
| **Couleur primaire** | Bleu/Violet (hsl 221.2) |
| **Border radius** | 0.5rem (cards), 0.75rem (boutons) |
| **Thème** | Light + Dark mode (CSS variables) |
| **Animations** | Fade, slide, scale, shimmer |
| **Effets** | Glassmorphism (backdrop-blur), gradients subtils |

### Pages

#### Dashboard
- 4 cartes statistiques avec tendances (↑↓)
- Graphique d'activité hebdomadaire (bar chart)
- Campagnes récentes avec statuts colorés
- Actions rapides (grille 2x2)
- Activité récente avec timeline

#### Contacts
- Stats mini (total, actifs, désinscrits, ajoutés ce mois)
- Table avec checkboxes, avatars, tags colorés, pagination
- Modal d'ajout (formulaire complet)
- Actions groupées (envoyer SMS, supprimer)
- Recherche + filtres + import/export CSV

#### Campagnes
- Stats globales (envoyés, taux délivrance, taux clics)
- Tabs de filtrage avec compteurs
- Cartes de campagne (statut, progression, performance)
- Modal de création (type, message, destinataires, programmation)

#### Templates
- Grille de cartes avec icônes par catégorie
- Compteur d'utilisation, favoris
- Modal de création (éditeur, variables cliquables, aperçu live)
- Banner suggestion IA
- Filtrage par catégorie

#### Auth (Login/Register)
- Split screen : gradient animé + formulaire
- Register en 2 étapes avec progress bar
- Google OAuth
- Testimonials, features list

---

## Application Mobile

### Structure des fichiers

```
mobile/
├── package.json
├── app.json                    # Config Expo
├── tailwind.config.js          # NativeWind
├── global.css
├── app/
│   ├── _layout.tsx             # Root layout (Stack, SafeArea, Query)
│   ├── (tabs)/
│   │   ├── _layout.tsx         # Bottom tab navigator (4 tabs)
│   │   ├── index.tsx           # Dashboard mobile
│   │   ├── campaigns.tsx       # Campagnes
│   │   ├── contacts.tsx        # Contacts
│   │   └── settings.tsx        # Paramètres
│   └── (auth)/
│       └── login.tsx           # Écran connexion
├── components/
│   └── StatCard.tsx            # Composant réutilisable
└── lib/
    └── api.ts                  # Client API
```

### Design Mobile

- **Style** : Inspiré Revolut/Nubank (fintech premium)
- **Gradients** : Bleu → Violet sur les headers et cards
- **Coins arrondis** : 16-24px
- **Shadows** : Douces, multi-niveaux
- **Touch feedback** : Scale + opacity animations
- **Safe areas** : Respect des encoches et barres système

### Écrans

| Écran | Fonctionnalités |
|-------|----------------|
| **Dashboard** | Stats 2x2, actions rapides (4 boutons circulaires), campagnes récentes |
| **Campagnes** | Tabs scrollables, liste de cartes, FAB création |
| **Contacts** | Search, liste avec avatars, actions swipe, FAB |
| **Paramètres** | Profil card, sections groupées, toggles, déconnexion |
| **Login** | Gradient header, formulaire premium |

---

## Infrastructure AWS

### Ressources (SAM Template)

| Ressource | Type | Rôle |
|-----------|------|------|
| `ApiGateway` | API Gateway | Point d'entrée HTTP |
| `ApiFunction` | Lambda | API FastAPI principale |
| `SmsWorkerFunction` | Lambda | Envoi SMS unitaire (trigger SQS) |
| `SchedulerFunction` | Lambda | Vérification campagnes programmées (cron 1min) |
| `SmsQueue` | SQS | File d'attente pour envois SMS |
| `SmsDeadLetterQueue` | SQS DLQ | Messages échoués (3 tentatives max) |
| `UploadsBucket` | S3 | Stockage imports CSV, logos |
| `ScheduledCampaignRule` | EventBridge | Cron pour campagnes programmées |

### Flux d'envoi SMS

```
1. User crée campagne → POST /v1/campaigns/{id}/send
2. API vérifie les crédits et met à jour le statut → "sending"
3. Pour chaque contact : crée un Message et publie dans SQS
4. Lambda Worker (SmsWorkerFunction) traite le message SQS
5. Worker récupère le provider configuré pour le tenant et appelle l'API SMS (3MI par défaut)
6. Provider retourne le statut → Worker met à jour la DB
7. Provider envoie un webhook (delivery report) → API met à jour le statut final
```

### Flux des campagnes programmées

```
1. User programme une campagne → POST /v1/campaigns/{id}/schedule
2. EventBridge Rule déclenche SchedulerFunction toutes les minutes
3. Scheduler vérifie les campagnes avec scheduled_at <= now()
4. Lance l'envoi des campagnes éligibles (même flux que ci-dessus)
```

---

## Modèle de données

### Diagramme des entités

```
tenants (1) ──────── (N) users
   │
   ├──── (N) contacts ──── (N:M) contact_groups
   │
   ├──── (N) templates
   │
   ├──── (N) campaigns ──── (N) messages
   │
   ├──── (N) automations
   │
   ├──── (N) credit_transactions
   │
   └──── (N) webhook_logs
```

### Tables

| Table | Description | Champs clés |
|-------|-------------|-------------|
| `tenants` | Entreprises clientes | name, slug, plan, sms_credits, sms_provider, settings |
| `users` | Utilisateurs par entreprise | email, password_hash, role (owner/admin/member) |
| `contacts` | Clients des entreprises | phone, birth_date, tags[], is_subscribed |
| `contact_groups` | Segments/listes | name, is_dynamic, filters (JSONB) |
| `contact_group_members` | Liaison contacts↔groupes | contact_id, group_id |
| `templates` | Modèles de messages | content, variables[], category |
| `campaigns` | Campagnes SMS | type, status, scheduled_at, stats dénormalisées |
| `messages` | SMS individuels envoyés | phone, status, provider_id, cost |
| `credit_transactions` | Historique crédits | type (purchase/usage/refund), amount, balance_after |
| `automations` | Envois automatiques | type, trigger_config (JSONB), next_run_at |
| `webhook_logs` | Callbacks providers | event_type, payload (JSONB), processed |

### Stratégie Multi-tenant

- **Méthode** : Colonne `tenant_id` sur chaque table
- **Middleware** : Injecte automatiquement le `tenant_id` depuis le JWT
- **Isolation** : Toutes les requêtes filtrent par `tenant_id`
- **Évolutivité** : Migration possible vers schema-per-tenant à +1000 tenants

---

## API Endpoints

### Base URL

```
Production : https://api.sms-pro.com/v1
Local :      http://localhost:8000/v1
Docs :       http://localhost:8000/docs (Swagger UI)
```

### Authentification

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/auth/register` | Inscription (crée tenant + user owner) |
| POST | `/auth/login` | Connexion → access + refresh token |
| POST | `/auth/refresh` | Renouveler le token |
| GET | `/auth/me` | Profil utilisateur connecté |

### Tenant (Entreprise)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/tenant` | Infos de l'entreprise courante |
| PATCH | `/tenant` | Modifier nom, email, téléphone (owner/admin) |

### Administration Plateforme (Superadmin uniquement)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/admin/tenants` | Lister toutes les entreprises |
| PATCH | `/admin/tenants/{id}/provider` | Changer le provider SMS d'un tenant |
| PATCH | `/admin/tenants/{id}/credits` | Ajouter/retirer des crédits SMS |
| PATCH | `/admin/tenants/{id}/toggle` | Activer/désactiver un tenant |

### Contacts

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/contacts` | Lister (pagination, search, filtres tags/city/subscribed) |
| POST | `/contacts` | Créer un contact |
| POST | `/contacts/import` | Import CSV en masse |
| GET | `/contacts/{id}` | Détails |
| PATCH | `/contacts/{id}` | Modifier |
| DELETE | `/contacts/{id}` | Supprimer |
| POST | `/contacts/{id}/unsubscribe` | Opt-out (RGPD) |

### Campagnes

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/campaigns` | Lister (filtres par status) |
| POST | `/campaigns` | Créer |
| GET | `/campaigns/{id}` | Détails + stats |
| POST | `/campaigns/{id}/send` | Lancer l'envoi |
| POST | `/campaigns/{id}/schedule` | Programmer |
| POST | `/campaigns/{id}/cancel` | Annuler |

### SMS Direct

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/sms/send` | SMS unitaire |
| POST | `/sms/send-bulk` | SMS en masse (max 500) |

### Autres

| Ressource | Endpoints |
|-----------|-----------|
| **Templates** | CRUD + preview |
| **Groups** | CRUD + gestion membres |
| **Automations** | CRUD + activate/deactivate |
| **Credits** | balance, transactions, purchase |
| **Stats** | overview, daily, monthly |
| **Webhooks 3MI** | DLR (accusés réception), MO (messages entrants) |
| **SMSBUS** | Vérification solde 3MI |

---

## Sécurité

| Mesure | Implémentation |
|--------|---------------|
| **Authentification** | JWT (access 30min + refresh 7j) |
| **Hashage** | bcrypt (Passlib) |
| **Autorisation** | Role-based : `superadmin` > `owner` > `admin` > `member` |
| **Isolation données** | tenant_id sur chaque requête |
| **Provider SMS** | Configurable uniquement par le superadmin |
| **Rate limiting** | 100 req/min (1000 pour bulk) |
| **Validation** | Pydantic v2 (schémas stricts) |
| **CORS** | Configurable par environnement |
| **RGPD** | Opt-in/opt-out, suppression de données |
| **Secrets** | Variables d'environnement (jamais en dur) |

### Rôles et permissions

| Rôle | Niveau | Permissions |
|------|--------|-------------|
| **superadmin** | Plateforme | Tout : gérer les tenants, changer les providers, crédits |
| **owner** | Entreprise | Gérer l'entreprise, les utilisateurs, toutes les fonctionnalités |
| **admin** | Entreprise | Gérer contacts, campagnes, templates, voir les stats |
| **member** | Entreprise | Envoyer des SMS, voir les contacts et campagnes |

---

## Guide d'installation

### Prérequis

- Python 3.12+
- Node.js 20+
- PostgreSQL 16
- Redis 7+
- Docker (optionnel)

### Backend

```bash
cd backend

# 1. Environnement virtuel
python -m venv .venv
source .venv/bin/activate

# 2. Installer les dépendances
pip install -e ".[dev]"

# 3. Configurer l'environnement
cp .env.example .env
# Éditer .env avec vos valeurs

# 4. Lancer PostgreSQL (Docker)
docker run -d --name sms-pg \
  -p 5432:5432 \
  -e POSTGRES_DB=sms_marketing \
  -e POSTGRES_PASSWORD=postgres \
  postgres:16

# 5. Lancer Redis (Docker)
docker run -d --name sms-redis -p 6379:6379 redis:7

# 6. Migrations
alembic upgrade head

# 7. Lancer le serveur
uvicorn app.main:app --reload --port 8000
```

→ API : http://localhost:8000
→ Swagger : http://localhost:8000/docs

### Frontend Web

```bash
cd web

# 1. Installer les dépendances
npm install

# 2. Lancer le serveur de développement
npm run dev
```

→ Dashboard : http://localhost:3000

### Application Mobile

```bash
cd mobile

# 1. Installer les dépendances
npx expo install

# 2. Lancer
npx expo start

# Scanner le QR code avec Expo Go (iOS/Android)
```

---

## Déploiement

### Backend (AWS)

```bash
cd infra

# 1. Build
sam build

# 2. Déployer (première fois)
sam deploy --guided

# 3. Déploiements suivants
sam deploy
```

### Frontend Web

Options :
- **Vercel** : `npx vercel deploy` (recommandé pour Next.js)
- **AWS Amplify** : Push sur GitHub → déploiement auto
- **Cloudflare Pages** : Alternative gratuite

### Mobile

```bash
# Build pour stores
npx eas build --platform all

# Soumettre aux stores
npx eas submit --platform ios
npx eas submit --platform android
```

---

## Roadmap

### Phase 1 — MVP (Actuel) ✅
- [x] Backend API (auth, contacts, campaigns, SMS)
- [x] Dashboard web (Next.js)
- [x] App mobile (Expo)
- [x] Multi-tenant
- [x] 4 providers SMS (3MI par défaut, Twilio, Vonage, Orange)
- [x] Provider configurable par tenant (superadmin uniquement)
- [x] Infrastructure AWS (SAM)
- [x] Webhooks 3MI (DLR + MO)
- [x] Administration plateforme (superadmin)
- [x] Gestion des rôles (superadmin > owner > admin > member)

### Phase 2 — Améliorations
- [ ] Tests unitaires et d'intégration (pytest + Playwright)
- [ ] CI/CD (GitHub Actions)
- [ ] Import CSV contacts avec validation
- [ ] Shortlinks + tracking de clics
- [ ] Webhooks sortants (notifier le client)
- [ ] A/B Testing complet
- [ ] Paiement (Stripe / mobile money)

### Phase 3 — Fonctionnalités avancées
- [ ] SMS conversationnel (2-way)
- [ ] Chatbot SMS simple
- [ ] Génération de templates par IA
- [ ] Segmentation intelligente (ML)
- [ ] API publique avec documentation développeur
- [ ] Multi-langue (i18n)
- [ ] Audit logs
- [ ] SSO entreprise (SAML)

### Phase 4 — Scale
- [ ] Multi-région AWS
- [ ] Cache distribué
- [ ] Analytics avancées (cohortes, LTV)
- [ ] Marketplace de templates
- [ ] Programme partenaires / revendeurs

---

## Support

- **Documentation API** : `/docs` (Swagger auto-généré)
- **Contact technique** : [à définir]
- **Issues** : GitHub Issues

---

*Documentation générée le 1er Juillet 2026*
*Version 0.1.0*
