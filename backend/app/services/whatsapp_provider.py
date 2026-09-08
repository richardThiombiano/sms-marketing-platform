"""
Provider WhatsApp Business via Meta Cloud API.

Utilise l'API Graph de Meta pour envoyer des messages WhatsApp.
Chaque tenant a ses propres credentials (phone_number_id, access_token).

Documentation Meta :
- https://developers.facebook.com/docs/whatsapp/cloud-api
- https://developers.facebook.com/docs/whatsapp/cloud-api/messages

Types de messages supportés :
- Template messages (marketing, utility, authentication)
- Text messages (dans la fenêtre 24h uniquement)
- Media messages (image, video, document, audio)

Contraintes :
- Messages marketing : uniquement via templates pré-approuvés par Meta
- Fenêtre 24h : messages libres possibles uniquement si le contact a répondu
- Rate limits : dépendent du tier du compte (1K, 10K, 100K, unlimited)
"""

import logging
from typing import Any

import httpx

from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class WhatsAppProvider:
    """
    Fournisseur WhatsApp Business via Meta Cloud API.

    Chaque tenant a ses propres identifiants :
    - whatsapp_phone_number_id : ID du numéro WhatsApp Business
    - whatsapp_business_account_id : ID du compte WhatsApp Business
    - whatsapp_access_token : Token d'accès permanent (System User Token)
    """

    def __init__(self, tenant=None):
        """
        Initialiser le provider avec les identifiants du tenant.
        """
        self.api_version = settings.whatsapp_api_version
        self.base_url = f"{settings.whatsapp_api_base_url}/{self.api_version}"

        if tenant:
            self.phone_number_id = getattr(tenant, "whatsapp_phone_number_id", "") or ""
            self.business_account_id = getattr(tenant, "whatsapp_business_account_id", "") or ""
            self.access_token = getattr(tenant, "whatsapp_access_token", "") or ""
        else:
            self.phone_number_id = ""
            self.business_account_id = ""
            self.access_token = ""

        if not self.phone_number_id or not self.access_token:
            logger.warning("WhatsApp provider initialisé sans credentials valides")

    @property
    def _headers(self) -> dict:
        """Headers d'authentification pour l'API Meta."""
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

    @property
    def _messages_url(self) -> str:
        """URL de l'endpoint messages."""
        return f"{self.base_url}/{self.phone_number_id}/messages"

    def _normalize_phone(self, phone: str) -> str:
        """
        Normaliser le numéro au format international sans '+'.
        Meta exige le format : code pays + numéro (ex: 22670000000).
        """
        clean = phone.strip().lstrip("+")
        if clean.startswith("00"):
            clean = clean[2:]
        return clean

    async def send_template(
        self,
        phone: str,
        template_name: str,
        language_code: str = "fr",
        components: list[dict] | None = None,
    ) -> dict:
        """
        Envoyer un message template WhatsApp.

        Les templates doivent être pré-approuvés par Meta.
        Utilisé pour les messages marketing (broadcast) et les notifications.

        Args:
            phone: Numéro destinataire (format international)
            template_name: Nom du template approuvé chez Meta
            language_code: Code langue du template (fr, en, etc.)
            components: Paramètres dynamiques du template (header, body, buttons)

        Returns:
            dict avec provider_id et status
        """
        payload: dict[str, Any] = {
            "messaging_product": "whatsapp",
            "to": self._normalize_phone(phone),
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language_code},
            },
        }

        if components:
            payload["template"]["components"] = components

        return await self._send_request(payload)

    async def send_text(self, phone: str, content: str, preview_url: bool = False) -> dict:
        """
        Envoyer un message texte libre.

        ATTENTION : Uniquement possible dans la fenêtre 24h
        (après que le contact a envoyé un message).

        Args:
            phone: Numéro destinataire
            content: Texte du message (max 4096 caractères)
            preview_url: Générer un aperçu pour les URLs dans le message

        Returns:
            dict avec provider_id et status
        """
        payload = {
            "messaging_product": "whatsapp",
            "to": self._normalize_phone(phone),
            "type": "text",
            "text": {
                "body": content,
                "preview_url": preview_url,
            },
        }

        return await self._send_request(payload)

    async def send_media(
        self,
        phone: str,
        media_type: str,
        media_url: str | None = None,
        media_id: str | None = None,
        caption: str | None = None,
        filename: str | None = None,
    ) -> dict:
        """
        Envoyer un message media (image, video, document, audio).

        Args:
            phone: Numéro destinataire
            media_type: Type de media (image, video, document, audio)
            media_url: URL publique du media
            media_id: ID du media uploadé chez Meta
            caption: Légende (pour image, video, document)
            filename: Nom du fichier (pour document)

        Returns:
            dict avec provider_id et status
        """
        media_object: dict[str, Any] = {}
        if media_url:
            media_object["link"] = media_url
        elif media_id:
            media_object["id"] = media_id
        else:
            raise ValueError("media_url ou media_id requis")

        if caption and media_type in ("image", "video", "document"):
            media_object["caption"] = caption
        if filename and media_type == "document":
            media_object["filename"] = filename

        payload = {
            "messaging_product": "whatsapp",
            "to": self._normalize_phone(phone),
            "type": media_type,
            media_type: media_object,
        }

        return await self._send_request(payload)

    async def send(self, phone: str, content: str, sender: str | None = None, **kwargs) -> dict:
        """
        Interface compatible avec SmsProvider.send().

        Si un template_name est fourni dans kwargs, envoie un template.
        Sinon, envoie un message texte (uniquement dans la fenêtre 24h).
        """
        template_name = kwargs.get("template_name")
        language_code = kwargs.get("language_code", "fr")
        components = kwargs.get("components")

        if template_name:
            return await self.send_template(
                phone=phone,
                template_name=template_name,
                language_code=language_code,
                components=components,
            )
        else:
            return await self.send_text(phone=phone, content=content)

    async def get_status(self, provider_id: str) -> str:
        """
        Récupérer le statut d'un message.
        Note: WhatsApp utilise principalement les webhooks pour les statuts.
        """
        return "sent"

    async def _send_request(self, payload: dict) -> dict:
        """
        Envoyer une requête à l'API WhatsApp.

        Gère les erreurs et retourne un format normalisé.
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self._messages_url,
                headers=self._headers,
                json=payload,
            )

            if response.status_code == 401:
                raise Exception("WhatsApp: Token d'accès invalide ou expiré")

            if response.status_code == 400:
                error_data = response.json().get("error", {})
                error_msg = error_data.get("message", "Requête invalide")
                error_code = error_data.get("code", "unknown")
                raise Exception(f"WhatsApp [{error_code}]: {error_msg}")

            response.raise_for_status()
            data = response.json()

            # Extraire le message ID de la réponse
            messages = data.get("messages", [])
            if messages:
                message_id = messages[0].get("id", "")
                message_status = messages[0].get("message_status", "accepted")
                return {
                    "provider_id": message_id,
                    "status": message_status if message_status != "accepted" else "sent",
                }

            return {"provider_id": "", "status": "unknown"}

    async def send_bulk_template(
        self,
        phones: list[str],
        template_name: str,
        language_code: str = "fr",
        components: list[dict] | None = None,
    ) -> list[dict]:
        """
        Envoyer un template à plusieurs destinataires.
        WhatsApp n'a pas de vrai endpoint bulk, on envoie séquentiellement.

        Args:
            phones: Liste de numéros destinataires
            template_name: Nom du template approuvé
            language_code: Code langue
            components: Paramètres dynamiques du template

        Returns:
            Liste de résultats par destinataire
        """
        results = []
        for phone in phones:
            try:
                result = await self.send_template(
                    phone=phone,
                    template_name=template_name,
                    language_code=language_code,
                    components=components,
                )
                results.append({"phone": phone, **result})
            except Exception as e:
                logger.error(f"Erreur envoi WhatsApp à {phone}: {e}")
                results.append({
                    "phone": phone,
                    "provider_id": "",
                    "status": "failed",
                    "error": str(e),
                })

        return results

    # ─── Gestion des Templates ───────────────────────────────────────

    async def get_templates(self, limit: int = 100) -> list[dict]:
        """
        Récupérer la liste des templates WhatsApp du compte.

        Returns:
            Liste des templates avec leur statut d'approbation
        """
        url = f"{self.base_url}/{self.business_account_id}/message_templates"
        params = {"limit": limit}

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=self._headers, params=params)
            response.raise_for_status()
            data = response.json()

            templates = []
            for tpl in data.get("data", []):
                templates.append({
                    "id": tpl.get("id"),
                    "name": tpl.get("name"),
                    "status": tpl.get("status"),  # APPROVED, PENDING, REJECTED
                    "category": tpl.get("category"),  # MARKETING, UTILITY, AUTHENTICATION
                    "language": tpl.get("language"),
                    "components": tpl.get("components", []),
                })

            return templates

    async def create_template(
        self,
        name: str,
        category: str,
        language: str,
        components: list[dict],
    ) -> dict:
        """
        Soumettre un nouveau template à Meta pour approbation.

        Args:
            name: Nom du template (lowercase, underscores)
            category: MARKETING, UTILITY, ou AUTHENTICATION
            language: Code langue (fr, en_US, etc.)
            components: Liste des composants (HEADER, BODY, FOOTER, BUTTONS)

        Returns:
            dict avec l'ID et le statut du template créé
        """
        url = f"{self.base_url}/{self.business_account_id}/message_templates"
        payload = {
            "name": name,
            "category": category,
            "language": language,
            "components": components,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=self._headers, json=payload)

            if response.status_code == 400:
                error_data = response.json().get("error", {})
                raise Exception(
                    f"Erreur création template: {error_data.get('message', 'Unknown')}"
                )

            response.raise_for_status()
            data = response.json()

            return {
                "id": data.get("id"),
                "status": data.get("status", "PENDING"),
                "category": data.get("category", category),
            }

    async def delete_template(self, template_name: str) -> bool:
        """
        Supprimer un template WhatsApp.

        Args:
            template_name: Nom du template à supprimer

        Returns:
            True si supprimé avec succès
        """
        url = f"{self.base_url}/{self.business_account_id}/message_templates"
        params = {"name": template_name}

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.delete(url, headers=self._headers, params=params)
            response.raise_for_status()
            return response.json().get("success", False)
