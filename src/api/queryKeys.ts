import type { ListOnboardingsQuery } from "./types";

/** Centralized React Query keys so invalidation stays consistent. */
export const qk = {
    fieldMe: ["field", "me"] as const,
    home: ["field", "home"] as const,
    onboardings: (query?: ListOnboardingsQuery) =>
        ["field", "onboardings", query ?? {}] as const,
    onboarding: (id: string) => ["field", "onboarding", id] as const,
    stores: ["field", "stores"] as const,
    score: (period?: string) => ["field", "score", period ?? "current"] as const,
    beat: (date?: string) => ["field", "beat", date ?? "today"] as const,
    visits: (storeId?: string) => ["field", "visits", storeId ?? "all"] as const,
};
