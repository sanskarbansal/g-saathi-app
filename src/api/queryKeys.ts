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
    // "pages": the catalog is an infinite (paged) query since the paged-loading change. The
    // cache is persisted to AsyncStorage, so the key must differ from the old single-page
    // entry or react-query restores the old shape and crashes reading `pages.length`.
    catalog: (targetKey: string, search?: string, categoryId?: string) =>
        ["field", "catalog", "pages", targetKey, search ?? "", categoryId ?? ""] as const,
    customerLookup: (phone: string) => ["field", "customerLookup", phone] as const,
    orders: (storeId?: string, kind?: string) => ["field", "orders", storeId ?? "all", kind ?? "all"] as const,
    order: (orderId: string) => ["field", "order", orderId] as const,
};
