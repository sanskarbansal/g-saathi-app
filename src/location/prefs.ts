import * as SecureStore from "expo-secure-store";

/**
 * Whether the agent has opted into live-location sharing. Persisted in the device
 * keychain (same store as auth tokens) and cached in memory. Defaults to ON — the
 * agent can turn it off from Profile.
 */
const KEY = "saathi_share_location";
let cache: boolean | null = null;

export const locationPrefs = {
    async get(): Promise<boolean> {
        if (cache !== null) return cache;
        try {
            const v = await SecureStore.getItemAsync(KEY);
            cache = v === null ? true : v === "1"; // default ON when unset
        } catch {
            cache = true;
        }
        return cache;
    },
    async set(enabled: boolean): Promise<void> {
        cache = enabled;
        try {
            await SecureStore.setItemAsync(KEY, enabled ? "1" : "0");
        } catch {
            // Ignore persistence failures — the in-memory value still applies this session.
        }
    },
};
