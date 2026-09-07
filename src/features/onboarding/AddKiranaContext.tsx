import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import type { ChecklistItem } from "@/api";
import type { LanguageValue } from "@/api/schemas";
import { generateClientId, type CapturedGps, type CapturedPhoto } from "@/utils/capture";
import { clearDraft, loadDraft, saveDraft } from "./draftStore";

export type GpsStatus = "idle" | "capturing" | "granted" | "denied" | "error";

export interface OnboardingResult {
    onboardingId?: string;
    storeNumber?: number;
    checklist: ChecklistItem[];
    queued: boolean;
    idempotentReplay?: boolean;
    shopName: string;
    pointsEarned?: number;
}

export interface AddKiranaDraft {
    clientId: string;
    shopName: string;
    ownerName: string;
    phoneDigits: string;
    photo: CapturedPhoto | null;
    gps: CapturedGps | null;
    gpsStatus: GpsStatus;
    upiVpa: string;
    gstin: string;
    language: LanguageValue;
    hubKey?: string;
    result: OnboardingResult | null;
}

function emptyDraft(clientId: string): AddKiranaDraft {
    return {
        clientId,
        shopName: "",
        ownerName: "",
        phoneDigits: "",
        photo: null,
        gps: null,
        gpsStatus: "idle",
        upiVpa: "",
        gstin: "",
        language: "hi",
        hubKey: undefined,
        result: null,
    };
}

/**
 * Fields that represent real agent input. GPS is excluded on purpose: it
 * auto-captures the moment the wizard opens, so counting it would mark every
 * opened-and-abandoned wizard as worth saving — and would race hydration.
 */
const TOUCH_KEYS = [
    "shopName",
    "ownerName",
    "phoneDigits",
    "photo",
    "upiVpa",
    "gstin",
    "hubKey",
    "result",
] as const satisfies readonly (keyof AddKiranaDraft)[];

/** Has the agent actually put anything into this draft? */
function isTouched(d: AddKiranaDraft): boolean {
    return TOUCH_KEYS.some((k) => Boolean(d[k]));
}

/** Does this patch carry real input (as opposed to background GPS churn)? */
function patchTouches(patch: Partial<AddKiranaDraft>): boolean {
    return TOUCH_KEYS.some((k) => k in patch && Boolean(patch[k]));
}

interface AddKiranaContextValue {
    draft: AddKiranaDraft;
    update: (patch: Partial<AddKiranaDraft>) => void;
    reset: () => void;
    /** True once the persisted draft (if any) has been read back. */
    hydrated: boolean;
    /** True when the current draft was restored from storage, not typed fresh. */
    restored: boolean;
}

const AddKiranaContext = createContext<AddKiranaContextValue | null>(null);

/**
 * Holds the Add-Kirana wizard draft across its steps (Details → KYC → Activation
 * → Success). `clientId` is generated once when the flow opens and is the offline
 * idempotency key for the create.
 *
 * The draft is also mirrored to AsyncStorage. Android routinely destroys our
 * process while the system camera activity is in front (agents run 2–3 GB
 * handsets), and without this the agent came back to a cold-started app with
 * the shop they had just typed in gone. Restoring keeps the same `clientId`, so
 * a resumed draft still de-duplicates against the server on create.
 */
export function AddKiranaProvider({ children }: { children: React.ReactNode }) {
    const idRef = useRef(generateClientId());
    const [draft, setDraft] = useState<AddKiranaDraft>(() => emptyDraft(idRef.current));
    const [hydrated, setHydrated] = useState(false);
    const [restored, setRestored] = useState(false);
    const touchedRef = useRef(false);

    // Hydrate once, and only over a draft the agent has not started typing into.
    useEffect(() => {
        let cancelled = false;
        void (async () => {
            const stored = await loadDraft();
            if (cancelled) return;
            if (stored && !touchedRef.current) {
                idRef.current = stored.clientId;
                // Re-capture GPS rather than trusting a coordinate from before
                // the interruption — the agent may well be at the next shop.
                setDraft({ ...stored, gps: null, gpsStatus: "idle" });
                setRestored(true);
            }
            setHydrated(true);
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // Mirror every meaningful change to disk (post-hydration only, so we never
    // write an empty draft over a good one during startup).
    useEffect(() => {
        if (!hydrated) return;
        if (draft.result) {
            void clearDraft();
            return;
        }
        if (!isTouched(draft)) return;
        const timer = setTimeout(() => void saveDraft(draft), 300);
        return () => clearTimeout(timer);
    }, [draft, hydrated]);

    const value = useMemo<AddKiranaContextValue>(
        () => ({
            draft,
            hydrated,
            restored,
            update: (patch) => {
                if (patchTouches(patch)) touchedRef.current = true;
                setDraft((d) => ({ ...d, ...patch }));
            },
            reset: () => {
                touchedRef.current = false;
                idRef.current = generateClientId();
                setRestored(false);
                setDraft(emptyDraft(idRef.current));
                void clearDraft();
            },
        }),
        [draft, hydrated, restored],
    );

    return <AddKiranaContext.Provider value={value}>{children}</AddKiranaContext.Provider>;
}

export function useAddKirana(): AddKiranaContextValue {
    const ctx = useContext(AddKiranaContext);
    if (!ctx) throw new Error("useAddKirana must be used within <AddKiranaProvider>");
    return ctx;
}
