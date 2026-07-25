import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { AppState, type AppStateStatus } from "react-native";
import * as Location from "expo-location";

import { fieldApi, type LocationPingInput } from "@/api";
import { useSession } from "@/auth";
import { locationPrefs } from "./prefs";

/** How often buffered breadcrumbs are flushed to the backend. */
const FLUSH_INTERVAL_MS = 30_000;
/** Cap the in-memory buffer so a long offline stretch can't grow unbounded. */
const MAX_BUFFER = 40;

type PermissionState = "unknown" | "granted" | "denied";

interface LocationSharingValue {
    /** Agent's opt-in preference (persisted). */
    sharingEnabled: boolean;
    /** Foreground location permission state, once we've asked. */
    permission: PermissionState;
    setSharingEnabled: (enabled: boolean) => Promise<void>;
}

const Ctx = createContext<LocationSharingValue | null>(null);

/**
 * Foreground live-location tracker for the field agent. While the agent is signed in,
 * has sharing ON, and the app is in the foreground, it watches GPS (expo-location) and
 * flushes a small breadcrumb batch to POST /field/location every ~30s. No background
 * tracking (no "Always" permission), so it stops delivering when the app is backgrounded.
 * Best-effort: network failures never surface to the agent.
 */
export function LocationProvider({ children }: { children: React.ReactNode }) {
    const { status } = useSession();
    const authenticated = status === "authenticated";

    const [sharingEnabled, setSharing] = useState(true);
    const [permission, setPermission] = useState<PermissionState>("unknown");

    const buffer = useRef<LocationPingInput[]>([]);
    const watcher = useRef<Location.LocationSubscription | null>(null);
    const flushTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    const appActive = useRef(AppState.currentState === "active");

    // Hydrate the persisted preference once.
    useEffect(() => {
        void locationPrefs.get().then(setSharing);
    }, []);

    const flush = useCallback(async (force = false) => {
        if (!force && !appActive.current) return;
        if (buffer.current.length === 0) return;
        const batch = buffer.current.slice(0, MAX_BUFFER);
        buffer.current = [];
        try {
            await fieldApi.sendLocation(batch);
        } catch {
            // Best-effort: keep only the most recent point so liveness resumes on the
            // next tick, dropping the rest to avoid a stale flood / unbounded growth.
            const last = batch[batch.length - 1];
            if (last) buffer.current = [last, ...buffer.current].slice(0, MAX_BUFFER);
        }
    }, []);

    const stop = useCallback(() => {
        watcher.current?.remove();
        watcher.current = null;
        if (flushTimer.current) {
            clearInterval(flushTimer.current);
            flushTimer.current = null;
        }
        buffer.current = [];
    }, []);

    const start = useCallback(async () => {
        if (watcher.current) return; // already tracking
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status !== "granted") {
            setPermission("denied");
            return;
        }
        setPermission("granted");
        watcher.current = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.Balanced, timeInterval: 15_000, distanceInterval: 20 },
            (pos) => {
                buffer.current.push({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracyM:
                        typeof pos.coords.accuracy === "number"
                            ? Math.max(0, Math.round(pos.coords.accuracy))
                            : undefined,
                    recordedAt: new Date(pos.timestamp).toISOString(),
                });
                if (buffer.current.length > MAX_BUFFER) {
                    buffer.current = buffer.current.slice(-MAX_BUFFER);
                }
            },
        );
        flushTimer.current = setInterval(() => void flush(), FLUSH_INTERVAL_MS);
    }, [flush]);

    // Drive tracking from (authenticated ∧ sharingEnabled).
    useEffect(() => {
        if (authenticated && sharingEnabled) {
            void start();
        } else {
            stop();
        }
        return () => stop();
    }, [authenticated, sharingEnabled, start, stop]);

    // Pause sends when backgrounded; do a final flush on the way out.
    useEffect(() => {
        const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
            const wasActive = appActive.current;
            const nowActive = next === "active";
            if (wasActive && !nowActive) void flush(true);
            appActive.current = nowActive;
        });
        return () => sub.remove();
    }, [flush]);

    const setSharingEnabled = useCallback(async (enabled: boolean) => {
        setSharing(enabled);
        await locationPrefs.set(enabled);
    }, []);

    const value = useMemo(
        () => ({ sharingEnabled, permission, setSharingEnabled }),
        [sharingEnabled, permission, setSharingEnabled],
    );

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLocationSharing(): LocationSharingValue {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error("useLocationSharing must be used within <LocationProvider>");
    return ctx;
}
