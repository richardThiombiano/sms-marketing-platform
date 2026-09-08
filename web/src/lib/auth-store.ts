import { create } from "zustand";
import { api } from "./api";
import { tokenStorage } from "./token-storage";
import type { User, Tenant, SmsBalance } from "./types";

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  smsBalance: SmsBalance | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  fetchTenant: () => Promise<void>;
  fetchBalance: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tenant: null,
  smsBalance: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (identifier: string, password: string) => {
    const response = await api.login(identifier, password);
    tokenStorage.setTokens(response.access_token, response.refresh_token);

    // Fetch user profile and tenant
    const user = await api.getMe();
    set({ user, isAuthenticated: true });

    // Fetch tenant info and balance (non-blocking for superadmin)
    try {
      const tenant = await api.getTenant();
      set({ tenant });
    } catch {}
    try {
      const balance = await api.getSmsBalance();
      set({ smsBalance: balance });
    } catch {}
  },

  logout: () => {
    tokenStorage.clearTokens();
    set({ user: null, tenant: null, smsBalance: null, isAuthenticated: false });
  },

  fetchUser: async () => {
    try {
      const user = await api.getMe();
      set({ user, isAuthenticated: true });
    } catch {
      set({ user: null, isAuthenticated: false });
    }
  },

  fetchTenant: async () => {
    try {
      const tenant = await api.getTenant();
      set({ tenant });
    } catch {}
  },

  fetchBalance: async () => {
    try {
      const balance = await api.getSmsBalance();
      set({ smsBalance: balance });
    } catch {}
  },

  initialize: async () => {
    if (tokenStorage.hasToken()) {
      try {
        const user = await api.getMe();
        set({ user, isAuthenticated: true, isLoading: false });

        // Fetch tenant info and balance (non-critical failures)
        const [tenantResult, balanceResult] = await Promise.allSettled([
          api.getTenant(),
          api.getSmsBalance(),
        ]);
        if (tenantResult.status === "fulfilled") set({ tenant: tenantResult.value });
        if (balanceResult.status === "fulfilled") set({ smsBalance: balanceResult.value });
      } catch {
        tokenStorage.clearTokens();
        set({ user: null, tenant: null, smsBalance: null, isAuthenticated: false, isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },
}));
