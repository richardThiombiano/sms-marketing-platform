import { create } from 'zustand';
import Storage from './storage';
import { api } from './api';

interface User {
  id: string;
  username: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface SmsBalance {
  amount: number;
  currency: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  plan: string;
  sms_provider: string;
  is_active: boolean;
}

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  smsBalance: SmsBalance | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  fetchTenant: () => Promise<void>;
  fetchSmsBalance: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tenant: null,
  smsBalance: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (identifier: string, password: string) => {
    const response = await api.login(identifier, password);
    await Storage.setItem('access_token', response.access_token);
    await Storage.setItem('refresh_token', response.refresh_token);
    set({ isAuthenticated: true });

    // Fetch user info after login
    await get().fetchUser();
    await get().fetchTenant();
    await get().fetchSmsBalance();
  },

  logout: async () => {
    await Storage.multiRemove(['access_token', 'refresh_token']);
    set({
      user: null,
      tenant: null,
      smsBalance: null,
      isAuthenticated: false,
    });
  },

  fetchUser: async () => {
    try {
      const user = await api.getMe();
      set({ user });
    } catch {
      // silently fail
    }
  },

  fetchTenant: async () => {
    try {
      const tenant = await api.getTenant();
      set({ tenant });
    } catch {
      // silently fail
    }
  },

  fetchSmsBalance: async () => {
    try {
      const balance = await api.getSmsBalance();
      set({ smsBalance: { amount: balance.amount, currency: balance.currency } });
    } catch {
      // silently fail
    }
  },

  initialize: async () => {
    set({ isLoading: true });
    try {
      const token = await Storage.getItem('access_token');
      if (token) {
        const user = await api.getMe();
        set({ user, isAuthenticated: true });

        // Fetch additional data in parallel (non-blocking failures)
        const [tenant, balance] = await Promise.allSettled([
          api.getTenant(),
          api.getSmsBalance(),
        ]);
        if (tenant.status === 'fulfilled') set({ tenant: tenant.value });
        if (balance.status === 'fulfilled') set({ smsBalance: { amount: balance.value.amount, currency: balance.value.currency } });
      } else {
        set({ isAuthenticated: false });
      }
    } catch (error: any) {
      // Only clear auth if it's a session/auth error, not a network error
      if (error?.message === 'Session expirée' || error?.message?.includes('401')) {
        await Storage.multiRemove(['access_token', 'refresh_token']);
        set({ user: null, tenant: null, smsBalance: null, isAuthenticated: false });
      } else {
        // Network error or other — check if we have stored credentials
        const token = await Storage.getItem('access_token');
        if (!token) {
          set({ user: null, tenant: null, smsBalance: null, isAuthenticated: false });
        } else {
          // Keep authenticated state but no data — user can retry with pull-to-refresh
          set({ isAuthenticated: false });
          await Storage.multiRemove(['access_token', 'refresh_token']);
        }
      }
    } finally {
      set({ isLoading: false });
    }
  },
}));

// Setup unauthorized callback
api.setOnUnauthorized(() => {
  const store = useAuthStore.getState();
  store.logout().then(() => {
    // Force navigation to login
    try {
      const { router } = require('expo-router');
      router.replace('/(auth)/login');
    } catch {
      // If router not available, the AuthGate will handle it
    }
  });
});
