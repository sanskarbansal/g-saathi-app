import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import {
    fieldApi,
    qk,
    type ListOnboardingsQuery,
    type OnboardingStage,
    type StoreOnboarding,
    type StorePortfolioItem,
} from "@/api";
import { useOnboardingQueue } from "@/offline";
import { isToday } from "@/utils/date";

// ── Base queries ─────────────────────────────────────────────────────────────
export function useHome() {
    return useQuery({ queryKey: qk.home, queryFn: fieldApi.getHome });
}

export function useOnboardings(query: ListOnboardingsQuery = { limit: 100 }) {
    return useQuery({
        queryKey: qk.onboardings(query),
        queryFn: () => fieldApi.listOnboardings(query),
    });
}

export function useStores() {
    return useQuery({ queryKey: qk.stores, queryFn: fieldApi.listStores });
}

export function useScore(period?: string) {
    return useQuery({ queryKey: qk.score(period), queryFn: () => fieldApi.getScore(period) });
}

/** The agent's beat for a day (defaults to today): auto 'due' stores + planned. */
export function useBeat(date?: string) {
    return useQuery({ queryKey: qk.beat(date), queryFn: () => fieldApi.getBeat(date) });
}

export function useOnboardingDetail(id: string | undefined) {
    return useQuery({
        queryKey: qk.onboarding(id ?? "none"),
        queryFn: () => fieldApi.getOnboarding(id as string),
        enabled: Boolean(id),
    });
}

// ── Derived: today's counts ──────────────────────────────────────────────────
export function useTodayCounts(onboardings: StoreOnboarding[] | undefined) {
    return useMemo(() => {
        const list = onboardings ?? [];
        const onboardsToday = list.filter((o) => isToday(o.createdAt)).length;
        const activationsToday = list.filter((o) => isToday(o.appInstalledAt)).length;
        return { onboardsToday, activationsToday };
    }, [onboardings]);
}

// ── Derived: unified "beat" list (server onboardings + stores + offline queue) ─
export interface BeatStore {
    key: string;
    onboardingId?: string; // undefined while an offline create is unsynced
    clientId: string;
    storeId: string | null;
    shopName: string;
    phone: string | null;
    stage: OnboardingStage;
    appInstalled: boolean;
    firstOrder: boolean;
    createdAt?: string;
    lastVisitedAt?: string | null;
    /** Local-only: an offline create still in the queue. */
    syncing?: boolean;
    /** Local-only: the queued create hit a permanent error (e.g. duplicate). */
    errored?: boolean;
    errorCode?: string;
}

/**
 * Merge the server onboardings (which carry the onboarding id + timestamps) with
 * /field/stores (shop names + health) and the offline queue (unsynced creates),
 * newest first. Queued items surface immediately as "saved · syncing".
 */
export function useBeatStores(): {
    stores: BeatStore[];
    isLoading: boolean;
    isError: boolean;
    refetch: () => void;
} {
    const onboardingsQ = useOnboardings({ limit: 100 });
    const storesQ = useStores();
    const queue = useOnboardingQueue();

    const stores = useMemo<BeatStore[]>(() => {
        const onboardings = onboardingsQ.data ?? [];
        const portfolio = storesQ.data ?? [];
        const byStoreId = new Map<string, StorePortfolioItem>();
        for (const s of portfolio) if (s.storeId) byStoreId.set(s.storeId, s);

        const serverClientIds = new Set(onboardings.map((o) => o.clientId));

        const server: BeatStore[] = onboardings.map((o) => {
            const store = o.storeId ? byStoreId.get(o.storeId) : undefined;
            return {
                key: o.id,
                onboardingId: o.id,
                clientId: o.clientId,
                storeId: o.storeId,
                shopName: store?.shopName ?? "—",
                phone: store?.phone ?? null,
                stage: o.stage,
                appInstalled: Boolean(o.appInstalledAt),
                firstOrder: Boolean(o.firstOrderAt),
                createdAt: o.createdAt,
                lastVisitedAt: o.lastVisitedAt ?? null,
            };
        });

        // Offline queue items not yet reflected on the server.
        const queued: BeatStore[] = queue
            .filter((q) => !serverClientIds.has(q.clientId))
            .map((q) => ({
                key: q.clientId,
                clientId: q.clientId,
                storeId: null,
                shopName: q.input.shopName,
                phone: q.input.phone,
                stage: "profile_created" as OnboardingStage,
                appInstalled: false,
                firstOrder: false,
                syncing: q.status !== "error",
                errored: q.status === "error",
                errorCode: q.errorCode,
            }));

        const serverSorted = server.sort((a, b) =>
            (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
        );
        return [...queued, ...serverSorted];
    }, [onboardingsQ.data, storesQ.data, queue]);

    return {
        stores,
        isLoading: onboardingsQ.isLoading || storesQ.isLoading,
        isError: onboardingsQ.isError || storesQ.isError,
        refetch: () => {
            onboardingsQ.refetch();
            storesQ.refetch();
        },
    };
}
