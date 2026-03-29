import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  token: string | null;
  clientName: string | null;
  email: string | null;
  tenantId: string | null;
  isAuthenticated: boolean;
  login: (data: {
    accessToken: string;
    clientName: string;
    email: string;
    tenantId: string;
  }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      clientName: null,
      email: null,
      tenantId: null,
      isAuthenticated: false,

      login: (data) =>
        set({
          token: data.accessToken,
          clientName: data.clientName,
          email: data.email,
          tenantId: data.tenantId,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          token: null,
          clientName: null,
          email: null,
          tenantId: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "expection-auth",
    },
  ),
);
