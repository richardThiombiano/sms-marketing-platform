from datetime import datetime

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from mangum import Mangum
from sqlalchemy import select

from app.api.auth import router as auth_router
from app.api.contacts import router as contacts_router
from app.api.campaigns import router as campaigns_router
from app.api.groups import router as groups_router
from app.api.templates import router as templates_router
from app.api.automations import router as automations_router
from app.api.settings import router as settings_router
from app.api.notifications import router as notifications_router
from app.api.sms import router as sms_router
from app.api.tenant import router as tenant_router
from app.api.admin import router as admin_router
from app.api.admin_billing import router as admin_billing_router
from app.api.billing import router as billing_router
from app.api.webhooks_3mi import router as webhooks_3mi_router, smsbus_router
from app.api.whatsapp import router as whatsapp_router
from app.api.webhooks_whatsapp import router as webhooks_whatsapp_router
from app.api.whatsapp_signup import router as whatsapp_signup_router
from app.api.contact_notes import router as contact_notes_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="API SMS Platforme Marketing",
    # Swagger/Redoc désactivés en production
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url="/redoc" if settings.environment != "production" else None,
    openapi_url="/openapi.json" if settings.environment != "production" else None,
)

# CORS — restreint aux origines autorisées
# CORS — restreint aux origines autorisées
# En dev : localhost. En prod : votre domaine uniquement.
cors_origins = [origin.strip() for origin in settings.allowed_origins.split(",") if origin.strip()]

if settings.environment == "production":
    # En production : origines strictes, pas de wildcard
    cors_origins = [o for o in cors_origins if o != "*" and o.startswith("https://")]
    if not cors_origins:
        cors_origins = []  # Aucune origine autorisée si mal configuré
    cors_credentials = True
    cors_methods = ["GET", "POST", "PUT", "PATCH", "DELETE"]
else:
    # En dev : permissif pour faciliter le développement
    if not cors_origins or cors_origins == ["*"]:
        cors_origins = ["*"]
        cors_credentials = False
    else:
        cors_credentials = True
    cors_methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=cors_credentials,
    allow_methods=cors_methods,
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
    expose_headers=["X-Subscription-Expired"],
    max_age=600,  # Cache preflight pendant 10 minutes
)


# ============================================
# MIDDLEWARE : Headers de sécurité HTTP
# ============================================


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    """Ajouter les headers de sécurité HTTP à toutes les réponses."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if settings.environment == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handler pour les HTTPException avec headers CORS explicites."""
    origin = request.headers.get("origin", "*")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization,Accept,Origin,X-Requested-With",
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all pour renvoyer un JSON propre avec les headers CORS même en cas d'erreur 500."""
    import traceback
    traceback.print_exc()
    origin = request.headers.get("origin", "*")
    return JSONResponse(
        status_code=500,
        content={"detail": "Erreur interne du serveur"},
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization,Accept,Origin,X-Requested-With",
        },
    )


# ============================================
# MIDDLEWARE : Vérification abonnement actif
# ============================================

# Routes exemptées de la vérification d'abonnement
SUBSCRIPTION_EXEMPT_PREFIXES = (
    "/v1/auth",
    "/v1/admin",
    "/v1/billing",
    "/v1/tenant",
    "/v1/notifications",
    "/v1/settings",
    "/v1/sms/balance",
    "/v1/webhooks",
    "/v1/smsbus",
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
)


@app.middleware("http")
async def check_subscription_middleware(request: Request, call_next):
    """
    Middleware qui vérifie l'abonnement actif pour les routes protégées.
    Si l'abonnement est expiré :
    - Les requêtes GET sont autorisées (lecture du dashboard)
    - Les requêtes POST/PUT/PATCH/DELETE sont bloquées (actions)
    Routes exemptées : auth, admin, billing, tenant, notifications, settings, webhooks, health.
    """
    path = request.url.path

    # Laisser passer les routes exemptées et les OPTIONS (CORS preflight)
    if request.method == "OPTIONS" or any(path.startswith(prefix) for prefix in SUBSCRIPTION_EXEMPT_PREFIXES):
        return await call_next(request)

    # Laisser passer les GET — le dashboard peut charger en lecture seule
    if request.method == "GET":
        return await call_next(request)

    # Laisser passer les requêtes sans Authorization (seront rejetées par get_current_user)
    auth_header = request.headers.get("authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return await call_next(request)

    # Décoder le token pour vérifier le rôle et le tenant
    from app.core.security import decode_token
    token = auth_header.split(" ", 1)[1]
    payload = decode_token(token)

    if payload is None:
        return await call_next(request)

    # Les superadmins ne sont pas soumis à la vérification
    user_role = payload.get("role")
    if user_role == "superadmin":
        return await call_next(request)

    # Vérifier l'abonnement du tenant pour les actions (POST/PUT/PATCH/DELETE)
    tenant_id = payload.get("tenant_id")
    if tenant_id:
        from app.core.database import async_session
        from app.models import Subscription

        async with async_session() as db:
            now = datetime.utcnow()
            sub_result = await db.execute(
                select(Subscription).where(
                    Subscription.tenant_id == tenant_id,
                    Subscription.status == "active",
                    Subscription.end_date >= now,
                ).limit(1)
            )
            subscription = sub_result.scalar_one_or_none()

            if subscription is None:
                origin = request.headers.get("origin", "*")
                return JSONResponse(
                    status_code=403,
                    content={
                        "detail": "Votre abonnement a expiré. Veuillez renouveler votre abonnement pour continuer à utiliser la plateforme.",
                        "code": "SUBSCRIPTION_EXPIRED",
                    },
                    headers={
                        "Access-Control-Allow-Origin": origin,
                        "Access-Control-Allow-Methods": "*",
                        "Access-Control-Allow-Headers": "Content-Type,Authorization,Accept,Origin,X-Requested-With",
                        "X-Subscription-Expired": "true",
                    },
                )

    return await call_next(request)

# Routes
app.include_router(auth_router, prefix="/v1")
app.include_router(tenant_router, prefix="/v1")
app.include_router(admin_router, prefix="/v1")
app.include_router(admin_billing_router, prefix="/v1")
app.include_router(billing_router, prefix="/v1")
app.include_router(contacts_router, prefix="/v1")
app.include_router(campaigns_router, prefix="/v1")
app.include_router(groups_router, prefix="/v1")
app.include_router(templates_router, prefix="/v1")
app.include_router(automations_router, prefix="/v1")
app.include_router(settings_router, prefix="/v1")
app.include_router(notifications_router, prefix="/v1")
app.include_router(sms_router, prefix="/v1")
app.include_router(webhooks_3mi_router, prefix="/v1")
app.include_router(smsbus_router, prefix="/v1")
app.include_router(whatsapp_router, prefix="/v1")
app.include_router(webhooks_whatsapp_router, prefix="/v1")
app.include_router(whatsapp_signup_router, prefix="/v1")
app.include_router(contact_notes_router, prefix="/v1")


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": settings.app_version}


# Handler Lambda (Mangum adapter)
handler = Mangum(app, lifespan="off")
