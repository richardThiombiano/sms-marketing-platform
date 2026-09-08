"""
Service de calcul du coût SMS basé sur le catalogue de prix 3MI.

Détermine le prix d'un SMS en fonction :
- Du préfixe pays du numéro destinataire
- Du nombre de segments du message

Pour le Burkina Faso (226), le prix est exact (13 FCFA/segment, tous opérateurs).
Pour l'international, on utilise le prix "Other Networks" (estimation haute).
"""

import re
from functools import lru_cache

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import SmsPricing


# ============================================
# CALCUL DES SEGMENTS SMS
# ============================================

# Caractères GSM 7-bit standard
GSM_CHARS = set(
    "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ ÆæßÉ"
    " !\"#¤%&'()*+,-./0123456789:;<=>?"
    "¡ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "ÄÖÑÜabcdefghijklmnopqrstuvwxyz"
    "äöñüà§"
)

# Caractères GSM 7-bit étendus (comptent pour 2 caractères)
GSM_EXTENDED_CHARS = set("^{}\\[~]|€")


def is_gsm_encoding(text: str) -> bool:
    """Vérifier si le texte peut être encodé en GSM 7-bit."""
    for char in text:
        if char not in GSM_CHARS and char not in GSM_EXTENDED_CHARS:
            return False
    return True


def count_gsm_chars(text: str) -> int:
    """Compter le nombre de caractères GSM (les chars étendus comptent double)."""
    count = 0
    for char in text:
        if char in GSM_EXTENDED_CHARS:
            count += 2
        else:
            count += 1
    return count


def calculate_segments(text: str) -> dict:
    """
    Calculer le nombre de segments SMS.

    Returns:
        dict avec encoding, char_count, segment_count, chars_per_segment
    """
    if not text:
        return {"encoding": "gsm", "char_count": 0, "segment_count": 0, "chars_per_segment": 160}

    if is_gsm_encoding(text):
        char_count = count_gsm_chars(text)
        if char_count <= 160:
            return {"encoding": "gsm", "char_count": char_count, "segment_count": 1, "chars_per_segment": 160}
        else:
            # Multipart : 153 chars par segment (7 utilisés pour le header UDH)
            segments = (char_count + 152) // 153
            return {"encoding": "gsm", "char_count": char_count, "segment_count": segments, "chars_per_segment": 153}
    else:
        # Unicode (UCS-2)
        char_count = len(text)
        if char_count <= 70:
            return {"encoding": "unicode", "char_count": char_count, "segment_count": 1, "chars_per_segment": 70}
        else:
            # Multipart : 67 chars par segment
            segments = (char_count + 66) // 67
            return {"encoding": "unicode", "char_count": char_count, "segment_count": segments, "chars_per_segment": 67}


# ============================================
# EXTRACTION DU PRÉFIXE PAYS
# ============================================

# Préfixes pays triés par longueur décroissante pour le matching
# (certains pays ont des indicatifs à 1, 2 ou 3 chiffres)
COUNTRY_CODE_LENGTHS = [3, 2, 1]


def extract_country_code(phone: str) -> str | None:
    """
    Extraire l'indicatif pays d'un numéro de téléphone.

    Supporte les formats : +22670..., 0022670..., 22670...
    Returns: l'indicatif (ex: "226") ou None si non trouvé
    """
    # Normaliser : retirer +, 00 au début, espaces, tirets
    clean = re.sub(r"[\s\-.]", "", phone)
    if clean.startswith("+"):
        clean = clean[1:]
    elif clean.startswith("00"):
        clean = clean[2:]

    # Essayer les préfixes de 3 à 1 chiffres
    # On retourne le premier match trouvé en base (vérifié par get_unit_price)
    if len(clean) >= 3:
        return clean[:3]  # On retourne les 3 premiers chiffres par défaut
    elif len(clean) >= 2:
        return clean[:2]
    elif len(clean) >= 1:
        return clean[:1]
    return None


def normalize_phone(phone: str) -> str:
    """Normaliser un numéro de téléphone (retirer +, 00, espaces)."""
    clean = re.sub(r"[\s\-.]", "", phone)
    if clean.startswith("+"):
        clean = clean[1:]
    elif clean.startswith("00"):
        clean = clean[2:]
    return clean


# ============================================
# LOOKUP DU PRIX EN BASE
# ============================================


async def get_unit_price(db: AsyncSession, phone: str) -> dict:
    """
    Récupérer le prix unitaire par segment pour un numéro de téléphone.

    Logique:
    1. Extraire le préfixe pays du numéro
    2. Chercher le prix "Other Networks" (is_default=True) pour ce pays
    3. Si pas trouvé, essayer avec un préfixe plus court

    Returns:
        dict avec unit_price, country_code, country_name, is_exact
    """
    clean_phone = normalize_phone(phone)

    # Essayer les préfixes de 3 à 1 chiffres
    for length in COUNTRY_CODE_LENGTHS:
        if len(clean_phone) < length:
            continue

        prefix = clean_phone[:length]

        # Chercher le tarif par défaut (Other Networks) pour ce préfixe
        result = await db.execute(
            select(SmsPricing).where(
                SmsPricing.country_code == prefix,
                SmsPricing.is_default == True,
            ).limit(1)
        )
        pricing = result.scalar_one_or_none()

        if pricing:
            # Pour le Burkina (226), tous les opérateurs ont le même prix → exact
            is_exact = prefix == "226"
            return {
                "unit_price": pricing.unit_price,
                "country_code": pricing.country_code,
                "country_name": pricing.country_name,
                "is_exact": is_exact,
            }

    # Aucun prix trouvé — retourner un fallback
    return {
        "unit_price": None,
        "country_code": None,
        "country_name": None,
        "is_exact": False,
    }


async def calculate_sms_cost(db: AsyncSession, phone: str, content: str) -> dict:
    """
    Calculer le coût complet d'un SMS.

    Returns:
        dict avec segments, unit_price, total_cost, country_code, country_name, is_exact, encoding
    """
    segments_info = calculate_segments(content)
    price_info = await get_unit_price(db, phone)

    total_cost = None
    if price_info["unit_price"] is not None:
        total_cost = round(segments_info["segment_count"] * price_info["unit_price"], 2)

    return {
        "segments": segments_info["segment_count"],
        "encoding": segments_info["encoding"],
        "char_count": segments_info["char_count"],
        "chars_per_segment": segments_info["chars_per_segment"],
        "unit_price": price_info["unit_price"],
        "total_cost": total_cost,
        "country_code": price_info["country_code"],
        "country_name": price_info["country_name"],
        "is_exact": price_info["is_exact"],
    }
