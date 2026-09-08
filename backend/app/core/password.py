"""
Validation de la force du mot de passe.

Règles :
- Minimum 8 caractères
- Au moins une lettre majuscule
- Au moins une lettre minuscule
- Au moins un chiffre

Ces règles sont un bon compromis entre sécurité et utilisabilité
pour une plateforme SaaS B2B.
"""

import re


def validate_password(password: str) -> tuple[bool, str | None]:
    """
    Valide la force d'un mot de passe.
    Retourne (is_valid, error_message).
    """
    if len(password) < 8:
        return False, "Le mot de passe doit contenir au moins 8 caractères"

    if not re.search(r'[A-Z]', password):
        return False, "Le mot de passe doit contenir au moins une lettre majuscule"

    if not re.search(r'[a-z]', password):
        return False, "Le mot de passe doit contenir au moins une lettre minuscule"

    if not re.search(r'[0-9]', password):
        return False, "Le mot de passe doit contenir au moins un chiffre"

    return True, None
