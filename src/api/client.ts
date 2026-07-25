import axios, {
    AxiosError,
    type AxiosResponse,
    type InternalAxiosRequestConfig,
} from "axios";

import { API_URL } from "@/config/env";
import { tokenStore } from "@/auth/tokenStore";
import { ApiError } from "./errors";

/**
 * The single axios instance for the app.
 *  - request:  attaches `Authorization: Bearer <jwt>` from SecureStore.
 *  - response: on 401 → refresh ONCE → retry; if refresh fails → clear session
 *              and hand off to the registered auth-failure handler (→ Login).
 * Every rejection is normalized to `ApiError`.
 */
export const apiClient = axios.create({
    baseURL: API_URL,
    timeout: 20000,
    headers: { "Content-Type": "application/json" },
});

// Auth-failure handler is injected by the AuthProvider (avoids an import cycle).
let onAuthFailure: (() => void) | null = null;
export function registerAuthFailureHandler(fn: () => void): void {
    onAuthFailure = fn;
}

// ── Request: attach bearer ───────────────────────────────────────────────────
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const token = await tokenStore.getAccessToken();
    if (token) {
        config.headers.set("Authorization", `Bearer ${token}`);
    }
    return config;
});

// ── Refresh (deduped) ────────────────────────────────────────────────────────
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
    const rt = await tokenStore.getRefreshToken();
    if (!rt) return null;
    try {
        // Raw axios (no interceptors) so a 401 here can't recurse.
        const res = await axios.post(
            `${API_URL}/auth/refresh`,
            { refreshToken: rt },
            { headers: { "Content-Type": "application/json" }, timeout: 20000 },
        );
        const data = res.data?.data as { token?: string; refreshToken?: string } | undefined;
        if (data?.token && data?.refreshToken) {
            await tokenStore.setTokens(data.token, data.refreshToken);
            return data.token;
        }
        return null;
    } catch {
        return null;
    }
}

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const AUTH_PATHS = ["/auth/refresh", "/auth/verify-otp", "/auth/send-otp"];

// ── Response: 401 refresh-once, else normalize ───────────────────────────────
apiClient.interceptors.response.use(
    (res: AxiosResponse) => res,
    async (error: AxiosError) => {
        const original = error.config as RetriableConfig | undefined;
        const status = error.response?.status;
        const url = original?.url ?? "";
        const isAuthPath = AUTH_PATHS.some((p) => url.includes(p));

        if (status === 401 && original && !original._retry && !isAuthPath) {
            original._retry = true;
            if (!refreshing) {
                refreshing = refreshAccessToken().finally(() => {
                    refreshing = null;
                });
            }
            const newToken = await refreshing;
            if (newToken) {
                original.headers.set("Authorization", `Bearer ${newToken}`);
                return apiClient(original);
            }
            // Refresh failed → session is dead.
            await tokenStore.clear();
            onAuthFailure?.();
        }

        return Promise.reject(ApiError.fromAxios(error));
    },
);

/** Unwrap the `{ success, data }` envelope to the inner `data`. */
export function unwrap<T>(p: Promise<AxiosResponse>): Promise<T> {
    return p.then((r) => (r.data as { data: T }).data);
}
