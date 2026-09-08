// ─── Pagination ─────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

// ─── Tenant ─────────────────────────────────────────────────────────────────

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  plan: string;
  sms_provider: string;
  is_active: boolean;
}

// ─── Contacts ───────────────────────────────────────────────────────────────

export interface Contact {
  id: string;
  phone: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  gender: string | null;
  birth_date: string | null;
  city: string | null;
  country: string | null;
  tags: string[];
  is_subscribed: boolean;
  created_at: string;
}

export interface ContactCreate {
  phone: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  gender?: string;
  birth_date?: string;
  city?: string;
  country?: string;
}

export interface ContactUpdate {
  phone?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  gender?: string;
  birth_date?: string;
  city?: string;
  country?: string;
  tags?: string[];
}

export interface ContactImportResult {
  message: string;
  imported: number;
  errors: number;
}

// ─── Groups ─────────────────────────────────────────────────────────────────

export interface Group {
  id: string;
  name: string;
  description: string | null;
  is_dynamic: boolean;
  members_count: number;
  contact_count: number;
  created_at: string;
}

export interface GroupCreate {
  name: string;
  description?: string;
  is_dynamic?: boolean;
}

export interface GroupUpdate {
  name: string;
  description?: string;
  is_dynamic?: boolean;
}

// ─── Campaigns ──────────────────────────────────────────────────────────────

export interface Campaign {
  id: string;
  name: string;
  content: string;
  type: string;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  target_group_id: string | null;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  total_clicked: number;
  is_ab_test: boolean;
  created_at: string;
}

export interface CampaignCreate {
  name: string;
  content: string;
  type: string;
  scheduled_at?: string;
  target_group_id?: string;
}

export interface CampaignUpdate {
  name: string;
  content: string;
  type: string;
  target_group_id?: string;
}

// ─── Messages ───────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  phone: string;
  content: string;
  type: string;
  status: string;
  provider: string | null;
  provider_id: string | null;
  provider_message_id: string | null;
  error_message: string | null;
  segments_count: number;
  cost: number | null;
  campaign_id: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
  contact_first_name: string | null;
  contact_last_name: string | null;
}

export interface MessageStatusCheck {
  message_id: string;
  status: string;
  provider_status: string | null;
  updated?: boolean;
  error?: string;
}

// ─── Templates ──────────────────────────────────────────────────────────────

export interface Template {
  id: string;
  name: string;
  content: string;
  category: string | null;
  variables: string[];
  is_active: boolean;
  created_at: string;
}

export interface TemplateCreate {
  name: string;
  content: string;
  category?: string;
  variables?: string[];
}

export interface TemplateUpdate {
  name?: string;
  content?: string;
  category?: string;
  variables?: string[];
}

// ─── Automations ────────────────────────────────────────────────────────────

export interface Automation {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  template_id: string | null;
  message_content: string | null;
  trigger_config: Record<string, any>;
  target_filters: Record<string, any> | null;
  last_run_at: string | null;
  next_run_at: string | null;
  total_sent: number;
  created_at: string | null;
}

export interface AutomationCreate {
  name: string;
  type: string;
  template_id?: string;
  message_content?: string;
  trigger_config?: Record<string, any>;
  target_filters?: Record<string, any>;
}

export interface AutomationUpdate {
  name?: string;
  type?: string;
  template_id?: string;
  message_content?: string;
  trigger_config?: Record<string, any>;
  target_filters?: Record<string, any>;
}

// ─── Notifications ──────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationsResponse {
  items: Notification[];
  total: number;
  unread_count: number;
}

// ─── SMS ────────────────────────────────────────────────────────────────────

export interface SmsBalance {
  amount: number;
  currency: string;
  source: string;
  provider: string;
  error?: string;
}

export interface SmsStats {
  period: string;
  summary: {
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    delivery_rate: number;
    by_type: {
      marketing: number;
      transactional: number;
      promotional: number;
      birthday: number;
      reminder: number;
    };
  };
  chart_data: { date: string; total: number; sent: number; failed: number }[];
}

export interface SmsSendResult {
  message_id: string;
  phone: string;
  status: string;
}

export interface SmsBulkResult {
  message: string;
  total_queued: number;
}

export interface SmsSendToGroupsResult {
  message: string;
  total_queued: number;
  groups_count: number;
}

// ─── Settings ───────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface TeamMember {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface TeamMemberCreate {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  role: string;
}

// ─── Admin ──────────────────────────────────────────────────────────────────

export interface AdminStats {
  total_tenants: number;
  active_tenants: number;
  total_users: number;
  total_contacts: number;
  total_messages: number;
  messages_sent: number;
  messages_failed: number;
  total_campaigns: number;
  total_automations: number;
}

export interface AdminTenant {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  plan: string;
  sms_provider: string;
  is_active: boolean;
  created_at: string | null;
}

export interface AdminTenantCreate {
  name: string;
  slug?: string;
  email: string;
  phone?: string;
  plan?: string;
  sms_provider?: string;
  smsbus_username?: string;
  smsbus_password?: string;
  smsbus_id?: string;
  smsbus_sender_id?: string;
  owner_first_name?: string;
  owner_last_name?: string;
  owner_email?: string;
  owner_password?: string;
}

export interface AdminTenantUpdate {
  name?: string;
  email?: string;
  phone?: string;
  plan?: string;
  sms_provider?: string;
  smsbus_username?: string;
  smsbus_password?: string;
  smsbus_id?: string;
  smsbus_sender_id?: string;
}

export interface AdminUserCreate {
  tenant_id: string;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  role: string;
}

export interface AdminUserUpdate {
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  is_active?: boolean;
  password?: string;
}

export interface TenantStats {
  tenant: {
    id: string;
    name: string;
    email: string;
    plan: string;
    balance: { amount: number | null; currency: string | null };
    sms_provider: string;
    is_active: boolean;
    created_at: string | null;
  };
  users: { total: number };
  contacts: { total: number; subscribed: number; unsubscribed: number };
  messages: { total: number; delivered: number; failed: number; delivery_rate: number };
  campaigns: { total: number; sent: number };
  groups: { total: number };
}

export interface WorkersStatus {
  sms_worker: { running: boolean; last_check?: string };
  automation_worker: { running: boolean; last_check?: string };
  scheduler: { running: boolean; last_check?: string };
}
