# Workers SMS Pro Platform

Ce document décrit les deux workers qui tournent en arrière-plan pour exécuter les envois automatiques de SMS.

---

## 1. Scheduler — Campagnes programmées

**Fichier :** `run_scheduler.py`  
**Worker :** `app/workers/scheduler.py`

### Rôle

Le scheduler vérifie toutes les **60 secondes** s'il y a des campagnes dont la date d'envoi programmée est atteinte, et les envoie automatiquement via 3MI.

### Lancement

```bash
cd backend
source .venv/bin/activate
python run_scheduler.py
```

### Fonctionnement

1. Récupère les campagnes avec `status = "scheduled"` et `scheduled_at <= maintenant`
2. Passe chaque campagne en statut `"sending"`
3. Récupère les destinataires (groupe ciblé ou tous les contacts abonnés)
4. Envoie les SMS via le provider 3MI (bulk ou un par un)
5. Logue chaque message en base de données
6. Met à jour les stats de la campagne (`total_sent`, `total_failed`)
7. Passe le statut final à `"sent"`

### Configuration

| Variable | Valeur | Description |
|----------|--------|-------------|
| `CHECK_INTERVAL` | 60 secondes | Fréquence de vérification |

### Logs

```
2026-07-02 10:00:01 [INFO] Scheduler démarré — vérification toutes les 60 secondes
2026-07-02 10:01:01 [INFO] Trouvé 1 campagne(s) à envoyer
2026-07-02 10:01:01 [INFO] Lancement: Promo Été (ID: abc-123)
2026-07-02 10:01:01 [INFO]   Envoi à 150 destinataire(s)...
2026-07-02 10:01:05 [INFO]   Terminé: 148 envoyés, 2 échoués
```

---

## 2. Automation Worker — Envois automatiques

**Fichier :** `run_automations.py`  
**Worker :** `app/workers/automation_worker.py`

### Rôle

Le worker d'automations vérifie toutes les **5 minutes** les automations actives et exécute celles dont les conditions sont remplies.

### Lancement

```bash
cd backend
source .venv/bin/activate
python run_automations.py
```

### Types d'automations

| Type | Déclencheur | Fréquence d'exécution |
|------|-------------|----------------------|
| `birthday` | Contacts dont c'est l'anniversaire aujourd'hui | 1x par jour |
| `welcome` | Nouveau contact ajouté (non géré par ce worker) | À l'événement |
| `inactivity` | Contacts sans SMS reçu depuis X jours | 1x par jour |
| `recurring` | Tous les contacts abonnés | Selon config (quotidien/hebdo/mensuel) |

### Fonctionnement

1. Récupère toutes les automations avec `is_active = true`
2. Pour chaque automation, vérifie si elle doit s'exécuter (`should_run`)
3. Récupère les contacts éligibles selon le type
4. Personnalise le message avec les variables du contact
5. Envoie via 3MI
6. Met à jour `last_run_at`, `next_run_at`, `total_sent`

### Personnalisation des messages

Les variables suivantes sont remplacées automatiquement :

| Variable | Remplacé par |
|----------|-------------|
| `{{first_name}}` | Prénom du contact |
| `{{last_name}}` | Nom du contact |
| `{{phone}}` | Numéro de téléphone |
| `{{city}}` | Ville |
| `{{country}}` | Pays |

**Exemple :**  
Template : `Joyeux anniversaire {{first_name}} ! -20% avec le code ANNIV`  
Résultat : `Joyeux anniversaire Aminata ! -20% avec le code ANNIV`

### Configuration

| Variable | Valeur | Description |
|----------|--------|-------------|
| `CHECK_INTERVAL` | 300 secondes (5 min) | Fréquence de vérification |

### Logs

```
2026-07-02 09:00:00 [INFO] Automation worker démarré — vérification toutes les 5 minutes
2026-07-02 09:00:01 [INFO] Exécution: Anniversaire clients (type: birthday)
2026-07-02 09:00:01 [INFO]   3 contact(s) éligible(s)
2026-07-02 09:00:03 [INFO]   → 3 SMS envoyé(s)
2026-07-02 09:00:03 [INFO] Exécution: Relance inactifs (type: inactivity)
2026-07-02 09:00:03 [INFO]   12 contact(s) éligible(s)
2026-07-02 09:00:08 [INFO]   → 12 SMS envoyé(s)
```

---

## Lancement en production

### Avec systemd (Linux)

Créer deux fichiers service :

**`/etc/systemd/system/sms-scheduler.service`**
```ini
[Unit]
Description=SMS Pro Scheduler
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/sms-marketing-platform/backend
ExecStart=/opt/sms-marketing-platform/backend/.venv/bin/python run_scheduler.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**`/etc/systemd/system/sms-automations.service`**
```ini
[Unit]
Description=SMS Pro Automation Worker
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/sms-marketing-platform/backend
ExecStart=/opt/sms-marketing-platform/backend/.venv/bin/python run_automations.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Activer et démarrer :
```bash
sudo systemctl enable sms-scheduler sms-automations
sudo systemctl start sms-scheduler sms-automations
```

### Avec Docker

```dockerfile
# Worker scheduler
CMD ["python", "run_scheduler.py"]

# Worker automations
CMD ["python", "run_automations.py"]
```

### Avec AWS Lambda + EventBridge

Les deux workers exposent un `handler(event, context)` compatible Lambda. Configurer un EventBridge rule :
- Scheduler : `rate(1 minute)`
- Automations : `rate(5 minutes)`

---

## Prérequis

- PostgreSQL accessible
- Variables d'environnement configurées (`.env`)
- Identifiants 3MI valides sur les tenants
- Le backend doit être installé (`pip install -e .`)

---

## Dépannage

| Problème | Solution |
|----------|----------|
| "No module named app" | Lancer depuis le dossier `backend/` ou installer le package |
| Pas d'envoi | Vérifier que les automations/campagnes sont actives |
| Erreur 3MI | Vérifier les identifiants `smsbus_*` du tenant |
| Contacts non trouvés | Vérifier que `is_subscribed = true` et que `birth_date` est renseigné (birthday) |


---

## Monitoring depuis le Dashboard Admin

Une page de monitoring est disponible dans le panel admin à l'adresse `/admin/workers`.

### Accès

- Se connecter en tant que **superadmin**
- Aller dans le menu latéral → **Workers**

### Informations affichées

**Scheduler (Campagnes programmées) :**
- Statut : Actif (dernière exécution < 24h) ou En veille
- Nombre de campagnes en attente d'envoi
- Nombre de campagnes envoyées dans les 24 dernières heures
- Nom et date de la dernière campagne envoyée

**Automation Worker (Envois automatiques) :**
- Statut : Actif (dernière exécution < 10 min) ou En veille
- Nombre d'automations actives
- Total de SMS envoyés par les automations
- Nom et date de la dernière automation exécutée

**Statistiques globales (24h) :**
- Total de messages envoyés sur les 24 dernières heures
- Total de messages échoués sur les 24 dernières heures

**Activité récente :**
- Les 10 dernières exécutions (campagnes + automations) triées par date
- Pour chaque entrée : nom, type, nombre d'envois réussis/échoués, date d'exécution

### Détermination du statut

Le statut des workers est déterminé automatiquement à partir des données en base :

| Worker | Condition "Actif" | Sinon |
|--------|------------------|-------|
| Scheduler | Dernière campagne envoyée il y a moins de 24h | En veille |
| Automation Worker | Dernière automation exécutée il y a moins de 10 min | En veille |

**Note :** Le statut "En veille" ne signifie pas nécessairement que le worker est arrêté — il peut simplement n'avoir rien à traiter (aucune campagne programmée, aucune automation à déclencher).

### API Endpoint

```
GET /v1/admin/workers
Authorization: Bearer <superadmin_token>
```

Retourne les stats des deux workers, les métriques 24h, et l'activité récente.
