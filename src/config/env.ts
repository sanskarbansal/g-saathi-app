import Constants from "expo-constants";

/**
 * Central runtime config. The API base URL comes from `EXPO_PUBLIC_API_URL`
 * (see `.env.example`), surfaced through `app.config.ts` → `extra.apiUrl`. It is
 * never hardcoded in a source file.
 */
type Extra = { apiUrl?: string };

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

// Prefer the value baked into `extra` at build time; fall back to the inlined
// public env var, then to a sane emulator default.
export const API_URL: string = extra.apiUrl ?? process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.68.77:3000/api/v1";

if (__DEV__ && !extra.apiUrl && !process.env.EXPO_PUBLIC_API_URL) {
    // eslint-disable-next-line no-console
    console.warn("[saathi] EXPO_PUBLIC_API_URL is not set — falling back to http://192.168.68.77:3000/api/v1. " + "Copy .env.example to .env and set it.");
}
