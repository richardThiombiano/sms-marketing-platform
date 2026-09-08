"""
Tests automatisés de l'API SMS Marketing Platform.
Teste tous les endpoints principaux dans l'ordre logique.

Usage:
    cd backend
    python ../tests/test_api.py
"""

import httpx
import asyncio
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000/v1"

# ============================================
# CONFIGURATION
# ============================================

SUPERADMIN_EMAIL = "admin@sms-pro.com"
SUPERADMIN_PASSWORD = "Admin@2024!"

# Données de test pour un tenant
TEST_TENANT = {
    "name": "DigiCommerce Test",
    "email": "contact@digicommerce-test.bf",
    "phone": "+22670123456",
    "plan": "pro",
    "sms_credits": 500,
    "sms_provider": "3mi",
    "smsbus_username": "digicommerce_test",
    "smsbus_password": "test_password_3mi",
    "smsbus_id": "DIGI_TEST_001",
    "smsbus_sender_id": "DigiTest",
    "owner_first_name": "Aminata",
    "owner_last_name": "Koné",
    "owner_email": "aminata@digicommerce-test.bf",
    "owner_password": "OwnerPass123!",
}

# Contact de test
TEST_CONTACT = {
    "phone": "22676837604",
    "first_name": "Ibrahim",
    "last_name": "Diallo",
    "email": "ibrahim@test.com",
    "city": "Ouagadougou",
    "country": "Burkina Faso",
    "tags": ["vip", "test"],
}

# Template de test
TEST_TEMPLATE = {
    "name": "Promo Test",
    "content": "Bonjour {{first_name}}, profitez de -{{discount}}% ! Code: {{promo_code}}",
    "category": "marketing",
    "variables": ["first_name", "discount", "promo_code"],
}

# Campagne de test
TEST_CAMPAIGN = {
    "name": "Campagne Test",
    "content": "Bonjour ! Ceci est un test SMS Pro.",
    "type": "marketing",
}


# ============================================
# HELPERS
# ============================================

def print_header(title: str):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def print_result(method: str, endpoint: str, status_code: int, success: bool, data=None):
    icon = "✅" if success else "❌"
    print(f"  {icon} {method} {endpoint} → {status_code}")
    if data and not success:
        print(f"     Erreur: {data}")


class TestState:
    """Stocke les données entre les tests."""
    superadmin_token: str = ""
    owner_token: str = ""
    tenant_id: str = ""
    contact_id: str = ""
    template_id: str = ""
    campaign_id: str = ""


state = TestState()


# ============================================
# TESTS
# ============================================

async def test_health():
    """Test: Health check."""
    print_header("HEALTH CHECK")
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{BASE_URL.replace('/v1', '')}/health")
        success = r.status_code == 200
        print_result("GET", "/health", r.status_code, success)
        if not success:
            print("     ⚠️  Le serveur ne répond pas. Vérifiez qu'il tourne sur le port 8000.")
            return False
        return True


async def test_superadmin_login():
    """Test: Connexion superadmin."""
    print_header("1. AUTHENTIFICATION SUPERADMIN")
    async with httpx.AsyncClient() as client:
        r = await client.post(f"{BASE_URL}/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD,
        })
        success = r.status_code == 200
        print_result("POST", "/auth/login (superadmin)", r.status_code, success)

        if success:
            data = r.json()
            state.superadmin_token = data["access_token"]
            print(f"     Token: {state.superadmin_token[:30]}...")
        else:
            print(f"     {r.json()}")
            print("     ⚠️  Exécutez d'abord: python ../tests/create_superadmin.py")
        return success


async def test_register_blocked():
    """Test: Inscription bloquée pour les entreprises."""
    async with httpx.AsyncClient() as client:
        r = await client.post(f"{BASE_URL}/auth/register", json={
            "company_name": "Test",
            "email": "test@test.com",
            "password": "Test1234!",
            "first_name": "Test",
            "last_name": "User",
        })
        success = r.status_code == 403
        print_result("POST", "/auth/register (bloqué)", r.status_code, success)
        return success


async def test_create_tenant():
    """Test: Créer un tenant via superadmin."""
    print_header("2. CRÉATION TENANT (SUPERADMIN)")
    headers = {"Authorization": f"Bearer {state.superadmin_token}"}

    async with httpx.AsyncClient() as client:
        r = await client.post(f"{BASE_URL}/admin/tenants", json=TEST_TENANT, headers=headers)
        success = r.status_code == 201
        print_result("POST", "/admin/tenants", r.status_code, success, r.json() if not success else None)

        if success:
            data = r.json()
            state.tenant_id = data["tenant_id"]
            print(f"     Tenant ID: {state.tenant_id}")
            print(f"     Slug: {data['slug']}")
            print(f"     Crédits: {data['sms_credits']}")
            print(f"     Provider: {data['sms_provider']}")
        return success


async def test_list_tenants():
    """Test: Lister les tenants."""
    headers = {"Authorization": f"Bearer {state.superadmin_token}"}

    async with httpx.AsyncClient() as client:
        r = await client.get(f"{BASE_URL}/admin/tenants", headers=headers)
        success = r.status_code == 200
        print_result("GET", "/admin/tenants", r.status_code, success)

        if success:
            data = r.json()
            print(f"     Total entreprises: {data['total']}")
        return success


async def test_owner_login():
    """Test: Connexion du owner de l'entreprise."""
    print_header("3. CONNEXION ENTREPRISE (OWNER)")
    async with httpx.AsyncClient() as client:
        r = await client.post(f"{BASE_URL}/auth/login", json={
            "email": TEST_TENANT["owner_email"],
            "password": TEST_TENANT["owner_password"],
        })
        success = r.status_code == 200
        print_result("POST", "/auth/login (owner)", r.status_code, success)

        if success:
            data = r.json()
            state.owner_token = data["access_token"]
            print(f"     Token: {state.owner_token[:30]}...")
        return success


async def test_get_me():
    """Test: Profil utilisateur."""
    headers = {"Authorization": f"Bearer {state.owner_token}"}

    async with httpx.AsyncClient() as client:
        r = await client.get(f"{BASE_URL}/auth/me", headers=headers)
        success = r.status_code == 200
        print_result("GET", "/auth/me", r.status_code, success)

        if success:
            data = r.json()
            print(f"     Utilisateur: {data['first_name']} {data['last_name']}")
            print(f"     Rôle: {data['role']}")
        return success


async def test_get_tenant():
    """Test: Infos tenant."""
    headers = {"Authorization": f"Bearer {state.owner_token}"}

    async with httpx.AsyncClient() as client:
        r = await client.get(f"{BASE_URL}/tenant", headers=headers)
        success = r.status_code == 200
        print_result("GET", "/tenant", r.status_code, success)

        if success:
            data = r.json()
            print(f"     Entreprise: {data['name']}")
            print(f"     Plan: {data['plan']}")
            print(f"     Crédits: {data['sms_credits']}")
            print(f"     Provider: {data['sms_provider']}")
        return success


async def test_contacts():
    """Test: CRUD Contacts."""
    print_header("4. CONTACTS")
    headers = {"Authorization": f"Bearer {state.owner_token}"}

    async with httpx.AsyncClient() as client:
        # Créer un contact
        r = await client.post(f"{BASE_URL}/contacts", json=TEST_CONTACT, headers=headers)
        success = r.status_code == 201
        print_result("POST", "/contacts", r.status_code, success)

        if success:
            data = r.json()
            state.contact_id = data["id"]
            print(f"     Contact ID: {state.contact_id}")

        # Lister les contacts
        r = await client.get(f"{BASE_URL}/contacts", headers=headers)
        print_result("GET", "/contacts", r.status_code, r.status_code == 200)

        if r.status_code == 200:
            data = r.json()
            print(f"     Total: {data['total']} contact(s)")

        # Récupérer un contact
        r = await client.get(f"{BASE_URL}/contacts/{state.contact_id}", headers=headers)
        print_result("GET", f"/contacts/{state.contact_id[:8]}...", r.status_code, r.status_code == 200)

        # Modifier un contact
        r = await client.patch(
            f"{BASE_URL}/contacts/{state.contact_id}",
            json={"city": "Bobo-Dioulasso", "tags": ["vip", "fidele"]},
            headers=headers,
        )
        print_result("PATCH", f"/contacts/{state.contact_id[:8]}...", r.status_code, r.status_code == 200)

        # Rechercher
        r = await client.get(f"{BASE_URL}/contacts?search=Ibrahim", headers=headers)
        print_result("GET", "/contacts?search=Ibrahim", r.status_code, r.status_code == 200)

        return success


async def test_templates():
    """Test: CRUD Templates."""
    print_header("5. TEMPLATES")
    headers = {"Authorization": f"Bearer {state.owner_token}"}

    # Note: l'endpoint templates n'est pas encore implémenté dans l'API
    # Ceci est un placeholder pour quand il sera ajouté
    print("  ⏭️  Templates endpoint à implémenter (api/templates.py)")
    return True


async def test_campaigns():
    """Test: CRUD Campagnes."""
    print_header("6. CAMPAGNES")
    headers = {"Authorization": f"Bearer {state.owner_token}"}

    async with httpx.AsyncClient() as client:
        # Créer une campagne
        r = await client.post(f"{BASE_URL}/campaigns", json=TEST_CAMPAIGN, headers=headers)
        success = r.status_code == 201
        print_result("POST", "/campaigns", r.status_code, success)

        if success:
            data = r.json()
            state.campaign_id = data["id"]
            print(f"     Campaign ID: {state.campaign_id}")
            print(f"     Statut: {data['status']}")

        # Lister les campagnes
        r = await client.get(f"{BASE_URL}/campaigns", headers=headers)
        print_result("GET", "/campaigns", r.status_code, r.status_code == 200)

        # Détails d'une campagne
        r = await client.get(f"{BASE_URL}/campaigns/{state.campaign_id}", headers=headers)
        print_result("GET", f"/campaigns/{state.campaign_id[:8]}...", r.status_code, r.status_code == 200)

        # Programmer une campagne
        scheduled = (datetime.now() + timedelta(hours=1)).isoformat()
        r = await client.post(
            f"{BASE_URL}/campaigns/{state.campaign_id}/schedule?scheduled_at={scheduled}",
            headers=headers,
        )
        print_result("POST", f"/campaigns/.../schedule", r.status_code, r.status_code == 200)

        # Annuler la campagne
        r = await client.post(
            f"{BASE_URL}/campaigns/{state.campaign_id}/cancel",
            headers=headers,
        )
        print_result("POST", f"/campaigns/.../cancel", r.status_code, r.status_code == 200)

        return success


async def test_sms_send():
    """Test: Envoi SMS direct."""
    print_header("7. ENVOI SMS")
    headers = {"Authorization": f"Bearer {state.owner_token}"}

    async with httpx.AsyncClient() as client:
        # Envoi unitaire
        r = await client.post(f"{BASE_URL}/sms/send", json={
            "phone": "22676837604",
            "content": "Test SMS Pro - Ceci est un message de test.",
            "type": "transactional",
        }, headers=headers)
        success = r.status_code == 202
        print_result("POST", "/sms/send", r.status_code, success)

        if success:
            data = r.json()
            print(f"     Message ID: {data['message_id']}")
            print(f"     Statut: {data['status']}")
            print(f"     Crédits utilisés: {data['credits_used']}")

        # Envoi bulk
        r = await client.post(f"{BASE_URL}/sms/send-bulk", json={
            "phones": ["22676837604", "22670000001"],
            "content": "Test bulk SMS Pro !",
            "type": "marketing",
        }, headers=headers)
        print_result("POST", "/sms/send-bulk", r.status_code, r.status_code == 202)

        if r.status_code == 202:
            data = r.json()
            print(f"     SMS en queue: {data['total_queued']}")
            print(f"     Crédits restants: {data['credits_remaining']}")

        return success


async def test_admin_operations():
    """Test: Opérations admin."""
    print_header("8. OPÉRATIONS ADMIN")
    headers = {"Authorization": f"Bearer {state.superadmin_token}"}

    async with httpx.AsyncClient() as client:
        # Changer le provider
        r = await client.patch(
            f"{BASE_URL}/admin/tenants/{state.tenant_id}/provider",
            json={"sms_provider": "3mi"},
            headers=headers,
        )
        print_result("PATCH", "/admin/tenants/.../provider", r.status_code, r.status_code == 200)

        # Ajouter des crédits
        r = await client.patch(
            f"{BASE_URL}/admin/tenants/{state.tenant_id}/credits?amount=1000",
            headers=headers,
        )
        success = r.status_code == 200
        print_result("PATCH", "/admin/tenants/.../credits (+1000)", r.status_code, success)

        if success:
            data = r.json()
            print(f"     Nouveau solde: {data['sms_credits']} crédits")

        # Vérifier le solde 3MI
        r = await client.get(f"{BASE_URL}/smsbus/balance", headers=headers)
        print_result("GET", "/smsbus/balance", r.status_code, r.status_code == 200)

        if r.status_code == 200:
            data = r.json()
            print(f"     Solde 3MI: {data['amount']} {data['currency']}")

        return success


async def test_cleanup():
    """Test: Nettoyage (optionnel)."""
    print_header("9. NETTOYAGE")
    headers = {"Authorization": f"Bearer {state.owner_token}"}

    async with httpx.AsyncClient() as client:
        # Désinscrire le contact
        r = await client.post(
            f"{BASE_URL}/contacts/{state.contact_id}/unsubscribe",
            headers=headers,
        )
        print_result("POST", "/contacts/.../unsubscribe", r.status_code, r.status_code == 200)

        # Supprimer le contact
        r = await client.delete(
            f"{BASE_URL}/contacts/{state.contact_id}",
            headers=headers,
        )
        print_result("DELETE", f"/contacts/{state.contact_id[:8]}...", r.status_code, r.status_code == 204)

    return True


# ============================================
# RUNNER
# ============================================

async def run_all_tests():
    """Exécuter tous les tests dans l'ordre."""
    print("\n")
    print("  ╔══════════════════════════════════════════╗")
    print("  ║   SMS PRO - TESTS API BACKEND           ║")
    print("  ║   Base URL: http://localhost:8000/v1     ║")
    print("  ╚══════════════════════════════════════════╝")

    results = []

    # Health check
    if not await test_health():
        print("\n❌ Serveur non disponible. Arrêt des tests.")
        return

    # Tests séquentiels
    tests = [
        test_superadmin_login,
        test_register_blocked,
        test_create_tenant,
        test_list_tenants,
        test_owner_login,
        test_get_me,
        test_get_tenant,
        test_contacts,
        test_templates,
        test_campaigns,
        test_sms_send,
        test_admin_operations,
        test_cleanup,
    ]

    passed = 0
    failed = 0

    for test in tests:
        try:
            result = await test()
            if result:
                passed += 1
            else:
                failed += 1
        except Exception as e:
            failed += 1
            print(f"  ❌ ERREUR: {e}")

    # Résumé
    print(f"\n{'='*60}")
    print(f"  RÉSUMÉ: {passed} passés, {failed} échoués, {passed + failed} total")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    asyncio.run(run_all_tests())
