import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes qui nécessitent une authentification
const protectedPaths = ["/dashboard", "/campaigns", "/contacts", "/groups", "/messages", "/templates", "/automations", "/credits", "/billing", "/settings", "/admin"];

// Routes publiques (accessibles sans token)
const publicPaths = ["/auth/login", "/auth/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Vérifier si la route est protégée
  const isProtectedRoute = protectedPaths.some((path) => pathname.startsWith(path));
  const isPublicRoute = publicPaths.some((path) => pathname.startsWith(path));

  // Récupérer le token depuis les cookies ou le header
  // Note : localStorage n'est pas accessible dans le middleware (côté serveur).
  // On utilise un cookie "access_token" comme source de vérité côté serveur.
  const token = request.cookies.get("access_token")?.value;

  // Route protégée sans token → redirection vers login
  if (isProtectedRoute && !token) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Route publique avec token → redirection vers dashboard
  if (isPublicRoute && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match toutes les routes sauf :
     * - _next/static (fichiers statiques)
     * - _next/image (optimisation d'images)
     * - favicon.ico
     * - fichiers publics (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
