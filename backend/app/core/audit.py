"""
Service de logs d'audit pour les actions critiques.

Enregistre les événements importants dans un logger structuré dédié
pour la traçabilité et la conformité.

Actions auditées :
- LOGIN_SUCCESS / LOGIN_FAILED
- PASSWORD_CHANGED
- SMS_SENT / SMS_BULK_SENT / SMS_GROUP_SENT
- CAMPAIGN_SENT / CAMPAIGN_SCHEDULED / CAMPAIGN_CANCELLED
- PAYMENT_CONFIRMED / PAYMENT_REJECTED
- SUBSCRIPTION_ACTIVATED / SUBSCRIPTION_CANCELLED
- USER_CREATED / USER_DEACTIVATED
- TENANT_CREATED / TENANT_DEACTIVATED
"""

import logging
import json
from datetime import datetime

# Logger dédié à l'audit — séparé des logs applicatifs
audit_logger = logging.getLogger("audit")
audit_logger.setLevel(logging.INFO)

# Format structuré pour faciliter le parsing (ELK, CloudWatch Insights, etc.)
if not audit_logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter(
        "%(asctime)s [AUDIT] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    ))
    audit_logger.addHandler(handler)


def log_audit(
    action: str,
    user_id: str | None = None,
    tenant_id: str | None = None,
    ip: str | None = None,
    details: dict | None = None,
):
    """
    Enregistrer un événement d'audit.

    Args:
        action: Type d'action (ex: LOGIN_SUCCESS, SMS_BULK_SENT)
        user_id: ID de l'utilisateur qui a effectué l'action
        tenant_id: ID du tenant concerné
        ip: Adresse IP du client
        details: Détails supplémentaires (nombre de SMS, destinataire, etc.)
    """
    event = {
        "action": action,
        "timestamp": datetime.utcnow().isoformat(),
        "user_id": user_id,
        "tenant_id": tenant_id,
        "ip": ip,
    }
    if details:
        event["details"] = details

    # Log structuré JSON pour faciliter l'indexation
    audit_logger.info(json.dumps(event, ensure_ascii=False))
