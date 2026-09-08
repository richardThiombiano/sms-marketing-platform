# Configuration WhatsApp Embedded Signup

Guide pour configurer l'Embedded Signup sur Meta et connecter la plateforme.

---

## Prérequis

- Un compte [Meta Business](https://business.facebook.com) vérifié
- Un compte développeur sur [Meta for Developers](https://developers.facebook.com)

---

## Étape 1 — Créer une App Facebook

1. Va sur https://developers.facebook.com/apps/
2. Clique **Créer une app**
3. Choisis le type **Business**
4. Remplis le nom (ex: `SMS Pro WhatsApp`) et associe ton Business Manager
5. Une fois créée, note l'**App ID** et l'**App Secret** (dans Paramètres > Base)

---

## Étape 2 — Ajouter le produit WhatsApp

1. Dans ton app, va dans le panneau latéral → **Ajouter un produit**
2. Cherche **WhatsApp** → clique **Configurer**
3. Associe ton Meta Business Account quand demandé

---

## Étape 3 — Configurer l'Embedded Signup

1. Dans ton app → **WhatsApp** → **Embedded Signup** (ou Configuration)
2. Clique **Créer une configuration**
3. Remplis :
   - **Nom de la configuration** : ex. `sms-pro-onboarding`
   - **Permissions demandées** : `whatsapp_business_messaging`, `whatsapp_business_management`
   - **Callback URL** : ton domaine frontend (ex: `https://app.smspro.com`)
4. Valide et note le **Configuration ID** (config_id)

---

## Étape 4 — Configurer les webhooks

1. Dans ton app → **WhatsApp** → **Configuration**
2. Section **Webhook** → clique **Modifier**
3. URL du webhook : `https://ton-api.com/v1/webhooks/whatsapp`
4. Token de vérification : la valeur de `WHATSAPP_VERIFY_TOKEN` dans ta config backend
5. Abonne-toi aux champs : `messages`, `message_template_status_update`

---

## Étape 5 — Variables d'environnement backend

Ajoute ces variables dans ton `.env` ou dans les paramètres SAM :

```env
# Facebook App (Embedded Signup)
FACEBOOK_APP_ID=123456789012345
FACEBOOK_APP_SECRET=abc123def456...
FACEBOOK_CONFIG_ID=987654321098765
```

| Variable | Description |
|----------|-------------|
| `FACEBOOK_APP_ID` | App ID depuis Paramètres > Base de ton app Facebook |
| `FACEBOOK_APP_SECRET` | App Secret depuis le même endroit |
| `FACEBOOK_CONFIG_ID` | Configuration ID de l'Embedded Signup (étape 3) |

---

## Étape 6 — Passer l'app en mode Live

1. Dans ton app → **Paramètres** → **Base**
2. Active le **Mode Live** (switch en haut de la page)
3. Tu devras peut-être compléter :
   - L'URL de politique de confidentialité
   - L'URL de suppression des données
   - La vérification Business (si pas encore faite)

> En mode Development, seuls les numéros de test fonctionnent.
> En mode Live, n'importe quel client peut connecter son numéro.

---

## Comment ça fonctionne (flow complet)

```
┌─────────────────┐       ┌──────────────┐       ┌──────────────┐
│  Frontend       │       │   Meta       │       │   Backend    │
│  (Owner)        │       │   Popup      │       │   API        │
└────────┬────────┘       └──────┬───────┘       └──────┬───────┘
         │                       │                       │
         │  1. Clic "Connecter"  │                       │
         │──────────────────────>│                       │
         │                       │                       │
         │  2. Crée/sélectionne  │                       │
         │     WABA + numéro     │                       │
         │                       │                       │
         │  3. Renvoie code OAuth│                       │
         │<──────────────────────│                       │
         │                       │                       │
         │  4. POST /callback    │                       │
         │──────────────────────────────────────────────>│
         │                       │                       │
         │                       │  5. Échange code      │
         │                       │<──────────────────────│
         │                       │  → access_token       │
         │                       │──────────────────────>│
         │                       │                       │
         │                       │  6. GET phone_numbers │
         │                       │<──────────────────────│
         │                       │  → phone_number_id    │
         │                       │──────────────────────>│
         │                       │                       │
         │  7. Succès !          │                       │
         │<──────────────────────────────────────────────│
         │                       │                       │
```

---

## Dépannage

| Problème | Solution |
|----------|----------|
| Popup ne s'ouvre pas | Vérifier que `FACEBOOK_APP_ID` et `FACEBOOK_CONFIG_ID` sont corrects |
| Erreur "App not live" | Passer l'app en mode Live (étape 6) |
| Code OAuth invalide | Le code expire en quelques minutes — vérifier la latence réseau |
| Pas de phone_number_id | L'utilisateur n'a pas terminé la vérification du numéro dans le popup |
| 403 sur les routes WhatsApp | Le tenant n'a pas encore connecté WhatsApp (faire l'Embedded Signup d'abord) |

---

## Tester en développement

En mode Development de l'app Facebook :
- Seuls les administrateurs/développeurs/testeurs de l'app peuvent utiliser le popup
- Ajouter les testeurs dans : App → Rôles → Testeurs
- Utiliser un numéro de test Meta (dans WhatsApp > Configuration API > Numéro de test)
