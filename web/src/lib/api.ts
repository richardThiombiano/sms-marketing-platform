import type {
  AuthTokens,
  User,
  Tenant,
  Contact,
  ContactCreate,
  ContactUpdate,
  ContactImportResult,
  Group,
  GroupCreate,
  GroupUpdate,
  Campaign,
  CampaignCreate,
  CampaignUpdate,
  Message,
  MessageStatusCheck,
  Template,
  TemplateCreate,
  TemplateUpdate,
  Automation,
  AutomationCreate,
  AutomationUpdate,
  Notification,
  NotificationsResponse,
  SmsBalance,
  SmsStats,
  SmsSendResult,
  SmsBulkResult,
  SmsSendToGroupsResult,
  Profile,
  TeamMember,
  TeamMemberCreate,
  AdminStats,
  AdminTenant,
  AdminTenantCreate,
  AdminTenantUpdate,
  AdminUserCreate,
  AdminUserUpdate,
  TenantStats,
  WorkersStatus,
  PaginatedResponse,
} from "./types";
import { tokenStorage } from "./token-storage";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1";

interface ApiError {
  detail: string | Array<{ loc: string[]; msg: string; type: string }>;
}

function formatApiError(error: ApiError): string {
  if (typeof error.detail === "string") {
    return error.detail;
  }
  if (Array.isArray(error.detail) && error.detail.length > 0) {
    // Erreurs de validation Pydantic — extraire les messages lisibles
    return error.detail
      .map((e) => {
        const field = e.loc?.[e.loc.length - 1] || "champ";
        const fieldLabels: Record<string, string> = {
          type: "Type de message",
          phone: "Numéro de téléphone",
          content: "Message",
          phones: "Numéros de téléphone",
          group_ids: "Groupes",
        };
        const label = fieldLabels[field] || field;
        return `${label} : valeur invalide`;
      })
      .join(". ");
  }
  return "Une erreur est survenue";
}

class ApiClient {
  private baseUrl: string;
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    return tokenStorage.getAccessToken();
  }

  private getRefreshToken(): string | null {
    return tokenStorage.getRefreshToken();
  }

  private logout() {
    if (typeof window === "undefined") return;
    tokenStorage.clearTokens();
    window.location.href = "/auth/login";
  }

  private async attemptRefresh(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      tokenStorage.setAccessToken(data.access_token);
      if (data.refresh_token) {
        tokenStorage.setTokens(data.access_token, data.refresh_token);
      }
      return data.access_token;
    } catch {
      return null;
    }
  }

  private async handleTokenRefresh(): Promise<string | null> {
    // Si un refresh est déjà en cours, attendre son résultat (évite les appels multiples)
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.attemptRefresh();
    const newToken = await this.refreshPromise;
    this.isRefreshing = false;
    this.refreshPromise = null;

    return newToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    // Si 401, tenter un refresh puis rejouer la requête
    if (response.status === 401) {
      const newToken = await this.handleTokenRefresh();

      if (!newToken) {
        this.logout();
        throw new Error("Session expirée");
      }

      // Rejouer la requête avec le nouveau token
      headers["Authorization"] = `Bearer ${newToken}`;
      const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      if (!retryResponse.ok) {
        if (retryResponse.status === 401) {
          this.logout();
          throw new Error("Session expirée");
        }
        const error: ApiError = await retryResponse
          .json()
          .catch(() => ({ detail: `Erreur ${retryResponse.status}` }));
        throw new Error(formatApiError(error));
      }

      return retryResponse.json();
    }

    if (!response.ok) {
      const error: ApiError = await response
        .json()
        .catch(() => ({ detail: `Erreur ${response.status}` }));
      throw new Error(formatApiError(error));
    }

    return response.json();
  }

  // ─── Auth ───────────────────────────────────────────────────────────────────

  async login(identifier: string, password: string) {
    // Appel direct sans passer par le mécanisme de refresh/logout
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });

    if (!response.ok) {
      const error: ApiError = await response
        .json()
        .catch(() => ({ detail: "Email ou mot de passe incorrect" }));
      throw new Error(formatApiError(error));
    }

    return response.json() as Promise<AuthTokens>;
  }

  async forgotPassword(email: string) {
    return this.request<{ message: string; reset_token?: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string) {
    return this.request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, new_password: newPassword }),
    });
  }

  async refreshToken(refreshToken: string) {
    return this.request<AuthTokens>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  }

  async getMe() {
    return this.request<User>("/auth/me");
  }

  // ─── Campaigns ──────────────────────────────────────────────────────────────

  async getCampaigns(params?: { page?: number; page_size?: number }) {
    const query = params
      ? "?" + new URLSearchParams(params as Record<string, string>).toString()
      : "";
    return this.request<PaginatedResponse<Campaign>>(`/campaigns${query}`);
  }

  async getCampaign(id: string) {
    return this.request<Campaign>(`/campaigns/${id}`);
  }

  async createCampaign(data: CampaignCreate) {
    return this.request<Campaign>("/campaigns", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateCampaign(id: string, data: CampaignUpdate) {
    return this.request<Campaign>(`/campaigns/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async sendCampaign(id: string) {
    return this.request<Campaign>(`/campaigns/${id}/send`, { method: "POST" });
  }

  async scheduleCampaign(id: string, scheduledAt: string) {
    return this.request<Campaign>(`/campaigns/${id}/schedule?scheduled_at=${scheduledAt}`, { method: "POST" });
  }

  async cancelCampaign(id: string) {
    return this.request<Campaign>(`/campaigns/${id}/cancel`, { method: "POST" });
  }

  // ─── Contacts ───────────────────────────────────────────────────────────────

  async getContacts(params?: { page?: number; page_size?: number; search?: string }) {
    const query = params
      ? "?" + new URLSearchParams(params as Record<string, string>).toString()
      : "";
    return this.request<PaginatedResponse<Contact>>(`/contacts${query}`);
  }

  async createContact(data: ContactCreate) {
    return this.request<Contact>("/contacts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateContact(id: string, data: ContactUpdate) {
    return this.request<Contact>(`/contacts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteContact(id: string) {
    return this.request<void>(`/contacts/${id}`, { method: "DELETE" });
  }

  // ─── Contact Notes ──────────────────────────────────────────────────────────

  async getInteractionTypes() {
    return this.request<{ value: string; label: string; icon: string; color: string }[]>("/contacts/interaction-types");
  }

  async getContactNotes(contactId: string, params?: { page?: number; page_size?: number; interaction_type?: string }) {
    const query = params
      ? "?" + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ).toString()
      : "";
    return this.request<PaginatedResponse<{ id: string; contact_id: string; user_id: string; user_name: string; interaction_type: string; content: string; created_at: string }>>(`/contacts/${contactId}/notes${query}`);
  }

  async createContactNote(contactId: string, data: { interaction_type: string; content: string }) {
    return this.request<{ id: string; contact_id: string; user_id: string; user_name: string; interaction_type: string; content: string; created_at: string }>(`/contacts/${contactId}/notes`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deleteContactNote(contactId: string, noteId: string) {
    return this.request<void>(`/contacts/${contactId}/notes/${noteId}`, { method: "DELETE" });
  }

  async importContacts(file: File) {
    const token = tokenStorage.getAccessToken();
    const formData = new FormData();
    formData.append("file", file);

    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${this.baseUrl}/contacts/import`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: `Erreur ${response.status}` }));
      throw new Error(formatApiError(error));
    }

    return response.json() as Promise<ContactImportResult>;
  }

  // ─── Groups ─────────────────────────────────────────────────────────────────

  async getGroups(params?: { page?: number; page_size?: number }) {
    const query = params
      ? "?" + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ).toString()
      : "";
    return this.request<PaginatedResponse<Group>>(`/groups${query}`);
  }

  async createGroup(data: GroupCreate) {
    return this.request<Group>("/groups", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateGroup(id: string, data: GroupUpdate) {
    return this.request<Group>(`/groups/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteGroup(id: string) {
    return this.request<void>(`/groups/${id}`, { method: "DELETE" });
  }

  async getGroupMembers(groupId: string, params?: { page?: number; page_size?: number }) {
    const query = params
      ? "?" + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ).toString()
      : "";
    return this.request<PaginatedResponse<Contact>>(`/groups/${groupId}/members${query}`);
  }

  async addGroupMembers(groupId: string, contactIds: string[]) {
    return this.request<{ message: string; added: number }>(`/groups/${groupId}/members`, {
      method: "POST",
      body: JSON.stringify(contactIds),
    });
  }

  async removeGroupMember(groupId: string, contactId: string) {
    return this.request<{ message: string }>(`/groups/${groupId}/members/${contactId}`, {
      method: "DELETE",
    });
  }

  // ─── Templates ──────────────────────────────────────────────────────────────

  async getTemplates(params?: { page?: number; page_size?: number; category?: string }) {
    const query = params
      ? "?" + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ).toString()
      : "";
    return this.request<PaginatedResponse<Template>>(`/templates${query}`);
  }

  async createTemplate(data: TemplateCreate) {
    return this.request<Template>("/templates", { method: "POST", body: JSON.stringify(data) });
  }

  async updateTemplate(id: string, data: TemplateUpdate) {
    return this.request<Template>(`/templates/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  }

  async deleteTemplate(id: string) {
    return this.request<void>(`/templates/${id}`, { method: "DELETE" });
  }

  // ─── Automations ────────────────────────────────────────────────────────────

  async getAutomations(params?: { page?: number; page_size?: number }) {
    const query = params
      ? "?" + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ).toString()
      : "";
    return this.request<PaginatedResponse<Automation>>(`/automations${query}`);
  }

  async createAutomation(data: AutomationCreate) {
    return this.request<Automation>("/automations", { method: "POST", body: JSON.stringify(data) });
  }

  async updateAutomation(id: string, data: AutomationUpdate) {
    return this.request<Automation>(`/automations/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  }

  async toggleAutomation(id: string) {
    return this.request<{ message: string; id: string; is_active: boolean }>(`/automations/${id}/toggle`, { method: "PATCH" });
  }

  async deleteAutomation(id: string) {
    return this.request<void>(`/automations/${id}`, { method: "DELETE" });
  }

  // ─── Notifications ──────────────────────────────────────────────────────────

  async getNotifications(params?: { page?: number; page_size?: number; unread_only?: boolean }) {
    const query = params
      ? "?" + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ).toString()
      : "";
    return this.request<NotificationsResponse>(`/notifications${query}`);
  }

  async markAllNotificationsRead() {
    return this.request<{ message: string }>("/notifications/read-all", { method: "POST" });
  }

  async markNotificationRead(id: string) {
    return this.request<Notification>(`/notifications/${id}/read`, { method: "POST" });
  }

  // ─── Settings ─────────────────────────────────────────────────────────────

  async getProfile() {
    return this.request<Profile>("/settings/profile");
  }

  async updateProfile(data: { first_name?: string; last_name?: string; email?: string }) {
    return this.request<Profile>("/settings/profile", { method: "PATCH", body: JSON.stringify(data) });
  }

  async changePassword(data: { current_password: string; new_password: string }) {
    return this.request<{ message: string }>("/settings/profile/password", { method: "POST", body: JSON.stringify(data) });
  }

  async getCompany() {
    return this.request<Tenant>("/settings/company");
  }

  async updateCompany(data: { name?: string; email?: string; phone?: string }) {
    return this.request<Tenant>("/settings/company", { method: "PATCH", body: JSON.stringify(data) });
  }

  async getTeam() {
    return this.request<{ items: TeamMember[]; total: number }>("/settings/team");
  }

  async addTeamMember(data: TeamMemberCreate) {
    return this.request<TeamMember>("/settings/team", { method: "POST", body: JSON.stringify(data) });
  }

  async updateTeamMember(userId: string, data: { first_name?: string; last_name?: string; role?: string; is_active?: boolean }) {
    return this.request<TeamMember>(`/settings/team/${userId}`, { method: "PATCH", body: JSON.stringify(data) });
  }

  async removeTeamMember(userId: string) {
    return this.request<void>(`/settings/team/${userId}`, { method: "DELETE" });
  }

  // ─── Tenant ─────────────────────────────────────────────────────────────────

  async getTenant() {
    return this.request<Tenant>("/tenant");
  }

  // ─── WhatsApp Embedded Signup ───────────────────────────────────────────────

  async getWhatsAppSignupConfig() {
    return this.request<{ app_id: string; config_id: string; api_version: string }>("/whatsapp/embedded-signup/config");
  }

  async getWhatsAppConnectionStatus() {
    return this.request<{
      is_connected: boolean;
      whatsapp_enabled: boolean;
      phone_number_id: string | null;
      business_account_id: string | null;
      display_phone_number: string | null;
      verified_name: string | null;
    }>("/whatsapp/embedded-signup/status");
  }

  async submitWhatsAppSignupCode(code: string) {
    return this.request<{
      message: string;
      waba_id: string;
      phone_number_id: string;
      display_phone_number: string | null;
      verified_name: string | null;
    }>("/whatsapp/embedded-signup/callback", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  }

  async disconnectWhatsApp() {
    return this.request<{ message: string }>("/whatsapp/embedded-signup/disconnect", {
      method: "POST",
    });
  }

  // ─── SMS ────────────────────────────────────────────────────────────────────

  async getSmsBalance() {
    return this.request<SmsBalance>("/sms/balance");
  }

  async getSmsStats(period: string = "30d") {
    return this.request<SmsStats>(`/sms/stats?period=${period}`);
  }

  async checkMessageStatus(messageId: string) {
    return this.request<MessageStatusCheck>(`/sms/messages/${messageId}/status`);
  }

  async estimateSmsCost(phone: string, content: string) {
    return this.request<{
      segments: number;
      encoding: string;
      char_count: number;
      chars_per_segment: number;
      unit_price: number | null;
      total_cost: number | null;
      country_code: string | null;
      country_name: string | null;
      is_exact: boolean;
    }>("/sms/estimate-cost", {
      method: "POST",
      body: JSON.stringify({ phone, content }),
    });
  }

  async getMessages(params?: { page?: number; page_size?: number; status?: string; type?: string; phone?: string }) {
    const query = params
      ? "?" + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ).toString()
      : "";
    return this.request<PaginatedResponse<Message>>(`/sms/messages${query}`);
  }

  async sendSms(data: { phone: string; content: string; type?: string }) {
    return this.request<SmsSendResult>("/sms/send", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async sendBulkSms(data: { phones: string[]; content: string; type?: string }) {
    return this.request<SmsBulkResult>("/sms/send-bulk", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async sendToGroups(data: { group_ids: string[]; content: string; type?: string }) {
    return this.request<SmsSendToGroupsResult>("/sms/send-to-groups", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ─── Admin ──────────────────────────────────────────────────────────────────

  async getAdminStats() {
    return this.request<AdminStats>("/admin/stats");
  }

  async getAdminTenants(params?: { page?: number; page_size?: number; search?: string; plan?: string; provider?: string; is_active?: boolean }) {
    const query = params
      ? "?" + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ).toString()
      : "";
    return this.request<PaginatedResponse<AdminTenant>>(`/admin/tenants${query}`);
  }

  async getAdminUsers(params?: { page?: number; page_size?: number; search?: string; role?: string; is_active?: boolean }) {
    const query = params
      ? "?" + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ).toString()
      : "";
    return this.request<PaginatedResponse<User>>(`/admin/users${query}`);
  }

  async createAdminTenant(data: AdminTenantCreate) {
    return this.request<AdminTenant>("/admin/tenants", { method: "POST", body: JSON.stringify(data) });
  }

  async updateAdminTenant(tenantId: string, data: AdminTenantUpdate) {
    return this.request<AdminTenant>(`/admin/tenants/${tenantId}`, { method: "PATCH", body: JSON.stringify(data) });
  }

  async getTenantBalance(tenantId: string) {
    return this.request<{ tenant_id: string; tenant_name: string; amount: number | null; currency: string | null; provider: string; error?: string }>(`/admin/tenants/${tenantId}/balance`);
  }

  async toggleTenant(tenantId: string) {
    return this.request<{ message: string; tenant_id: string; is_active: boolean }>(`/admin/tenants/${tenantId}/toggle`, { method: "PATCH" });
  }

  async getTenantStats(tenantId: string) {
    return this.request<TenantStats>(`/admin/tenants/${tenantId}/stats`);
  }

  async createAdminUser(data: AdminUserCreate) {
    return this.request<User>("/admin/users", { method: "POST", body: JSON.stringify(data) });
  }

  async updateAdminUser(userId: string, data: AdminUserUpdate) {
    return this.request<User>(`/admin/users/${userId}`, { method: "PATCH", body: JSON.stringify(data) });
  }

  async deleteAdminUser(userId: string) {
    return this.request<void>(`/admin/users/${userId}`, { method: "DELETE" });
  }

  async toggleAdminUser(userId: string) {
    return this.request<{ message: string; user_id: string; is_active: boolean }>(`/admin/users/${userId}/toggle`, { method: "PATCH" });
  }

  async getWorkersStatus() {
    return this.request<WorkersStatus>("/admin/workers");
  }

  // ─── Registration Management ────────────────────────────────────────────────

  async register(data: { company_name: string; email: string; phone: string; username: string; first_name: string; last_name: string; password: string; sender_id: string }) {
    const response = await fetch(`${this.baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: `Erreur ${response.status}` }));
      throw new Error(typeof error.detail === "string" ? error.detail : "Erreur lors de l'inscription");
    }
    return response.json();
  }

  async getPendingRegistrations(params?: { page?: number; page_size?: number }) {
    const query = params
      ? "?" + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ).toString()
      : "";
    return this.request<any>(`/admin/pending-registrations${query}`);
  }

  async approveRegistration(tenantId: string) {
    return this.request<any>(`/admin/pending-registrations/${tenantId}/approve`, { method: "POST" });
  }

  async rejectRegistration(tenantId: string) {
    return this.request<any>(`/admin/pending-registrations/${tenantId}/reject`, { method: "POST" });
  }

  // ─── Billing ─────────────────────────────────────────────────────────────────

  async getSubscription() {
    return this.request<any>("/billing/subscription");
  }

  async getPaymentInfo() {
    return this.request<{
      merchant_code: string;
      merchant_name: string;
      qr_code_url: string | null;
      subscription_amount: number;
      currency: string;
      instructions: string;
    }>("/billing/payment-info");
  }

  async getRecharges(params?: { page?: number; page_size?: number }) {
    const query = params
      ? "?" + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ).toString()
      : "";
    return this.request<any>(`/billing/recharges${query}`);
  }

  async getBillingPayments(params?: { page?: number; page_size?: number }) {
    const query = params
      ? "?" + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ).toString()
      : "";
    return this.request<any>(`/billing/payments${query}`);
  }

  async createPaymentRequest(data: { type: string; amount: number; reference: string }) {
    return this.request<any>("/billing/payment-request", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ─── Admin Billing ──────────────────────────────────────────────────────────

  async getAdminBillingStats() {
    return this.request<{
      active_subscriptions: number;
      expired_subscriptions: number;
      monthly_revenue: number;
      monthly_recharges: number;
      pending_recharges: number;
      currency: string;
    }>("/admin/billing/stats");
  }

  async getAdminSubscriptions(params?: { page?: number; page_size?: number; status?: string; tenant_id?: string }) {
    const query = params
      ? "?" + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ).toString()
      : "";
    return this.request<any>(`/admin/billing/subscriptions${query}`);
  }

  async activateSubscription(data: { tenant_id: string; months?: number; payment_method?: string; payment_reference?: string; notes?: string }) {
    return this.request<any>("/admin/billing/subscriptions/activate", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async renewSubscription(subscriptionId: string, data: { months?: number; payment_method?: string; payment_reference?: string; notes?: string }) {
    return this.request<any>(`/admin/billing/subscriptions/${subscriptionId}/renew`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async cancelSubscription(subscriptionId: string) {
    return this.request<any>(`/admin/billing/subscriptions/${subscriptionId}/cancel`, {
      method: "POST",
    });
  }

  async getAdminRecharges(params?: { page?: number; page_size?: number; status?: string; tenant_id?: string }) {
    const query = params
      ? "?" + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ).toString()
      : "";
    return this.request<any>(`/admin/billing/recharges${query}`);
  }

  async registerRecharge(data: { tenant_id: string; amount: number; method?: string; reference?: string; notes?: string }) {
    return this.request<any>("/admin/billing/recharges", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async confirmRecharge(rechargeId: string, data?: { notes?: string }) {
    return this.request<any>(`/admin/billing/recharges/${rechargeId}/confirm`, {
      method: "PATCH",
      body: JSON.stringify(data || {}),
    });
  }

  async rejectRecharge(rechargeId: string, data?: { notes?: string }) {
    return this.request<any>(`/admin/billing/recharges/${rechargeId}/reject`, {
      method: "PATCH",
      body: JSON.stringify(data || {}),
    });
  }

  async getAdminPayments(params?: { page?: number; page_size?: number; type?: string; status?: string; tenant_id?: string }) {
    const query = params
      ? "?" + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ).toString()
      : "";
    return this.request<any>(`/admin/billing/payments${query}`);
  }

  async getAdminPendingPayments(params?: { page?: number; page_size?: number }) {
    const query = params
      ? "?" + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ).toString()
      : "";
    return this.request<any>(`/admin/billing/pending-payments${query}`);
  }

  async confirmPayment(paymentId: string) {
    return this.request<any>(`/admin/billing/payments/${paymentId}/confirm`, {
      method: "POST",
    });
  }

  async rejectPayment(paymentId: string) {
    return this.request<any>(`/admin/billing/payments/${paymentId}/reject`, {
      method: "POST",
    });
  }

  // ─── WhatsApp ───────────────────────────────────────────────────────────────

  async getWhatsAppStats() {
    return this.request<{
      total_messages: number;
      sent: number;
      delivered: number;
      read: number;
      failed: number;
      delivery_rate: number;
      read_rate: number;
      approved_templates: number;
    }>("/whatsapp/stats");
  }

  async getWhatsAppMessages(params?: { page?: number; page_size?: number; status?: string; phone?: string }) {
    const query = params
      ? "?" + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ).toString()
      : "";
    return this.request<PaginatedResponse<any>>(`/whatsapp/messages${query}`);
  }

  async sendWhatsAppTemplate(data: { phone: string; template_name: string; language_code?: string; components?: any[] }) {
    return this.request<{ message_id: string; phone: string; status: string; template_name: string }>("/whatsapp/send", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async sendWhatsAppText(data: { phone: string; content: string }) {
    return this.request<{ message_id: string; phone: string; status: string }>("/whatsapp/send-text", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async sendWhatsAppBulk(data: { phones?: string[]; group_id?: string; template_name: string; language_code?: string; components?: any[] }) {
    return this.request<{ total: number; sent: number; failed: number; template_name: string }>("/whatsapp/send-bulk", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getWhatsAppTemplates(params?: { page?: number; page_size?: number; status?: string; category?: string }) {
    const query = params
      ? "?" + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ).toString()
      : "";
    return this.request<PaginatedResponse<any>>(`/whatsapp/templates${query}`);
  }

  async createWhatsAppTemplate(data: { name: string; category: string; language?: string; components: any[]; body_text?: string; header_text?: string; footer_text?: string }) {
    return this.request<any>("/whatsapp/templates", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async syncWhatsAppTemplates() {
    return this.request<{ synced: number; created: number; total_from_meta: number; message: string }>("/whatsapp/templates/sync", {
      method: "POST",
    });
  }

  async deleteWhatsAppTemplate(id: string) {
    return this.request<{ message: string }>(`/whatsapp/templates/${id}`, { method: "DELETE" });
  }
}

export const api = new ApiClient(API_BASE_URL);
export default api;
