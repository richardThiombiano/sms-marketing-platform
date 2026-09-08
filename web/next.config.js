/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== 'production';

// Origine de l'API (schéma + domaine) dérivée de NEXT_PUBLIC_API_URL.
// Permet d'autoriser dynamiquement l'API dans la CSP (connect-src), quel
// que soit le domaine déployé, sans valeur en dur.
let apiOrigin = '';
try {
  if (process.env.NEXT_PUBLIC_API_URL) {
    apiOrigin = new URL(process.env.NEXT_PUBLIC_API_URL).origin;
  }
} catch (e) {
  apiOrigin = '';
}

const nextConfig = {
  output: 'standalone',

  // Headers de sécurité HTTP
  async headers() {
    // En développement, on applique une CSP permissive pour ne pas
    // interférer avec le hot-reload et webpack de Next.js
    const cspValue = isDev
      ? [
          "default-src 'self'",
          "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://connect.facebook.net",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https:",
          "font-src 'self' data:",
          "connect-src 'self' http://localhost:* ws://localhost:* https://connect.facebook.net https://graph.facebook.com https://*.facebook.com",
          "frame-src https://www.facebook.com https://web.facebook.com",
          "object-src 'self' data:",
          "base-uri 'self'",
        ].join('; ')
      : [
          "default-src 'self'",
          "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://connect.facebook.net",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https:",
          "font-src 'self' data:",
          `connect-src 'self' ${apiOrigin} https://connect.facebook.net https://graph.facebook.com https://*.facebook.com`,
          "frame-src https://www.facebook.com https://web.facebook.com",
          "frame-ancestors 'none'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; ');

    return [
      {
        // Appliquer à toutes les routes
        source: '/(.*)',
        headers: [
          // Empêcher l'embedding dans des iframes (clickjacking)
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Empêcher le sniffing de MIME type
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Protection XSS (navigateurs anciens)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Contrôler les informations envoyées dans le Referer
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Forcer HTTPS (HSTS) — 1 an
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          // Restreindre les APIs du navigateur (caméra, micro, géoloc, etc.)
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: cspValue,
          },
          // Empêcher le DNS prefetching non voulu
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
