import * as SecureStore from "expo-secure-store";

/**
 * Secure token storage. JWT + refresh token live ONLY in the device keychain
 * (expo-secure-store) — never AsyncStorage. An in-memory cache keeps reads fast
 * for the axios request interceptor after a one-time hydrate at startup.
 */
const ACCESS_KEY = "saathi_access_token";
const REFRESH_KEY = "saathi_refresh_token";

let accessCache: string | null = null;
let refreshCache: string | null = null;
let hydrated = false;

async function hydrate(): Promise<void> {
    if (hydrated) return;
    try {
        accessCache = await SecureStore.getItemAsync(ACCESS_KEY);
        refreshCache = await SecureStore.getItemAsync(REFRESH_KEY);
    } catch {
        accessCache = null;
        refreshCache = null;
    }
    hydrated = true;
}

export const tokenStore = {
    /** Load tokens from the keychain into memory (call once at app start). */
    async hydrate(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
        await hydrate();
        return { accessToken: accessCache, refreshToken: refreshCache };
    },

    async getAccessToken(): Promise<string | null> {
        if (!hydrated) await hydrate();
        return accessCache;
    },

    async getRefreshToken(): Promise<string | null> {
        if (!hydrated) await hydrate();
        return refreshCache;
    },

    async setTokens(accessToken: string, refreshToken: string): Promise<void> {
        accessCache = accessToken;
        refreshCache = refreshToken;
        hydrated = true;
        await Promise.all([
            SecureStore.setItemAsync(ACCESS_KEY, accessToken),
            SecureStore.setItemAsync(REFRESH_KEY, refreshToken),
        ]);
    },

    async clear(): Promise<void> {
        accessCache = null;
        refreshCache = null;
        hydrated = true;
        await Promise.all([
            SecureStore.deleteItemAsync(ACCESS_KEY),
            SecureStore.deleteItemAsync(REFRESH_KEY),
        ]);
    },

    /** Test-only: reset the in-memory hydrate flag. */
    _resetForTests(): void {
        accessCache = null;
        refreshCache = null;
        hydrated = false;
    },
};
