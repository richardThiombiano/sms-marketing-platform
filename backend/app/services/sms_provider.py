from abc import ABC, abstractmethod

import httpx

from app.core.config import get_settings

settings = get_settings()


class SmsProvider(ABC):
    """Interface commune pour les fournisseurs SMS."""

    @abstractmethod
    async def send(self, phone: str, content: str, sender: str | None = None) -> dict:
        """Envoyer un SMS. Retourne {provider_id, status}."""
        pass

    @abstractmethod
    async def get_status(self, provider_id: str) -> str:
        """Récupérer le statut d'un message."""
        pass


class TwilioProvider(SmsProvider):
    """Fournisseur SMS Twilio."""

    def __init__(self):
        self.account_sid = settings.twilio_account_sid
        self.auth_token = settings.twilio_auth_token
        self.from_number = settings.twilio_phone_number
        self.base_url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}"

    async def send(self, phone: str, content: str, sender: str | None = None) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/Messages.json",
                auth=(self.account_sid, self.auth_token),
                data={
                    "To": phone,
                    "From": sender or self.from_number,
                    "Body": content,
                },
            )
            response.raise_for_status()
            data = response.json()
            return {
                "provider_id": data["sid"],
                "status": data["status"],
            }

    async def get_status(self, provider_id: str) -> str:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/Messages/{provider_id}.json",
                auth=(self.account_sid, self.auth_token),
            )
            response.raise_for_status()
            return response.json()["status"]


class VonageProvider(SmsProvider):
    """Fournisseur SMS Vonage (Nexmo)."""

    def __init__(self):
        self.api_key = settings.vonage_api_key
        self.api_secret = settings.vonage_api_secret
        self.base_url = "https://rest.nexmo.com/sms/json"

    async def send(self, phone: str, content: str, sender: str | None = None) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.base_url,
                json={
                    "api_key": self.api_key,
                    "api_secret": self.api_secret,
                    "to": phone,
                    "from": sender or "SMSPro",
                    "text": content,
                },
            )
            response.raise_for_status()
            data = response.json()
            message = data["messages"][0]
            return {
                "provider_id": message["message-id"],
                "status": "sent" if message["status"] == "0" else "failed",
            }

    async def get_status(self, provider_id: str) -> str:
        # Vonage utilise les webhooks pour le statut
        return "unknown"


class OrangeProvider(SmsProvider):
    """Fournisseur SMS Orange API (Afrique)."""

    def __init__(self):
        self.client_id = settings.orange_api_client_id
        self.client_secret = settings.orange_api_client_secret
        self.base_url = "https://api.orange.com/smsmessaging/v1"
        self._token: str | None = None

    async def _get_token(self) -> str:
        """Obtenir un token OAuth2 Orange."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.orange.com/oauth/v3/token",
                headers={"Authorization": f"Basic {self.client_id}:{self.client_secret}"},
                data={"grant_type": "client_credentials"},
            )
            response.raise_for_status()
            self._token = response.json()["access_token"]
            return self._token

    async def send(self, phone: str, content: str, sender: str | None = None) -> dict:
        token = self._token or await self._get_token()
        sender_address = sender or "tel:+2260000"

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/outbound/{sender_address}/requests",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "outboundSMSMessageRequest": {
                        "address": f"tel:{phone}",
                        "senderAddress": sender_address,
                        "outboundSMSTextMessage": {"message": content},
                    }
                },
            )
            response.raise_for_status()
            data = response.json()
            resource_url = data.get("outboundSMSMessageRequest", {}).get("resourceURL", "")
            return {
                "provider_id": resource_url.split("/")[-1] if resource_url else "unknown",
                "status": "sent",
            }

    async def get_status(self, provider_id: str) -> str:
        return "unknown"


class SmsbusProvider(SmsProvider):
    """
    Fournisseur SMS 3MI (LeSMSBUS) — Burkina Faso.

    API HTTP GET/POST simple.
    Documentation : HTTPSPECTECH-v034-3.pdf
    Site : https://www.lesmsbus.com

    Fonctionnalités :
    - Envoi SMS vers +160 pays
    - Accusés de réception (DLR)
    - Réception SMS (MO)
    - Vérification de solde
    - Support SMS flash et caractères accentués

    NOTE : Chaque entreprise (tenant) a son propre compte 3MI.
    Les identifiants sont stockés dans la table tenants.
    """

    def __init__(self, tenant=None):
        """
        Initialiser le provider avec les identifiants du tenant.
        Si pas de tenant, utilise les identifiants globaux (.env) comme fallback.
        """
        self.base_url = settings.smsbus_base_url

        if tenant and hasattr(tenant, "smsbus_username"):
            # Utiliser les identifiants propres à l'entreprise
            self.username = tenant.smsbus_username or ""
            self.password = tenant.smsbus_password or ""
            self.terminal_id = tenant.smsbus_id or ""
            self.sender_id = tenant.smsbus_sender_id or settings.smsbus_sender_id
        else:
            # Fallback : identifiants globaux (pour le superadmin ou tests)
            self.username = settings.smsbus_username
            self.password = settings.smsbus_password
            self.terminal_id = settings.smsbus_id
            self.sender_id = settings.smsbus_sender_id

    def _build_auth_params(self) -> dict:
        """Construire les paramètres d'auth (username/password ou id)."""
        if self.terminal_id:
            return {"id": self.terminal_id}
        return {"username": self.username, "password": self.password}

    async def send(
        self,
        phone: str,
        content: str,
        sender: str | None = None,
        flash: bool = False,
        request_dlr: bool = True,
        scheduled_at: str | None = None,
    ) -> dict:
        """
        Envoyer un SMS via l'API 3MI SMSBUS.

        Args:
            phone: Numéro destinataire (format: indicatif + numéro, sans + ni 00)
            content: Message à envoyer (encodé en UTF-8)
            sender: Sender ID (max 11 alphanum ou 18 chiffres)
            flash: Si True, message flash (non stocké sur le téléphone)
            request_dlr: Si True, demander un accusé de réception
            scheduled_at: Date d'envoi programmé (format: yyyy-MM-dd HH:mm:ss)

        Returns:
            dict avec provider_id et status

        Codes de réponse 3MI :
            0000|OK-numero-msgId → Succès
            0001 → Message vide
            0002 → Login/Pwd invalide
            0003 → Numéro invalide ou absent
            0005 → Erreur d'envoi
            0006 → Pas de route pour ce numéro
            0009 → Crédit SMS insuffisant
        """
        # Normaliser le numéro (retirer + et 00 au début)
        clean_phone = phone.lstrip("+")
        if clean_phone.startswith("00"):
            clean_phone = clean_phone[2:]

        # Construire les paramètres
        params = {
            **self._build_auth_params(),
            "to": clean_phone,
            "text": content,
            "from": sender or self.sender_id,
            "flash": "1" if flash else "0",
            "dlr": "1" if request_dlr else "0",
            "jca": "1",  # Garder les accents
        }

        # Ajout date programmée si spécifiée
        if scheduled_at:
            params["denv"] = scheduled_at

        async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
            response = await client.get(
                f"{self.base_url}/smsbusMt",
                params=params,
            )
            response.raise_for_status()

            # Parser la réponse : "0000|OK-numero-msgId" ou "0001|Message vide"
            response_text = response.text.strip()
            parts = response_text.split("|", 1)
            code = parts[0]
            message = parts[1] if len(parts) > 1 else ""

            if code == "0000":
                # Extraire le msgId depuis "OK-numero-msgId"
                # Format réponse : "OK-numero-dateYYYYMMDD-timestamp"
                # Ex: "OK-22676123456-20260806-281704567824197"
                # Le msgId complet est "dateYYYYMMDD-timestamp" (les 2 dernières parties après le numéro)
                msg_parts = message.split("-")
                if len(msg_parts) >= 4:
                    # msgId = "date-timestamp" (ex: "20260806-281704567824197")
                    msg_id = f"{msg_parts[-2]}-{msg_parts[-1]}"
                elif len(msg_parts) >= 3:
                    msg_id = msg_parts[-1]
                else:
                    msg_id = message
                return {
                    "provider_id": msg_id,
                    "status": "sent",
                }
            else:
                error_messages = {
                    "0001": "Message vide",
                    "0002": "Login/Mot de passe invalide",
                    "0003": "Numéro de téléphone invalide ou absent",
                    "0004": "MsgId n'existe pas",
                    "0005": "Erreur d'envoi",
                    "0006": "Pas de route pour ce numéro",
                    "0007": "Id absent",
                    "0008": "Id invalide",
                    "0009": "Crédit SMS insuffisant",
                    "00010": "Erreur Source",
                    "00011": "Opération non autorisée pour cet Id",
                    "00012": "Erreur interne serveur",
                }
                error_desc = error_messages.get(code, message)
                # raise Exception(f"3MI SMS Error [{code}]: {error_desc}")
                raise Exception(f"Erreur : {error_desc}")

    async def get_status(self, provider_id: str) -> str:
        """
        Récupérer le statut d'un message (DLR).

        Statuts possibles :
        - ENROUTE : Message en route
        - DELIVERED : Délivré au destinataire
        - EXPIRED : Expiré chez l'opérateur
        - DELETED : Supprimé par l'opérateur
        - UNDELIVERABLE : Numéro invalide ou injoignable
        - UNKNOWN : Statut inconnu
        """
        params = {
            "id": self.terminal_id,
            "msgId": provider_id,
        }

        async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
            response = await client.get(
                f"{self.base_url}/smsState",
                params=params,
            )
            response.raise_for_status()

            response_text = response.text.strip()
            parts = response_text.split("|", 1)
            code = parts[0]

            if code == "0000":
                # Format réponse: "0000|76b27700-DELIVERED-06-08-2026"
                # Après le |, on a: "identifiant-STATUS-date"
                # Statuts DLR 3MI : ENROUTE, DELIVERED, EXPIRED, DELETED, UNDELIVERABLE, UNKNOWN
                message_part = parts[1] if len(parts) > 1 else response_text
                dlr_parts = message_part.split("-")
                known_statuses = {"enroute", "delivered", "expired", "deleted", "undeliverable", "unknown"}
                for part in dlr_parts:
                    if part.lower() in known_statuses:
                        return part.lower()
                # Fallback : prendre la 2ème partie
                if len(dlr_parts) >= 2:
                    return dlr_parts[1].lower()
                return "unknown"
            elif code == "00014":
                return "pending"  # Opérateur n'a pas encore transmis le DLR
            elif code == "00015":
                return "queued"  # SMS pas encore transmis à l'opérateur
            elif code == "00016":
                return "pending"  # Opérateur n'a pas encore répondu
            else:
                return "unknown"

    async def get_balance(self) -> dict:
        """
        Récupérer le solde du compte 3MI.

        Returns:
            dict avec amount et currency (ex: {"amount": 2500, "currency": "XOF"})
        """
        # Utiliser id si disponible, sinon username/password
        if self.terminal_id:
            params = {"id": self.terminal_id}
        elif self.username and self.password:
            params = {"username": self.username, "password": self.password}
        else:
            raise Exception("Aucun identifiant configuré")

        async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
            response = await client.get(
                f"{self.base_url}/Balance",
                params=params,
            )
            response.raise_for_status()

            response_text = response.text.strip()

            # Format réponse: "2500-USD" ou "0008|Id est invalide"
            if "|" in response_text:
                raise Exception(f"Erreur solde: {response_text}")

            parts = response_text.split("-")
            if len(parts) == 2:
                return {
                    "amount": float(parts[0]),
                    "currency": parts[1],
                }
            return {"amount": 0, "currency": "XOF"}

    async def send_bulk(
        self, phones: list[str], content: str, sender: str | None = None
    ) -> list[dict]:
        """
        Envoyer un SMS à plusieurs destinataires.
        L'API 3MI supporte les numéros séparés par des virgules dans le paramètre 'to'.
        """
        # Normaliser les numéros
        clean_phones = []
        for phone in phones:
            clean = phone.lstrip("+")
            if clean.startswith("00"):
                clean = clean[2:]
            clean_phones.append(clean)

        # L'API 3MI accepte les numéros séparés par des virgules
        params = {
            **self._build_auth_params(),
            "to": ",".join(clean_phones),
            "text": content,
            "from": sender or self.sender_id,
            "dlr": "1",
            "jca": "1",
        }

        async with httpx.AsyncClient(verify=False, timeout=60.0) as client:
            response = await client.get(
                f"{self.base_url}/smsbusMt",
                params=params,
            )
            response.raise_for_status()

            response_text = response.text.strip()
            parts = response_text.split("|", 1)
            code = parts[0]

            if code == "0000":
                msg_parts = parts[1].split("-") if len(parts) > 1 else []
                msg_id = msg_parts[-1] if len(msg_parts) >= 3 else "bulk"
                return [
                    {"phone": p, "provider_id": msg_id, "status": "sent"}
                    for p in clean_phones
                ]
            else:
                raise Exception(f"Erreur envoi de masse : [{code}]: {parts[1] if len(parts) > 1 else 'Unknown'}")


def get_sms_provider(provider_name: str = "3mi", tenant=None) -> SmsProvider:
    """
    Factory pour obtenir le bon provider SMS.
    
    Args:
        provider_name: Nom du provider (3mi, twilio, vonage, orange)
        tenant: Objet Tenant (pour les identifiants propres à l'entreprise)
    """
    providers = {
        "twilio": TwilioProvider,
        "vonage": VonageProvider,
        "orange": OrangeProvider,
        "3mi": SmsbusProvider,
        "smsbus": SmsbusProvider,
    }
    provider_class = providers.get(provider_name)
    if not provider_class:
        raise ValueError(f"Provider SMS inconnu: {provider_name}")

    # SmsbusProvider accepte le tenant pour les identifiants par entreprise
    if provider_name in ("3mi", "smsbus"):
        return provider_class(tenant=tenant)
    return provider_class()


def get_whatsapp_provider(tenant=None):
    """
    Factory pour obtenir le provider WhatsApp.

    Args:
        tenant: Objet Tenant (avec les identifiants WhatsApp Business)

    Returns:
        WhatsAppProvider configuré avec les credentials du tenant
    """
    from app.services.whatsapp_provider import WhatsAppProvider
    return WhatsAppProvider(tenant=tenant)
