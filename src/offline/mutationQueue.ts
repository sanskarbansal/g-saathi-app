import AsyncStorage from "@react-native-async-storage/async-storage";

import { fieldApi, isApiError, type CreateOnboardingInput } from "@/api";
import { queryClient } from "./queryClient";
import { onlineManager } from "./onlineManager";

/**
 * Durable offline queue for onboarding CREATEs.
 *
 * Creating a kirana offline enqueues the payload (persisted to AsyncStorage) and
 * the shop shows immediately as "saved · syncing". On reconnect the queue POSTs
 * each item exactly once — the endpoint is idempotent on `clientId`, so a retry
 * returns the same record (200) and never double-creates. Permanent failures
 * (duplicate phone / validation) are surfaced for the agent to resolve.
 */

export type QueuedStatus = "pending" | "syncing" | "error";

export interface QueuedOnboarding {
    clientId: string;
    input: CreateOnboardingInput;
    localPhotoUri?: string;
    createdAt: number;
    status: QueuedStatus;
    attempts: number;
    errorCode?: string;
    errorMessage?: string;
}

const STORAGE_KEY = "saathi.onboardingQueue.v1";

let items: QueuedOnboarding[] = [];
let snapshot: QueuedOnboarding[] = items;
let hydrated = false;
let flushing = false;
const listeners = new Set<() => void>();

function commit(next: QueuedOnboarding[]): void {
    items = next;
    snapshot = next; // new identity → useSyncExternalStore re-renders
    listeners.forEach((l) => l());
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch(() => {});
}

async function hydrate(): Promise<void> {
    if (hydrated) return;
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw) as QueuedOnboarding[];
            // Reset any "syncing" left over from a hard kill back to "pending".
            items = parsed.map((i) => (i.status === "syncing" ? { ...i, status: "pending" } : i));
            snapshot = items;
        }
    } catch {
        items = [];
        snapshot = items;
    }
    hydrated = true;
}

function isOnline(): boolean {
    return onlineManager.isOnline();
}

async function flush(): Promise<void> {
    if (flushing) return;
    await hydrate();
    if (!isOnline()) return;
    if (!items.some((i) => i.status === "pending")) return;

    flushing = true;
    let anySynced = false;
    try {
        // Snapshot the pending client ids up front; process sequentially.
        const pendingIds = items.filter((i) => i.status === "pending").map((i) => i.clientId);
        for (const clientId of pendingIds) {
            if (!isOnline()) break; // dropped offline mid-flush → stop, retry later

            commit(items.map((i) => (i.clientId === clientId ? { ...i, status: "syncing" } : i)));
            const current = items.find((i) => i.clientId === clientId);
            if (!current) continue;

            try {
                const res = await fieldApi.createOnboarding(current.input);
                // Now that the store exists, upload the storefront photo captured
                // offline (best-effort — the store is already created, and the photo
                // is optional, so a failed upload must not keep the item queued or
                // trigger a duplicate create on the next pass).
                if (current.localPhotoUri) {
                    try {
                        await fieldApi.uploadStorefrontPhoto(res.onboarding.id, current.localPhotoUri);
                    } catch {
                        /* leave the store synced; the photo simply won't appear */
                    }
                }
                // Success (created OR idempotent replay) → drop from queue.
                commit(items.filter((i) => i.clientId !== clientId));
                anySynced = true;
            } catch (err) {
                if (isApiError(err) && err.status >= 400 && err.status < 500) {
                    // Permanent (e.g. 409 duplicate phone, 400 validation) — surface it.
                    commit(
                        items.map((i) =>
                            i.clientId === clientId
                                ? {
                                      ...i,
                                      status: "error",
                                      attempts: i.attempts + 1,
                                      errorCode: err.code,
                                      errorMessage: err.message,
                                  }
                                : i,
                        ),
                    );
                } else {
                    // Transient / offline — revert to pending and stop this pass.
                    commit(
                        items.map((i) =>
                            i.clientId === clientId
                                ? { ...i, status: "pending", attempts: i.attempts + 1 }
                                : i,
                        ),
                    );
                    break;
                }
            }
        }
    } finally {
        flushing = false;
    }

    if (anySynced) {
        // Reconcile server state (home / onboardings / stores / score).
        void queryClient.invalidateQueries({ queryKey: ["field"] });
    }
}

export const onboardingQueue = {
    /** Add a create to the queue and attempt an immediate flush. */
    async enqueue(input: CreateOnboardingInput, localPhotoUri?: string): Promise<QueuedOnboarding> {
        await hydrate();
        const item: QueuedOnboarding = {
            clientId: input.clientId,
            input,
            localPhotoUri,
            createdAt: Date.now(),
            status: "pending",
            attempts: 0,
        };
        commit([item, ...items.filter((i) => i.clientId !== item.clientId)]);
        void flush();
        return item;
    },

    /** Retry an item that hit a permanent error. */
    async retry(clientId: string): Promise<void> {
        await hydrate();
        commit(
            items.map((i) =>
                i.clientId === clientId
                    ? { ...i, status: "pending", errorCode: undefined, errorMessage: undefined }
                    : i,
            ),
        );
        void flush();
    },

    /** Remove an item (agent dismisses a duplicate/failed create). */
    async remove(clientId: string): Promise<void> {
        await hydrate();
        commit(items.filter((i) => i.clientId !== clientId));
    },

    flush,
    hydrate,

    getItems(): QueuedOnboarding[] {
        return snapshot;
    },

    subscribe(listener: () => void): () => void {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },

    /** Test-only reset. */
    async _resetForTests(): Promise<void> {
        items = [];
        snapshot = items;
        hydrated = false;
        flushing = false;
        listeners.clear();
        await AsyncStorage.removeItem(STORAGE_KEY);
    },
};

/**
 * Initialize the queue at app start: hydrate, flush once, and auto-flush whenever
 * connectivity returns.
 */
export function initMutationQueue(): () => void {
    void onboardingQueue.hydrate().then(() => onboardingQueue.flush());
    return onlineManager.subscribe((online) => {
        if (online) void onboardingQueue.flush();
    });
}
