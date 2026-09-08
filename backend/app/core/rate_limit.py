"""
Rate limiter côté serveur avec Redis pour protéger contre le brute force.

Utilise Redis pour le stockage des tentatives, compatible avec
les déploiements multi-instance (Lambda, containers).

Stratégie login :
- 5 tentatives échouées par IP en 5 min → blocage 60 secondes
- 10 tentatives échouées par IP en 15 min → blocage 5 minutes
- 20 tentatives échouées par IP en 30 min → blocage 15 minutes

Fallback : si Redis est indisponible, le rate limiting est désactivé
(fail-open) pour ne pas bloquer les utilisateurs légitimes.
"""

import logging
import redis

from app.core.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

# Configuration
MAX_ATTEMPTS_TIER_1 = 5
MAX_ATTEMPTS_TIER_2 = 10
MAX_ATTEMPTS_TIER_3 = 20
WINDOW_TIER_1 = 5 * 60       # 5 minutes
WINDOW_TIER_2 = 15 * 60      # 15 minutes
WINDOW_TIER_3 = 30 * 60      # 30 minutes
BLOCK_TIER_1 = 60             # 1 minute
BLOCK_TIER_2 = 5 * 60        # 5 minutes
BLOCK_TIER_3 = 15 * 60       # 15 minutes

# Préfixes Redis
PREFIX_ATTEMPTS = "rl:attempts:"
PREFIX_BLOCK = "rl:block:"


def _get_redis() -> redis.Redis | None:
    """Obtenir une connexion Redis. Retourne None si indisponible."""
    try:
        r = redis.from_url(settings.redis_url, decode_responses=True, socket_timeout=2)
        r.ping()
        return r
    except Exception as e:
        logger.warning(f"Redis indisponible pour le rate limiter: {e}")
        return None


def is_blocked(ip: str) -> tuple[bool, int]:
    """
    Vérifie si une IP est bloquée.
    Retourne (is_blocked, seconds_remaining).
    """
    r = _get_redis()
    if not r:
        return False, 0

    try:
        block_key = f"{PREFIX_BLOCK}{ip}"
        ttl = r.ttl(block_key)
        if ttl and ttl > 0:
            return True, ttl
        return False, 0
    except Exception:
        return False, 0


def record_failed_attempt(ip: str) -> tuple[bool, int]:
    """
    Enregistre une tentative échouée.
    Retourne (is_now_blocked, block_duration_seconds).
    """
    r = _get_redis()
    if not r:
        return False, 0

    try:
        import time
        now = time.time()
        attempts_key = f"{PREFIX_ATTEMPTS}{ip}"

        # Ajouter la tentative au sorted set (score = timestamp)
        r.zadd(attempts_key, {str(now): now})

        # Supprimer les entrées plus vieilles que 30 min
        r.zremrangebyscore(attempts_key, 0, now - WINDOW_TIER_3)

        # TTL sur la clé pour nettoyage automatique
        r.expire(attempts_key, WINDOW_TIER_3 + 60)

        # Compter les tentatives dans chaque fenêtre
        count_tier_1 = r.zcount(attempts_key, now - WINDOW_TIER_1, "+inf")
        count_tier_2 = r.zcount(attempts_key, now - WINDOW_TIER_2, "+inf")
        count_tier_3 = r.zcount(attempts_key, now - WINDOW_TIER_3, "+inf")

        # Déterminer le niveau de blocage
        block_duration = 0
        if count_tier_3 >= MAX_ATTEMPTS_TIER_3:
            block_duration = BLOCK_TIER_3
        elif count_tier_2 >= MAX_ATTEMPTS_TIER_2:
            block_duration = BLOCK_TIER_2
        elif count_tier_1 >= MAX_ATTEMPTS_TIER_1:
            block_duration = BLOCK_TIER_1

        if block_duration > 0:
            block_key = f"{PREFIX_BLOCK}{ip}"
            r.setex(block_key, block_duration, "1")
            logger.warning(f"IP {ip} bloquée pour {block_duration}s après {count_tier_3} tentatives")
            return True, block_duration

        return False, 0
    except Exception as e:
        logger.warning(f"Erreur rate limiter Redis: {e}")
        return False, 0


def record_success(ip: str):
    """Réinitialise le compteur après un login réussi."""
    r = _get_redis()
    if not r:
        return

    try:
        r.delete(f"{PREFIX_ATTEMPTS}{ip}")
        r.delete(f"{PREFIX_BLOCK}{ip}")
    except Exception:
        pass
