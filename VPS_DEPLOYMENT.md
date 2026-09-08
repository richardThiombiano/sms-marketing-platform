# Déploiement sur VPS OVH — SMS Marketing Platform (multi-apps)

Ce guide décrit le déploiement de la plateforme sur un VPS OVH unique, derrière
un reverse proxy **Traefik** central partagé. Cette architecture permet
d'héberger **plusieurs applications** (jusqu'à vos 5 projets) sur le même VPS,
chacune sur son sous-domaine, avec HTTPS automatique (Let's Encrypt).

> Pour le déploiement AWS (Lambda/SAM) d'origine, voir `DEPLOYMENT.md`.

---

## Architecture

```
Internet → :80 / :443
                │
      ┌─────────▼──────────┐
      │  Traefik (proxy)   │   stack "reverse-proxy/" — démarrée EN PREMIER
      │  HTTPS auto (ACME) │   réseau Docker partagé "web-proxy"
      └───┬────────┬───────┘
          │        │
   app.marikxgroup.com   api.marikxgroup.com   ...autres apps
          │        │
      ┌───▼───┐ ┌──▼──────┐
      │  web  │ │ backend │   stack SMS "docker-compose.prod.yml"
      └───────┘ └────┬────┘
                     │  (réseau privé "sms-net")
        ┌────────────┼─────────────┬──────────┐
     postgres     redis        workers     migrate
```

Deux stacks Docker distinctes :

| Stack | Dossier | Rôle |
|-------|---------|------|
| Reverse proxy | `reverse-proxy/` | Traefik : HTTPS + routage par sous-domaine. **Partagé** entre toutes les apps. |
| Application SMS | racine (`docker-compose.prod.yml`) | postgres, redis, backend, web, workers. |

Chaque application (SMS + vos futurs projets) rejoint le réseau externe
`web-proxy` et déclare son routage via des **labels Traefik**. Aucune config
Nginx à éditer, aucun certificat à gérer manuellement.

Fichiers ajoutés :

| Fichier | Rôle |
|---------|------|
| `reverse-proxy/docker-compose.yml` | Stack Traefik |
| `reverse-proxy/traefik.yml` | Config statique Traefik |
| `reverse-proxy/.env.example` | Variables du proxy (email ACME, auth dashboard) |
| `reverse-proxy/app-template.docker-compose.yml` | Modèle pour brancher une future app |
| `docker-compose.prod.yml` | Stack applicative SMS |
| `.env.prod.example` | Variables de l'app SMS |
| `scripts/provision-vps.sh` | Préparation du VPS (Docker, pare-feu…) |

---

## Prérequis

- Un VPS OVH sous **Debian 12** ou **Ubuntu 22.04/24.04**, accès SSH root.
- Le domaine `marikxgroup.com` (géré chez Hostinger).
- Les identifiants de votre fournisseur SMS 3MI (LeSMSBUS).

Dimensionnement conseillé : **2 vCPU / 4 Go RAM** minimum pour la seule app SMS.
Prévoyez davantage de RAM à mesure que vous ajoutez des applications.

---

## Étape 0 — Sous-domaines (DNS Hostinger)

Dans Hostinger : **Domaines → marikxgroup.com → DNS / Nameservers →
Gérer les enregistrements DNS**. Ajoutez un enregistrement **A** par service,
tous pointant vers l'IP publique du VPS :

| Type | Nom (Host) | Pointe vers | Usage |
|------|-----------|-------------|-------|
| A | `app` | `141.94.94.14` | Frontend SMS |
| A | `api` | `141.94.94.14` | API SMS |
| A | `traefik` | `141.94.94.14` | Dashboard Traefik (optionnel) |

Pour vos futures applications, ajoutez simplement un enregistrement A
supplémentaire par sous-domaine (ex. `crm`, `boutique`, `blog`…), toujours vers
la même IP du VPS.

Astuce : un enregistrement **A** avec le nom `*` (wildcard) vers l'IP du VPS
couvre d'un coup tous les sous-domaines — pratique si vous ajoutez souvent des
apps. Sinon, un enregistrement par sous-domaine.

Vérifiez la propagation avant de continuer :

```bash
dig +short app.marikxgroup.com   # doit renvoyer l'IP du VPS
dig +short api.marikxgroup.com
```

---

## Étape 1 — Provisionner le VPS

Connectez-vous en root et vérifiez la version d'Ubuntu :

```bash
ssh root@141.94.94.14
lsb_release -a          # note la version exacte (24.04, 25.x…)
apt-get update && apt-get install -y git
git clone VOTRE_DEPOT_GIT sms-marketing-platform
cd sms-marketing-platform
```

Lancez le provisioning (Docker, pare-feu UFW, utilisateur `deploy`). Le VPS a
12 Go de RAM, on désactive le swap (`SWAP_SIZE=0`) :

```bash
TIMEZONE=Africa/Abidjan SWAP_SIZE=0 bash scripts/provision-vps.sh
```

Reconnectez-vous avec l'utilisateur `deploy` (pour appliquer le groupe docker) :

```bash
exit
ssh deploy@141.94.94.14
cd sms-marketing-platform
docker --version && docker compose version
```

> Si le dossier appartient à root après le clone :
> `sudo chown -R deploy:deploy ~/sms-marketing-platform`

---

## Étape 2 — Démarrer le reverse proxy Traefik (une seule fois)

Le proxy est partagé par toutes les apps. On le lance en premier.

```bash
# 1. Créer le réseau partagé (une seule fois sur le VPS)
docker network create web-proxy

# 2. Configurer le proxy
cd reverse-proxy
cp .env.example .env
nano .env        # renseignez ACME_EMAIL et TRAEFIK_DASHBOARD_AUTH
```

Pour le dashboard, générez un identifiant Basic Auth (installez `apache2-utils`
si `htpasswd` manque : `sudo apt-get install -y apache2-utils`) :

```bash
htpasswd -nbB admin 'VOTRE_MOT_DE_PASSE'
```

Copiez la ligne obtenue dans `.env` sous `TRAEFIK_DASHBOARD_AUTH`, en
**doublant chaque `$`** (remplacez `$` par `$$`) pour docker-compose.

Préparez le stockage des certificats puis démarrez :

```bash
touch letsencrypt/acme.json && chmod 600 letsencrypt/acme.json
docker compose up -d
docker compose logs -f traefik      # vérifier qu'il démarre sans erreur
cd ..
```

Le dashboard sera accessible sur `https://traefik.marikxgroup.com` une fois le
DNS propagé et le certificat émis.

---

## Étape 3 — Configurer l'application SMS

```bash
cp .env.prod.example .env.prod
nano .env.prod
```

Renseignez au minimum :

| Variable | Valeur |
|----------|--------|
| `POSTGRES_PASSWORD` | `openssl rand -base64 24` |
| `JWT_SECRET_KEY` | `openssl rand -hex 32` |
| `APP_DOMAIN` | `app.marikxgroup.com` |
| `API_DOMAIN` | `api.marikxgroup.com` |
| `NEXT_PUBLIC_API_URL` | `https://api.marikxgroup.com/v1` (doit finir par `/v1`) |
| `ALLOWED_ORIGINS` | `https://app.marikxgroup.com` |
| `SMSBUS_USERNAME` / `SMSBUS_PASSWORD` / `SMSBUS_ID` | Identifiants 3MI |
| `UVICORN_WORKERS` | Nombre de vCPU (ex. `2`) |

> `NEXT_PUBLIC_API_URL` est intégré au bundle **au build** du frontend. Si vous
> la changez ensuite, reconstruisez l'image web :
> `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build web`.

---

## Étape 4 — Démarrer l'application SMS

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Le service `migrate` applique les migrations Alembic avant le démarrage du
backend. Suivez le démarrage :

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f backend
```

Traefik détecte automatiquement `web` et `backend`, route les sous-domaines et
émet les certificats HTTPS (quelques secondes à 1-2 minutes au premier accès).

Testez :

```bash
curl https://api.marikxgroup.com/health
```

> Le premier appel HTTPS peut échouer le temps que le certificat soit émis.
> Réessayez après quelques secondes. En cas de souci, voir `docker compose logs traefik`.

---

## Étape 5 — Créer le Super Admin

Le script `tests/create_superadmin.py` vit hors du contexte de build du backend ;
on le copie dans le conteneur puis on l'exécute :

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod cp \
  tests/create_superadmin.py backend:/app/create_superadmin.py

docker compose -f docker-compose.prod.yml --env-file .env.prod exec \
  backend python /app/create_superadmin.py
```

Identifiants par défaut (à **changer immédiatement**) :

```
Email:    admin@sms-pro.com
Password: Admin@2024!
```

(Optionnel) Importer le catalogue de tarifs SMS :

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod exec \
  backend python -m scripts.seed_sms_pricing
```

---

## Étape 6 — Vérification finale

- Frontend : `https://app.marikxgroup.com`
- API santé : `https://api.marikxgroup.com/health`
- Dashboard proxy : `https://traefik.marikxgroup.com`
- Tous les services `Up` (sauf `migrate` en `Exited (0)`, normal) :

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
```

---

## Ajouter une nouvelle application

C'est là que l'architecture Traefik prend tout son sens. Pour chaque nouveau
projet :

1. **DNS** : ajoutez un enregistrement A pour le sous-domaine (ex.
   `crm.marikxgroup.com`) vers l'IP du VPS (ou utilisez le wildcard `*`).
2. **Compose** : dans le dépôt de l'app, partez de
   `reverse-proxy/app-template.docker-compose.yml`. Adaptez :
   - le nom du service et l'image/build ;
   - le `Host(...)` avec votre sous-domaine ;
   - le `loadbalancer.server.port` (port interne de votre app) ;
   - les noms de routeurs/services Traefik, qui doivent être **uniques** sur le
     VPS (ex. `crm` au lieu de `monapp`).
3. **Réseau** : l'app rejoint le réseau externe `web-proxy` (déjà créé).
   N'exposez **pas** de `ports:` — c'est Traefik qui publie l'app.
4. **Démarrage** : `docker compose up -d --build` dans le dossier de l'app.

Traefik détecte le nouveau conteneur, route le sous-domaine et émet le
certificat automatiquement. Rien à redémarrer côté proxy.

> Points d'attention multi-apps :
> - Chaque app garde ses propres services de données (postgres/redis) sur un
>   réseau **privé** distinct — ne les mettez pas sur `web-proxy`.
> - Les noms de routeurs/services Traefik doivent être uniques (collision sinon).
> - Surveillez la RAM du VPS à mesure que les apps s'accumulent.

---

## Exploitation courante

Alias pratique pour la stack SMS :

```bash
alias smsc='docker compose -f docker-compose.prod.yml --env-file .env.prod'
```

```bash
# Logs
smsc logs -f backend
smsc logs -f scheduler
docker compose -f reverse-proxy/docker-compose.yml logs -f traefik

# Redémarrer un service
smsc restart backend

# Mettre à jour le code (après git pull)
git pull
smsc up -d --build

# Rejouer les migrations manuellement
smsc run --rm migrate

# Arrêter / relancer la stack SMS (le proxy reste debout)
smsc down
smsc up -d
```

### Sauvegarde de la base de données

```bash
# Dump
smsc exec postgres pg_dump -U postgres sms_marketing > backup_$(date +%F).sql

# Restauration
cat backup_2026-01-01.sql | smsc exec -T postgres psql -U postgres -d sms_marketing
```

Les données PostgreSQL sont dans le volume Docker `pg_data` (persistant).
`down -v` (avec `-v`) **supprime** les volumes et les données — à éviter en prod.

---

## Dépannage

**Le frontend appelle la mauvaise URL d'API.**
`NEXT_PUBLIC_API_URL` est figée au build. Corrigez `.env.prod` puis :
`smsc up -d --build web`.

**Erreur CORS dans le navigateur.**
`ALLOWED_ORIGINS` doit correspondre exactement à `https://app.marikxgroup.com`
(sans slash final) et `ENVIRONMENT=production`.

**Le certificat HTTPS n'est pas émis.**
Vérifiez que le DNS pointe vers le VPS (`dig +short api.marikxgroup.com`), que
les ports 80/443 sont ouverts (UFW) et que le proxy tourne. Consultez
`docker compose -f reverse-proxy/docker-compose.yml logs traefik`. Le challenge
ACME HTTP a besoin du port 80 accessible depuis Internet.

**Une app ne répond pas (404 Traefik).**
Vérifiez qu'elle a bien `traefik.enable=true`, qu'elle est sur le réseau
`web-proxy`, et que le `Host(...)` correspond au sous-domaine appelé.

**Le backend ne démarre pas / erreur base de données.**
`smsc logs migrate` et `smsc logs postgres`. Le backend attend que `migrate`
se termine avec succès.

**Conflit de ports au démarrage du proxy.**
Une seule stack peut occuper 80/443. Assurez-vous qu'aucun autre service
(ancien Nginx, Apache système…) n'écoute sur ces ports : `sudo ss -tlnp | grep -E ':80|:443'`.

---

*Guide de déploiement VPS (Traefik multi-apps) — SMS Marketing Platform*
