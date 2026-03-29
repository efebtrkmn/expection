import axios from "axios";
import { useAuthStore } from "./auth-store";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// ── Request Interceptor: Attach JWT ──────────────────────────────
api.interceptors.request.use(
  (config) => {
    // Zustand persist stores state in localStorage
    const { token, tenantId } = useAuthStore.getState();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (tenantId) {
      config.headers["X-Tenant-ID"] = tenantId;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response Interceptor: Handle 401 ─────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect if we're on a protected page (not already on /login)
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/login")
      ) {
        useAuthStore.getState().logout();
        // Clear auth cookie so middleware doesn't redirect back
        document.cookie = "expection-auth-flag=; path=/; max-age=0";
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
