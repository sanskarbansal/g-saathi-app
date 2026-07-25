import { useSyncExternalStore } from "react";

import { onlineManager } from "./onlineManager";
import { onboardingQueue, type QueuedOnboarding } from "./mutationQueue";

/** Live connectivity, driven by NetInfo via React Query's onlineManager. */
export function useIsOnline(): boolean {
    return useSyncExternalStore(
        (cb) => onlineManager.subscribe(cb),
        () => onlineManager.isOnline(),
        () => true,
    );
}

/** The current offline onboarding queue (pending / syncing / error items). */
export function useOnboardingQueue(): QueuedOnboarding[] {
    return useSyncExternalStore(
        (cb) => onboardingQueue.subscribe(cb),
        () => onboardingQueue.getItems(),
        () => onboardingQueue.getItems(),
    );
}
