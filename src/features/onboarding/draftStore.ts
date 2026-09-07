import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AddKiranaDraft } from "./AddKiranaContext";

const KEY = "saathi.addKirana.draft.v1";

/**
 * Drafts older than this are treated as abandoned. Long enough to survive a
 * beat interruption (a call, a low-battery shutdown, Android killing us behind
 * the camera), short enough that yesterday's half-typed shop never resurfaces.
 */
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

interface StoredDraft {
    savedAt: number;
    draft: AddKiranaDraft;
}

/** Persist the in-flight wizard draft. Failures are swallowed — this is a nicety. */
export async function saveDraft(draft: AddKiranaDraft): Promise<void> {
    try {
        const payload: StoredDraft = { savedAt: Date.now(), draft };
        await AsyncStorage.setItem(KEY, JSON.stringify(payload));
    } catch {
        // Storage full / unavailable — the wizard still works in memory.
    }
}

/** Read back a recent draft, or null if there is none / it is stale / it is junk. */
export async function loadDraft(): Promise<AddKiranaDraft | null> {
    try {
        const raw = await AsyncStorage.getItem(KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as StoredDraft;
        if (!parsed?.draft?.clientId) return null;
        if (Date.now() - (parsed.savedAt ?? 0) > MAX_AGE_MS) {
            await clearDraft();
            return null;
        }
        // A draft that already produced a server result is finished business.
        if (parsed.draft.result) {
            await clearDraft();
            return null;
        }
        return parsed.draft;
    } catch {
        return null;
    }
}

/** Drop the stored draft (flow completed or explicitly reset). */
export async function clearDraft(): Promise<void> {
    try {
        await AsyncStorage.removeItem(KEY);
    } catch {
        // Nothing useful to do.
    }
}
