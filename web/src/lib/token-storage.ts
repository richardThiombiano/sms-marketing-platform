/**
 * Module centralisé pour la gestion des tokens d'authentification.
 *
 * Stratégie de sécurité :
 * - Les tokens sont stockés en localStorage (accès client pour les requêtes API)
 * - Un cookie Secure + SameSite=Strict est également posé (pour le middleware Next.js côté serveur)
 * - En production : cookie Secure (HTTPS obligatoire) + SameSite=Strict (anti-CSRF)
 * - En développement : SameSite=Lax (pour fonctionner sur localhost sans HTTPS)
 *
 * Note : pour une sécurité maximale avec cookies HttpOnly, il faudrait un proxy API
 * côté Next.js (route handler) qui gère les tokens. Ce module est le point unique
 * à modifier pour cette migration future.
 */

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

// Durée du cookie (7 jours — correspond à la durée du refresh token backend)
const COOKIE_MAX_AGE_DAYS = 7;

// Détection environnement
const isProduction = typeof window !== "undefined" && window.location.protocol === "https:";

// ─── Helpers cookies ────────────────────────────────────────────────────────

function setCookie(name: string, value: string, days: number): void {
  const maxAge = days * 24 * 60 * 60;
  const secure = isProduction ? "; Secure" : "";
  const sameSite = isProduction ? "Strict" : "Lax";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=${sameSite}${secure}`;
}

function deleteCookie(name: string): void {
  const secure = isProduction ? "; Secure" : "";
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Strict${secure}`;
}

// ─── API publique ───────────────────────────────────────────────────────────

function isClient(): boolean {
  return typeof window !== "undefined";
}

export const tokenStorage = {
  getAccessToken(): string | null {
    if (!isClient()) return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    if (!isClient()) return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setTokens(accessToken: string, refreshToken: string): void {
    if (!isClient()) return;

    // localStorage pour les requêtes API côté client
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

    // Cookie pour le middleware Next.js (vérification côté serveur)
    setCookie(ACCESS_TOKEN_KEY, accessToken, COOKIE_MAX_AGE_DAYS);
  },

  setAccessToken(accessToken: string): void {
    if (!isClient()) return;

    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    setCookie(ACCESS_TOKEN_KEY, accessToken, COOKIE_MAX_AGE_DAYS);
  },

  clearTokens(): void {
    if (!isClient()) return;

    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    deleteCookie(ACCESS_TOKEN_KEY);
  },

  hasToken(): boolean {
    return !!this.getAccessToken();
  },
};

export default tokenStorage;
