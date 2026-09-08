/**
 * Rate limiter côté client pour protéger contre le brute force.
 *
 * Stratégie :
 * - Après 5 tentatives échouées : blocage de 30 secondes
 * - Après 10 tentatives échouées : blocage de 2 minutes
 * - Après 15 tentatives échouées : blocage de 5 minutes
 * - Les compteurs sont stockés en sessionStorage (reset à la fermeture du navigateur)
 *
 * Note : ceci est une protection côté client uniquement. Le backend doit aussi
 * implémenter son propre rate limiting (ce qui est déjà en place via le middleware).
 */

const STORAGE_KEY = "login_attempts";

interface AttemptData {
  count: number;
  lastAttempt: number;
  blockedUntil: number | null;
}

function getAttemptData(): AttemptData {
  if (typeof window === "undefined") return { count: 0, lastAttempt: 0, blockedUntil: null };

  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { count: 0, lastAttempt: 0, blockedUntil: null };
}

function setAttemptData(data: AttemptData): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

/**
 * Vérifie si le login est actuellement bloqué.
 * Retourne le nombre de secondes restantes, ou 0 si pas bloqué.
 */
export function getBlockedSeconds(): number {
  const data = getAttemptData();
  if (!data.blockedUntil) return 0;

  const remaining = Math.ceil((data.blockedUntil - Date.now()) / 1000);
  if (remaining <= 0) {
    // Le blocage est terminé
    return 0;
  }
  return remaining;
}

/**
 * Enregistre une tentative de login échouée.
 * Retourne le nombre de secondes de blocage (0 si pas encore bloqué).
 */
export function recordFailedAttempt(): number {
  const data = getAttemptData();
  data.count += 1;
  data.lastAttempt = Date.now();

  let blockDuration = 0;

  if (data.count >= 15) {
    blockDuration = 5 * 60; // 5 minutes
  } else if (data.count >= 10) {
    blockDuration = 2 * 60; // 2 minutes
  } else if (data.count >= 5) {
    blockDuration = 30; // 30 secondes
  }

  if (blockDuration > 0) {
    data.blockedUntil = Date.now() + blockDuration * 1000;
  }

  setAttemptData(data);
  return blockDuration;
}

/**
 * Réinitialise le compteur après un login réussi.
 */
export function resetAttempts(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
}

/**
 * Retourne le nombre de tentatives échouées.
 */
export function getAttemptCount(): number {
  return getAttemptData().count;
}
