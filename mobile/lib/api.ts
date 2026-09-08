import { File, UploadTask, UploadType } from 'expo-file-system';
import type { UploadResult } from 'expo-file-system';
import Storage from './storage';
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
  NotificationsResponse,
  SmsBalance,
  SmsStats,
  SmsSendResult,
  SmsBulkResult,
  SmsSendToGroupsResult,
  Profile,
  TeamMember,
  AdminStats,
  AdminTenant,
  TenantStats,
  PaginatedResponse,
} from './types';

// const API_BASE_URL = __DEV__
//   ? 'http://localhost:8000/v1'
//   : 'https://api.smspro.com/v1';

// const API_BASE_URL = 'http://localhost:8000/v1';

const API_BASE_URL = 'https://un8duodw9i.execute-api.eu-west-1.amazonaws.com/production/v1'

interface ApiError {
  detail: string | Array<{ loc: string[]; msg: string; type: string }>;
}

function formatApiError(error: ApiError): string {
  if (typeof error.detail === 'string') {
    return error.detail;
  }
  if (Array.isArray(error.detail) && error.detail.length > 0) {
    return error.detail
      .map((e) => {
        const field = e.loc?.[e.loc.length - 1] || 'champ';
        const fieldLabels: Record<string, string> = {
          type: 'Type de message',
          phone: 'Numéro de téléphone',
          content: 'Message',
          phones: 'Numéros de téléphone',
          group_ids: 'Groupes',
        };
        const label = fieldLabels[field] || field;
        return `${label} : valeur invalide`;
      })
      .join('. ');
  }
  return 'Une erreur est survenue';
}

class ApiClient {
  private baseUrl: string;
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;
  private onUnauthorized: (() => void) | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setOnUnauthorized(callback: () => void) {
    this.onUnauthorized = callback;
  }

  private async getToken(): Promise<string | null> {
    return Storage.getItem('access_token');
  }

  private async getRefreshToken(): Promise<string | null> {
    return Storage.getItem('refresh_token');
  }

  private async logout() {
    await Storage.multiRemove(['access_token', 'refresh_token']);
    this.onUnauthorized?.();
  }

  private async attemptRefresh(): Promise<string | null> {
    const refreshToken = await this.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      await Storage.setItem('access_token', data.access_token);
      if (data.refresh_token) {
        await Storage.setItem('refresh_token', data.refresh_token);
      }
      return data.access_token;
    } catch {
      return null;
    }
  }

  private async handleTokenRefresh(): Promise<string | null> {
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

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    // Si 401, tenter un refresh puis rejouer la requête
    if (response.status === 401) {
      const newToken = await this.handleTokenRefresh();

      if (!newToken) {
        await this.logout();
        throw new Error('Session expirée');
      }

      headers['Authorization'] = `Bearer ${newToken}`;
      const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      if (!retryResponse.ok) {
        if (retryResponse.status === 401) {
          await this.logout();
          throw new Error('Session expirée');
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

  // ============================================
  // AUTH
  // ============================================

  async login(identifier: string, password: string) {
    return this.request<AuthTokens>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
  }

  async forgotPassword(email: string) {
    return this.request<{ message: string; reset_token?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string) {
    return this.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPassword }),
    });
  }

  async refreshTokenRequest(refreshToken: string) {
    return this.request<AuthTokens>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  }

  async getMe() {
    return this.request<User>('/auth/me');
  }

  // ============================================
  // CAMPAIGNS
  // ============================================

  async getCampaigns(params?: { page?: number; page_size?: number }) {
    const query = params
      ? '?' + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ).toString()
      : '';
    return this.request<PaginatedResponse<Campaign>>(`/campaigns${query}`);
  }

  async getCampaign(id: string) {
    return this.request<Campaign>(`/campaigns/${id}`);
  }

  async createCampaign(data: CampaignCreate) {
    return this.request<Campaign>('/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCampaign(id: string, data: CampaignUpdate) {
    return this.request<Campaign>(`/campaigns/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  async sendCampaign(id: string) {
    return this.request<Campaign>(`/campaigns/${id}/send`, { method: 'POST' });
  }

  async scheduleCampaign(id: string, scheduledAt: string) {
    return this.request<Campaign>(`/campaigns/${id}/schedule?scheduled_at=${scheduledAt}`, { method: 'POST' });
  }

  async cancelCampaign(id: string) {
    return this.request<Campaign>(`/campaigns/${id}/cancel`, { method: 'POST' });
  }

  // ============================================
  // CONTACTS
  // ============================================

  async getContacts(params?: { page?: number; page_size?: number; search?: string }) {
    const query = params
      ? '?' + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ).toString()
      : '';
    return this.request<PaginatedResponse<Contact>>(`/contacts${query}`);
  }

  async createContact(data: ContactCreate) {
    return this.request<Contact>('/contacts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateContact(id: string, data: ContactUpdate) {
    return this.request<Contact>(`/contacts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteContact(id: string) {
    return this.request<void>(`/contacts/${id}`, { method: 'DELETE' });
  }

  async importContacts(fileUri: string, fileName: string, mimeType: string): Promise<{
    message: string;
    imported: number;
    skipped: number;
    errors: string[];
    total_rows: number;
  }> {
    const token = await this.getToken();

    const file = new File(fileUri);
    const uploadTask = new UploadTask(file, `${this.baseUrl}/contacts/import`, {
      httpMethod: 'POST',
      uploadType: UploadType.MULTIPART,
      fieldName: 'file',
      mimeType,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      parameters: {},
    });

    const result = await uploadTask.uploadAsync();

    if (result.status === 401) {
      // Token refresh and retry
      const newToken = await this.handleTokenRefresh();
      if (!newToken) {
        await this.logout();
        throw new Error('Session expirée');
      }
      const retryFile = new File(fileUri);
      const retryTask = new UploadTask(retryFile, `${this.baseUrl}/contacts/import`, {
        httpMethod: 'POST',
        uploadType: UploadType.MULTIPART,
        fieldName: 'file',
        mimeType,
        headers: { Authorization: `Bearer ${newToken}` },
        parameters: {},
      });
      const retryResult = await retryTask.uploadAsync();
      if (retryResult.status >= 400) {
        const error = JSON.parse(retryResult.body || '{}');
        throw new Error(error.detail || `Erreur ${retryResult.status}`);
      }
      return JSON.parse(retryResult.body);
    }

    if (result.status >= 400) {
      const error = JSON.parse(result.body || '{}');
      throw new Error(error.detail || `Erreur ${result.status}`);
    }

    return JSON.parse(result.body);
  }

  // ============================================
  // GROUPS
  // ============================================

  async getGroups(params?: { page?: number; page_size?: number }) {
    const query = params
      ? '?' + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ).toString()
      : '';
    return this.request<PaginatedResponse<Group>>(`/groups${query}`);
  }

  async createGroup(data: GroupCreate) {
    return this.request<Group>('/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateGroup(id: string, data: GroupUpdate) {
    return this.request<Group>(`/groups/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteGroup(id: string) {
    return this.request<void>(`/groups/${id}`, { method: 'DELETE' });
  }

  async getGroupMembers(groupId: string, params?: { page?: number; page_size?: number }) {
    const query = params
      ? '?' + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ).toString()
      : '';
    return this.request<PaginatedResponse<Contact>>(`/groups/${groupId}/members${query}`);
  }

  async addGroupMembers(groupId: string, contactIds: string[]) {
    return this.request<{ message: string; added: number }>(`/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify(contactIds),
    });
  }

  async removeGroupMember(groupId: string, contactId: string) {
    return this.request<{ message: string }>(`/groups/${groupId}/members/${contactId}`, {
      method: 'DELETE',
    });
  }

  // ============================================
  // TEMPLATES
  // ============================================

  async getTemplates(params?: { page?: number; page_size?: number; category?: string }) {
    const query = params
      ? '?' + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ).toString()
      : '';
    return this.request<PaginatedResponse<Template>>(`/templates${query}`);
  }

  async createTemplate(data: TemplateCreate) {
    return this.request<Template>('/templates', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateTemplate(id: string, data: TemplateUpdate) {
    return this.request<Template>(`/templates/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  async deleteTemplate(id: string) {
    return this.request<void>(`/templates/${id}`, { method: 'DELETE' });
  }

  // ============================================
  // AUTOMATIONS
  // ============================================

  async getAutomations(params?: { page?: number; page_size?: number }) {
    const query = params
      ? '?' + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ).toString()
      : '';
    return this.request<PaginatedResponse<Automation>>(`/automations${query}`);
  }

  async createAutomation(data: AutomationCreate) {
    return this.request<Automation>('/automations', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateAutomation(id: string, data: AutomationUpdate) {
    return this.request<Automation>(`/automations/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  async toggleAutomation(id: string) {
    return this.request<{ message: string; id: string; is_active: boolean }>(`/automations/${id}/toggle`, { method: 'PATCH' });
  }

  async deleteAutomation(id: string) {
    return this.request<void>(`/automations/${id}`, { method: 'DELETE' });
  }

  // ============================================
  // SMS
  // ============================================

  async getSmsBalance() {
    return this.request<SmsBalance>('/sms/balance');
  }

  async getSmsStats(period: string = '30d') {
    return this.request<SmsStats>(`/sms/stats?period=${period}`);
  }

  async getMessages(params?: { page?: number; page_size?: number; status?: string; type?: string; phone?: string }) {
    const query = params
      ? '?' + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ).toString()
      : '';
    return this.request<PaginatedResponse<Message>>(`/sms/messages${query}`);
  }

  async sendSms(data: { phone: string; content: string; type?: string }) {
    return this.request<SmsSendResult>('/sms/send', { method: 'POST', body: JSON.stringify(data) });
  }

  async sendBulkSms(data: { phones: string[]; content: string; type?: string }) {
    return this.request<SmsBulkResult>('/sms/send-bulk', { method: 'POST', body: JSON.stringify(data) });
  }

  async sendToGroups(data: { group_ids: string[]; content: string; type?: string }) {
    return this.request<SmsSendToGroupsResult>('/sms/send-to-groups', { method: 'POST', body: JSON.stringify(data) });
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
    }>('/sms/estimate-cost', {
      method: 'POST',
      body: JSON.stringify({ phone, content }),
    });
  }

  // ============================================
  // CONTACT NOTES
  // ============================================

  async getInteractionTypes() {
    return this.request<{ value: string; label: string; icon: string; color: string }[]>('/contacts/interaction-types');
  }

  async getContactNotes(contactId: string, params?: { page?: number; page_size?: number; interaction_type?: string }) {
    const query = params
      ? '?' + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ).toString()
      : '';
    return this.request<PaginatedResponse<{ id: string; contact_id: string; user_id: string; user_name: string; interaction_type: string; content: string; created_at: string }>>(`/contacts/${contactId}/notes${query}`);
  }

  async createContactNote(contactId: string, data: { interaction_type: string; content: string }) {
    return this.request<{ id: string; contact_id: string; user_id: string; user_name: string; interaction_type: string; content: string; created_at: string }>(`/contacts/${contactId}/notes`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteContactNote(contactId: string, noteId: string) {
    return this.request<void>(`/contacts/${contactId}/notes/${noteId}`, { method: 'DELETE' });
  }

  // ============================================
  // SETTINGS
  // ============================================

  async getProfile() {
    return this.request<Profile>('/settings/profile');
  }

  async updateProfile(data: { first_name?: string; last_name?: string; email?: string }) {
    return this.request<Profile>('/settings/profile', { method: 'PATCH', body: JSON.stringify(data) });
  }

  async changePassword(data: { current_password: string; new_password: string }) {
    return this.request<{ message: string }>('/settings/profile/password', { method: 'POST', body: JSON.stringify(data) });
  }

  async getCompany() {
    return this.request<Tenant>('/settings/company');
  }

  async updateCompany(data: { name?: string; email?: string; phone?: string }) {
    return this.request<Tenant>('/settings/company', { method: 'PATCH', body: JSON.stringify(data) });
  }

  async getTeam() {
    return this.request<{ items: TeamMember[]; total: number }>('/settings/team');
  }

  async addTeamMember(data: { username: string; email: string; first_name: string; last_name: string; password: string; role: string }) {
    return this.request<TeamMember>('/settings/team', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateTeamMember(userId: string, data: { first_name?: string; last_name?: string; role?: string; is_active?: boolean }) {
    return this.request<TeamMember>(`/settings/team/${userId}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  async removeTeamMember(userId: string) {
    return this.request<void>(`/settings/team/${userId}`, { method: 'DELETE' });
  }

  // ============================================
  // NOTIFICATIONS
  // ============================================

  async getNotifications(params?: { page?: number; page_size?: number; unread_only?: boolean }) {
    const query = params
      ? '?' + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ).toString()
      : '';
    return this.request<NotificationsResponse>(`/notifications${query}`);
  }

  async markAllNotificationsRead() {
    return this.request<{ message: string }>('/notifications/read-all', { method: 'POST' });
  }

  async markNotificationRead(id: string) {
    return this.request<{ message: string }>(`/notifications/${id}/read`, { method: 'POST' });
  }

  // ============================================
  // TENANT
  // ============================================

  async getTenant() {
    return this.request<Tenant>('/tenant');
  }

  // ============================================
  // ADMIN
  // ============================================

  async getAdminStats() {
    return this.request<AdminStats>('/admin/stats');
  }

  async getAdminTenants(params?: { page?: number; page_size?: number; search?: string; is_active?: boolean }) {
    const query = params
      ? '?' + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ).toString()
      : '';
    return this.request<PaginatedResponse<AdminTenant>>(`/admin/tenants${query}`);
  }

  async getAdminUsers(params?: { page?: number; page_size?: number; search?: string; role?: string; is_active?: boolean }) {
    const query = params
      ? '?' + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ).toString()
      : '';
    return this.request<PaginatedResponse<User>>(`/admin/users${query}`);
  }

  async createAdminTenant(data: any) {
    return this.request<AdminTenant>('/admin/tenants', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateAdminTenant(tenantId: string, data: {
    name?: string;
    email?: string;
    phone?: string;
    plan?: string;
    sms_provider?: string;
    smsbus_username?: string;
    smsbus_password?: string;
    smsbus_id?: string;
    smsbus_sender_id?: string;
  }) {
    return this.request<AdminTenant>(`/admin/tenants/${tenantId}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  async getTenantBalance(tenantId: string) {
    return this.request<{ tenant_id: string; tenant_name: string; amount: number | null; currency: string | null; provider: string; error?: string }>(`/admin/tenants/${tenantId}/balance`);
  }

  async toggleTenant(tenantId: string) {
    return this.request<{ message: string; tenant_id: string; is_active: boolean }>(`/admin/tenants/${tenantId}/toggle`, { method: 'PATCH' });
  }

  async getTenantStats(tenantId: string) {
    return this.request<TenantStats>(`/admin/tenants/${tenantId}/stats`);
  }

  async createAdminUser(data: {
    tenant_id: string;
    email: string;
    first_name: string;
    last_name: string;
    password: string;
    role: string;
  }) {
    return this.request<User>('/admin/users', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateAdminUser(userId: string, data: {
    email?: string;
    first_name?: string;
    last_name?: string;
    role?: string;
    is_active?: boolean;
    password?: string;
  }) {
    return this.request<User>(`/admin/users/${userId}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  async deleteAdminUser(userId: string) {
    return this.request<void>(`/admin/users/${userId}`, { method: 'DELETE' });
  }

  async toggleAdminUser(userId: string) {
    return this.request<{ message: string; user_id: string; is_active: boolean }>(`/admin/users/${userId}/toggle`, { method: 'PATCH' });
  }

  async getWorkersStatus() {
    return this.request<any>('/admin/workers');
  }

  // ============================================
  // REGISTRATION
  // ============================================

  async register(data: { company_name: string; email: string; phone: string; username: string; first_name: string; last_name: string; password: string; sender_id: string }) {
    return this.request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPendingRegistrations(params?: { page?: number; page_size?: number }) {
    const query = params
      ? '?' + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ).toString()
      : '';
    return this.request<any>(`/admin/pending-registrations${query}`);
  }

  async approveRegistration(tenantId: string) {
    return this.request<any>(`/admin/pending-registrations/${tenantId}/approve`, { method: 'POST' });
  }

  async rejectRegistration(tenantId: string) {
    return this.request<any>(`/admin/pending-registrations/${tenantId}/reject`, { method: 'POST' });
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
    }>('/whatsapp/stats');
  }

  async getWhatsAppMessages(params?: { page?: number; page_size?: number; status?: string; phone?: string }) {
    const query = params
      ? '?' + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ).toString()
      : '';
    return this.request<PaginatedResponse<any>>(`/whatsapp/messages${query}`);
  }

  async sendWhatsAppTemplate(data: { phone: string; template_name: string; language_code?: string; components?: any[] }) {
    return this.request<{ message_id: string; phone: string; status: string; template_name: string }>('/whatsapp/send', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async sendWhatsAppText(data: { phone: string; content: string }) {
    return this.request<{ message_id: string; phone: string; status: string }>('/whatsapp/send-text', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async sendWhatsAppBulk(data: { phones?: string[]; group_id?: string; template_name: string; language_code?: string; components?: any[] }) {
    return this.request<{ total: number; sent: number; failed: number; template_name: string }>('/whatsapp/send-bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getWhatsAppTemplates(params?: { page?: number; page_size?: number; status?: string; category?: string }) {
    const query = params
      ? '?' + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ).toString()
      : '';
    return this.request<PaginatedResponse<any>>(`/whatsapp/templates${query}`);
  }

  async syncWhatsAppTemplates() {
    return this.request<{ synced: number; created: number; total_from_meta: number; message: string }>('/whatsapp/templates/sync', {
      method: 'POST',
    });
  }

  async deleteWhatsAppTemplate(id: string) {
    return this.request<{ message: string }>(`/whatsapp/templates/${id}`, { method: 'DELETE' });
  }

  // ============================================
  // ADMIN BILLING
  // ============================================

  async getAdminBillingStats() {
    return this.request<{
      active_subscriptions: number;
      expired_subscriptions: number;
      monthly_revenue: number;
      monthly_recharges: number;
      pending_recharges: number;
      currency: string;
    }>('/admin/billing/stats');
  }

  async getAdminSubscriptions(params?: { page?: number; page_size?: number; status?: string; tenant_id?: string }) {
    const query = params
      ? '?' + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ).toString()
      : '';
    return this.request<PaginatedResponse<any>>(`/admin/billing/subscriptions${query}`);
  }

  async activateSubscription(data: { tenant_id: string; months?: number; payment_method?: string; payment_reference?: string; notes?: string }) {
    return this.request<any>('/admin/billing/subscriptions/activate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async renewSubscription(subscriptionId: string, data: { months?: number; payment_method?: string; payment_reference?: string; notes?: string }) {
    return this.request<any>(`/admin/billing/subscriptions/${subscriptionId}/renew`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async cancelSubscription(subscriptionId: string) {
    return this.request<any>(`/admin/billing/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
    });
  }

  async getAdminRecharges(params?: { page?: number; page_size?: number; status?: string; tenant_id?: string }) {
    const query = params
      ? '?' + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ).toString()
      : '';
    return this.request<PaginatedResponse<any>>(`/admin/billing/recharges${query}`);
  }

  async registerRecharge(data: { tenant_id: string; amount: number; method?: string; reference?: string; notes?: string }) {
    return this.request<any>('/admin/billing/recharges', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async confirmRecharge(rechargeId: string, data?: { notes?: string }) {
    return this.request<any>(`/admin/billing/recharges/${rechargeId}/confirm`, {
      method: 'PATCH',
      body: JSON.stringify(data || {}),
    });
  }

  async rejectRecharge(rechargeId: string, data?: { notes?: string }) {
    return this.request<any>(`/admin/billing/recharges/${rechargeId}/reject`, {
      method: 'PATCH',
      body: JSON.stringify(data || {}),
    });
  }

  async getAdminPendingPayments(params?: { page?: number; page_size?: number }) {
    const query = params
      ? '?' + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ).toString()
      : '';
    return this.request<PaginatedResponse<any>>(`/admin/billing/pending-payments${query}`);
  }

  async confirmPayment(paymentId: string) {
    return this.request<any>(`/admin/billing/payments/${paymentId}/confirm`, {
      method: 'POST',
    });
  }

  async rejectPayment(paymentId: string) {
    return this.request<any>(`/admin/billing/payments/${paymentId}/reject`, {
      method: 'POST',
    });
  }

  // ============================================
  // BILLING
  // ============================================

  async getSubscription() {
    return this.request<any>('/billing/subscription');
  }

  async getPaymentInfo() {
    return this.request<{
      merchant_code: string;
      merchant_name: string;
      qr_code_url: string | null;
      subscription_amount: number;
      currency: string;
      instructions: string;
    }>('/billing/payment-info');
  }

  async getBillingPayments(params?: { page?: number; page_size?: number }) {
    const query = params
      ? '?' + new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]))
        ).toString()
      : '';
    return this.request<any>(`/billing/payments${query}`);
  }

  async createPaymentRequest(data: { type: string; amount: number; reference: string }) {
    return this.request<any>('/billing/payment-request', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
export default api;
