# Guide de Déploiement — SMS Marketing Platform

Ce document couvre l'ensemble des procédures de déploiement : développement local, Docker, AWS (production), et mobile (Android/iOS).

---

## Table des matières

1. [Prérequis](#1-prérequis)
2. [Développement local (sans Docker)](#2-développement-local-sans-docker)
3. [Déploiement Docker](#3-déploiement-docker)
4. [Déploiement AWS (Production)](#4-déploiement-aws-production)
5. [Déploiement Mobile (Android & iOS)](#5-déploiement-mobile-android--ios)
6. [Variables d'environnement](#6-variables-denvironnement)
7. [Commandes utiles](#7-commandes-utiles)
8. [Reset de la base de données](#8-reset-de-la-base-de-données)
9. [Création du Super Admin](#9-création-du-super-admin)

---

## 1. Prérequis

### Outils requis

| Outil | Version min. | Usage |
|-------|-------------|-------|
| Python | 3.12 | Backend API |
| Node.js | 18 | Frontend Web |
| PostgreSQL | 15 | Base de données |
| Redis | 7 | Rate limiting |
| Docker & Docker Compose | 24+ | Conteneurisation |
| AWS CLI | 2.x | Déploiement AWS |
| AWS SAM CLI | 1.100+ | Build & deploy Lambda |
| Expo CLI | latest | App mobile |
| EAS CLI | 20.5+ | Build mobile cloud |

### Installation des outils

```bash
# AWS CLI
brew install awscli

# AWS SAM CLI
brew install aws-sam-cli

# Expo & EAS CLI
npm install -g expo-cli eas-cli
```

---

## 2. Développement local (sans Docker)

### 2.1 Backend (FastAPI)

```bash
cd backend

# Créer l'environnement virtuel
python3.12 -m venv .venv
source .venv/bin/activate

# Installer les dépendances
pip install -e .

# Configurer les variables d'environnement
export DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5432/sms_marketing"
export REDIS_URL="redis://localhost:6379/0"
export JWT_SECRET_KEY="dev-secret-key-change-in-production"
export ENVIRONMENT="development"
```

### 2.2 Base de données — Créer & migrer

```bash
# Créer la base de données
createdb sms_marketing

# Exécuter les migrations Alembic
cd backend
source .venv/bin/activate
alembic upgrade head
```

### 2.3 Créer une nouvelle migration

```bash
cd backend
source .venv/bin/activate

# Après modification des modèles SQLAlchemy
alembic revision --autogenerate -m "description de la migration"

# Appliquer
alembic upgrade head

# Revenir en arrière (1 migration)
alembic downgrade -1
```

### 2.4 Lancer le backend

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

L'API est disponible sur : http://localhost:8000  
Documentation Swagger : http://localhost:8000/docs

### 2.5 Lancer les Workers

Chaque worker se lance dans un terminal séparé :

```bash
# Worker Automation (birthday, inactivity, recurring)
cd backend
source .venv/bin/activate
python -m app.workers.automation_worker

# Worker DLR (accusés de réception SMS)
cd backend
source .venv/bin/activate
python -m app.workers.dlr_worker

# Worker Scheduler (campagnes programmées)
cd backend
source .venv/bin/activate
python -m app.workers.scheduler
```

### 2.6 Frontend Web (Next.js)

```bash
cd web

# Installer les dépendances
npm install

# Configurer l'URL API
export NEXT_PUBLIC_API_URL=http://localhost:8000/v1

# Lancer en développement
npm run dev
```

Le frontend est disponible sur : http://localhost:3000

### 2.7 Application Mobile (Expo)

```bash
cd mobile

# Installer les dépendances
npm install

# Lancer le serveur de développement
npx expo start
```

Scanner le QR code avec l'app Expo Go (Android) ou l'appareil photo (iOS).

---

## 3. Déploiement Docker

### 3.1 Architecture des services

| Service | Image | Port | Rôle |
|---------|-------|------|------|
| redis | redis:7-alpine | 6379 | Cache & rate limiting |
| backend | ./backend/Dockerfile | 8000 | API FastAPI |
| web | ./web/Dockerfile | 3001 → 3000 | Frontend Next.js |
| dlr-worker | ./backend/Dockerfile | — | Polling DLR |
| automation-worker | ./backend/Dockerfile | — | Automations périodiques |

### 3.2 Lancer tous les services

```bash
# Depuis la racine du projet
docker compose up -d --build
```

### 3.3 Lancer un service individuel

```bash
# Seulement le backend
docker compose up -d backend

# Rebuild un service spécifique
docker compose up -d --build backend
```

### 3.4 Voir les logs

```bash
# Tous les services
docker compose logs -f

# Un service spécifique
docker compose logs -f backend
docker compose logs -f automation-worker
```

### 3.5 Arrêter les services

```bash
# Arrêter tout
docker compose down

# Arrêter et supprimer les volumes
docker compose down -v
```

### 3.6 Exécuter les migrations dans Docker

```bash
# Depuis le conteneur backend
docker compose exec backend alembic upgrade head

# Ou créer une nouvelle migration
docker compose exec backend alembic revision --autogenerate -m "description"
```

### 3.7 Note importante

Le docker-compose utilise `host.docker.internal` pour accéder à PostgreSQL installé sur la machine hôte. Si PostgreSQL tourne aussi en Docker, ajoutez un service `postgres` au docker-compose.

---

## 4. Déploiement AWS (Production)

### 4.1 Architecture AWS

```
                    ┌─────────────────┐
                    │   CloudFront    │ ← Frontend (S3 ou Amplify)
                    └────────┬────────┘
                             │
┌────────────────────────────┼────────────────────────────┐
│ VPC                        │                             │
│                   ┌────────┴────────┐                    │
│                   │  API Gateway    │                    │
│                   └────────┬────────┘                    │
│                            │                             │
│              ┌─────────────┼─────────────┐               │
│              │             │             │               │
│     ┌────────┴──┐  ┌──────┴─────┐  ┌───┴────────┐      │
│     │ Lambda API│  │ Lambda SMS │  │Lambda Sched.│      │
│     └────────┬──┘  │   Worker   │  └───┬────────┘      │
│              │     └──────┬─────┘      │               │
│              │            │            │               │
│     ┌────────┴────────────┴────────────┴──────┐        │
│     │            RDS Proxy                     │        │
│     └────────────────┬────────────────────────┘        │
│                      │                                  │
│     ┌────────────────┴─────────────────┐               │
│     │       RDS PostgreSQL             │               │
│     └──────────────────────────────────┘               │
│                                                         │
│     ┌──────────────┐    ┌──────────────┐               │
│     │ ElastiCache  │    │   SQS Queue  │               │
│     │   (Redis)    │    │              │               │
│     └──────────────┘    └──────────────┘               │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Prérequis AWS

- Compte AWS avec les permissions nécessaires
- VPC avec subnets privés (pour Lambda) et un subnet public (pour NAT Gateway)
- Instance RDS PostgreSQL déjà créée
- ElastiCache Redis déjà créé
- AWS CLI configuré : `aws configure`

### 4.3 Déployer le Backend (SAM)

```bash
cd backend

# Build du projet SAM
sam build

# Premier déploiement (mode guidé)
sam deploy --guided
```

Lors du premier déploiement guidé, SAM vous demandera les paramètres. Exemple :

```
Parameter Environment [production]:
Parameter DatabaseUrl: postgresql+asyncpg://user:pass@rds-proxy-endpoint:5432/sms_marketing
Parameter RedisUrl: redis://elasticache-endpoint:6379/0
Parameter JwtSecretKey: <votre-clé-secrète-forte>
Parameter SubnetIds: subnet-xxx,subnet-yyy
Parameter VpcId: vpc-xxx
Parameter RdsInstanceIdentifier: sms-marketing
Parameter PublicSubnetId: subnet-zzz
Parameter AllowedOrigins: https://app.smspro.com
```

Les paramètres sont sauvés dans `samconfig.toml`. Pour les déploiements suivants :

```bash
cd backend
sam build && sam deploy
```

### 4.4 Exécuter les migrations en production

```bash
# Invoquer la Lambda de migration
aws lambda invoke \
  --function-name sms-marketing-MigrateFunction-XXXX \
  --payload '{}' \
  output.json

# Vérifier le résultat
cat output.json
```

Ou depuis AWS CloudShell :

```bash
aws lambda invoke \
  --function-name sms-marketing-MigrateFunction-XXXX \
  --payload '{}' \
  /dev/stdout
```

### 4.5 Lambdas déployées

| Lambda | Déclencheur | Fréquence |
|--------|-------------|-----------|
| ApiFunction | API Gateway (HTTP) | À la demande |
| SmsWorkerFunction | SQS Queue | Messages en file |
| SchedulerFunction | EventBridge | Toutes les minutes |
| AutomationWorkerFunction | EventBridge | Toutes les 5 minutes |
| DlrWorkerFunction | EventBridge | Toutes les 2 minutes |
| MigrateFunction | Invocation manuelle | À la demande |

### 4.6 Déployer le Frontend Web

#### Option A : AWS Amplify (recommandé)

```bash
# Installer Amplify CLI
npm install -g @aws-amplify/cli

# Depuis le dossier web/
amplify init
amplify add hosting
amplify publish
```

Ou configurez directement dans la console AWS Amplify :
1. Connecter le repo Git
2. Build settings automatiques pour Next.js
3. Variable d'environnement : `NEXT_PUBLIC_API_URL=https://api-id.execute-api.eu-west-1.amazonaws.com/production/v1`

#### Option B : S3 + CloudFront (export statique)

Si vous exportez en statique (`next export`) :

```bash
cd web
npm run build

# Uploader le contenu de out/ vers S3
aws s3 sync out/ s3://votre-bucket-frontend --delete

# Invalider le cache CloudFront
aws cloudfront create-invalidation \
  --distribution-id EXXXXX \
  --paths "/*"
```

#### Option C : Docker sur ECS/Fargate

```bash
# Build et push l'image
docker build -t sms-web ./web
docker tag sms-web:latest YOUR_ECR_URI:latest
aws ecr get-login-password | docker login --username AWS --password-stdin YOUR_ECR_URI
docker push YOUR_ECR_URI:latest
```

### 4.7 Monitoring & Logs

```bash
# Voir les logs de l'API Lambda
sam logs -n ApiFunction --stack-name sms-marketing --tail

# Voir les logs du worker automation
sam logs -n AutomationWorkerFunction --stack-name sms-marketing --tail

# Voir les logs dans CloudWatch
aws logs tail /aws/lambda/sms-marketing-ApiFunction-XXXX --follow
```

---

## 5. Déploiement Mobile (Android & iOS)

### 5.1 Configuration initiale

```bash
cd mobile

# Se connecter à Expo / EAS
npx eas-cli login

# Vérifier le projet
npx eas-cli project:info
```

### 5.2 Configuration API (Production)

Modifier l'URL de l'API dans `mobile/lib/api.ts` pour pointer vers la production :

```typescript
const API_BASE_URL = "https://api-id.execute-api.eu-west-1.amazonaws.com/production/v1";
```

Ou utiliser une variable d'environnement avec `expo-constants`.

### 5.3 Build Android (APK / AAB)

#### Build de développement (test interne)

```bash
cd mobile

# APK de développement (installable directement)
npx eas-cli build --platform android --profile development
```

#### Build de preview (test interne sans dev client)

```bash
npx eas-cli build --platform android --profile preview
```

#### Build de production (Google Play Store)

```bash
# Génère un .aab (Android App Bundle)
npx eas-cli build --platform android --profile production
```

Le fichier `.aab` sera disponible sur le dashboard EAS une fois le build terminé.

### 5.4 Build iOS (IPA)

#### Prérequis iOS

- Compte Apple Developer (99$/an)
- Certificats et provisioning profiles (gérés automatiquement par EAS)

#### Build de développement

```bash
cd mobile

npx eas-cli build --platform ios --profile development
```

#### Build de production (App Store)

```bash
npx eas-cli build --platform ios --profile production
```

### 5.5 Soumettre aux stores

#### Google Play Store

```bash
# Soumettre le dernier build production
npx eas-cli submit --platform android --latest
```

Prérequis :
- Compte Google Play Developer (25$ unique)
- Service Account JSON configuré dans EAS
- Application créée dans la Google Play Console

Configuration dans `eas.json` (déjà en place) :
```json
{
  "submit": {
    "production": {}
  }
}
```

Pour configurer le service account :
```bash
npx eas-cli credentials --platform android
```

#### Apple App Store

```bash
# Soumettre le dernier build production
npx eas-cli submit --platform ios --latest
```

Prérequis :
- Compte Apple Developer
- App créée dans App Store Connect
- Apple ID et mot de passe spécifique à l'app (ou API Key)

### 5.6 Over-The-Air Updates (OTA)

Pour pousser des mises à jour JavaScript sans republier sur les stores :

```bash
cd mobile

# Publier une mise à jour OTA
npx eas-cli update --branch production --message "Fix: correction du bug X"
```

### 5.7 Build local (sans EAS cloud)

Si vous préférez builder localement :

```bash
# Android — nécessite Android Studio & SDK
cd mobile
npx expo run:android --variant release

# iOS — nécessite Xcode (macOS uniquement)
cd mobile
npx expo run:ios --configuration Release
```

### 5.8 Informations de l'app

| Champ | Valeur |
|-------|--------|
| Nom | SMS Pro |
| Slug | sms-pro-mobile |
| Bundle iOS | com.smspro.mobile |
| Package Android | com.smspro.mobile |
| Version | 1.0.0 |
| EAS Project ID | 5937b14c-696d-4e30-b404-f298c79a0270 |

---

## 6. Variables d'environnement

### Backend

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DATABASE_URL` | URL PostgreSQL (asyncpg) | `postgresql+asyncpg://user:pass@host:5432/db` |
| `REDIS_URL` | URL Redis | `redis://localhost:6379/0` |
| `JWT_SECRET_KEY` | Clé secrète JWT | Générer avec `openssl rand -hex 32` |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | Durée token access | `30` |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS` | Durée token refresh | `7` |
| `ENVIRONMENT` | Environnement | `development` / `production` |
| `SMSBUS_USERNAME` | Identifiant 3MI | — |
| `SMSBUS_PASSWORD` | Mot de passe 3MI | — |
| `SMSBUS_ID` | Terminal Web ID | — |
| `SMSBUS_SENDER_ID` | Sender ID SMS | `SMSPro` |
| `WHATSAPP_VERIFY_TOKEN` | Token webhook WhatsApp | — |
| `FACEBOOK_APP_ID` | App ID Facebook | — |
| `FACEBOOK_APP_SECRET` | Secret Facebook | — |
| `ALLOWED_ORIGINS` | Origines CORS autorisées | `https://app.smspro.com` |

### Frontend Web

| Variable | Description | Exemple |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | URL de l'API backend | `http://localhost:8000/v1` |

---

## 7. Commandes utiles

### Résumé rapide

```bash
# ─── Développement local ─────────────────────────────────
cd backend && source .venv/bin/activate && uvicorn app.main:app --reload    # API
cd web && npm run dev                                                         # Frontend
cd mobile && npx expo start                                                  # Mobile

# ─── Docker ──────────────────────────────────────────────
docker compose up -d --build          # Tout lancer
docker compose down                   # Tout arrêter
docker compose logs -f backend        # Logs backend
docker compose exec backend alembic upgrade head  # Migrations

# ─── Migrations Alembic ─────────────────────────────────
cd backend && source .venv/bin/activate
alembic upgrade head                  # Appliquer toutes les migrations
alembic downgrade -1                  # Annuler la dernière migration
alembic revision --autogenerate -m "desc"  # Nouvelle migration
alembic history                       # Historique des migrations
alembic current                       # Migration actuelle

# ─── AWS SAM ────────────────────────────────────────────
cd backend
sam build                             # Build du package
sam deploy                            # Déployer (après config initiale)
sam deploy --guided                   # Premier déploiement
sam logs -n ApiFunction --tail        # Logs en direct
sam local start-api                   # Tester l'API localement via SAM

# ─── Mobile ─────────────────────────────────────────────
cd mobile
npx eas-cli build -p android --profile production     # Build Android prod
npx eas-cli build -p ios --profile production         # Build iOS prod
npx eas-cli submit -p android --latest                # Publier Play Store
npx eas-cli submit -p ios --latest                    # Publier App Store
npx eas-cli update --branch production --message "x"  # OTA update

# ─── Workers (local) ────────────────────────────────────
cd backend && source .venv/bin/activate
python -m app.workers.automation_worker   # Automations
python -m app.workers.dlr_worker          # Accusés de réception
python -m app.workers.scheduler           # Campagnes programmées
```

---

## 8. Reset de la base de données

### Méthode 1 : Drop/Create (recommandé — repart à zéro)

```bash
dropdb sms_marketing
createdb sms_marketing
cd backend && source .venv/bin/activate
alembic upgrade head
```

### Méthode 2 : Alembic downgrade + upgrade

Supprime toutes les tables puis les recrée vides :

```bash
cd backend && source .venv/bin/activate
alembic downgrade base    # Supprime toutes les tables
alembic upgrade head      # Les recrée vides
```

### Méthode 3 : Vider les données sans toucher au schéma (TRUNCATE)

Garde les tables et la version Alembic intactes, supprime uniquement les données :

```bash
psql -h localhost -U postgres -d sms_marketing -c "
DO \$\$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != 'alembic_version')
  LOOP
    EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;
END \$\$;
"
```

### Méthode 4 : Script Python init_db.py (drop_all + create_all)

```bash
cd backend
source .venv/bin/activate
python init_db.py
```

Ce script supprime toutes les tables et les recrée depuis les modèles SQLAlchemy.

> **Note :** Après un reset via `init_db.py`, exécutez `alembic stamp head` pour resynchroniser Alembic.

### Dans Docker

```bash
# Méthode 1 : Script init_db
docker compose exec backend python init_db.py
docker compose exec backend alembic stamp head

# Méthode 2 : Alembic
docker compose exec backend alembic downgrade base
docker compose exec backend alembic upgrade head
```

### Comparatif

| Méthode | Garde le schéma | Garde alembic_version | Simplicité |
|---------|:-:|:-:|:-:|
| Drop/Create + upgrade | recrée | recrée | simple |
| Alembic downgrade/upgrade | recrée | recrée | simple |
| TRUNCATE CASCADE | oui | oui | moyenne |
| init_db.py | recrée | non | rapide |

---

## 9. Création du Super Admin

Après un reset ou une première installation, il faut créer le compte superadmin.

### Script

```bash
cd tests
python create_superadmin.py
```

Ce script :
1. Crée un tenant interne "SMS Pro Platform" (plan enterprise)
2. Crée l'utilisateur superadmin

### Identifiants par défaut

```
┌──────────────────────────────────────┐
│  IDENTIFIANTS SUPERADMIN              │
├──────────────────────────────────────┤
│  Email:    admin@sms-pro.com         │
│  Password: Admin@2024!               │
│  Rôle:     superadmin                │
└──────────────────────────────────────┘
```

> **IMPORTANT :** Changez le mot de passe immédiatement en production !

### Dans Docker

```bash
docker compose exec backend python ../tests/create_superadmin.py
```

### Seed des tarifs SMS (optionnel)

Pour importer le catalogue de prix 3MI :

```bash
cd backend
source .venv/bin/activate
python -m scripts.seed_sms_pricing
```

### Procédure complète après un reset

```bash
# 1. Recréer la base
dropdb sms_marketing && createdb sms_marketing

# 2. Appliquer les migrations
cd backend && source .venv/bin/activate
alembic upgrade head

# 3. Créer le superadmin
cd ../tests
python create_superadmin.py

# 4. (Optionnel) Importer les tarifs SMS
cd ../backend
python -m scripts.seed_sms_pricing
```

---

## Troubleshooting

### Erreur de connexion à la base de données

```bash
# Vérifier que PostgreSQL tourne
pg_isready -h localhost -p 5432

# Vérifier que la base existe
psql -h localhost -U postgres -l | grep sms_marketing
```

### Erreur Docker "host.docker.internal"

Sur Linux, ajoutez dans docker-compose.yml :
```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

### Build SAM échoue

```bash
# Nettoyer le cache SAM
rm -rf backend/.aws-sam/build
sam build --use-container  # Build dans un conteneur Docker
```

### EAS Build échoue

```bash
# Vérifier les credentials
npx eas-cli credentials --platform android
npx eas-cli credentials --platform ios

# Nettoyer et relancer
cd mobile
rm -rf node_modules && npm install
npx eas-cli build -p android --clear-cache
```

---

*Documentation générée pour SMS Marketing Platform — Developed by MARIKX GROUP*
