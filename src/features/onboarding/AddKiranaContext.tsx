import React, { createContext, useContext, useMemo, useRef, useState } from "react";

import type { ChecklistItem } from "@/api";
import type { LanguageValue } from "@/api/schemas";
import { generateClientId, type CapturedGps, type CapturedPhoto } from "@/utils/capture";

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

interface AddKiranaContextValue {
    draft: AddKiranaDraft;
    update: (patch: Partial<AddKiranaDraft>) => void;
    reset: () => void;
}

const AddKiranaContext = createContext<AddKiranaContextValue | null>(null);

/**
 * Holds the Add-Kirana wizard draft across its steps (Details → KYC → Activation
 * → Success). `clientId` is generated once when the flow opens and is the offline
 * idempotency key for the create.
 */
export function AddKiranaProvider({ children }: { children: React.ReactNode }) {
    const idRef = useRef(generateClientId());
    const [draft, setDraft] = useState<AddKiranaDraft>(() => emptyDraft(idRef.current));

    const value = useMemo<AddKiranaContextValue>(
        () => ({
            draft,
            update: (patch) => setDraft((d) => ({ ...d, ...patch })),
            reset: () => {
                idRef.current = generateClientId();
                setDraft(emptyDraft(idRef.current));
            },
        }),
        [draft],
    );

    return <AddKiranaContext.Provider value={value}>{children}</AddKiranaContext.Provider>;
}

export function useAddKirana(): AddKiranaContextValue {
    const ctx = useContext(AddKiranaContext);
    if (!ctx) throw new Error("useAddKirana must be used within <AddKiranaProvider>");
    return ctx;
}
