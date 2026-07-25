import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
    fieldApi,
    isApiError,
    type CreateOnboardingInput,
    type CreateOnboardingResult,
} from "@/api";
import { onboardingQueue, onlineManager } from "@/offline";

export type CreateOutcome =
    | { queued: true }
    | { queued: false; result: CreateOnboardingResult };

export interface CreateArgs {
    input: CreateOnboardingInput;
    localPhotoUri?: string;
}

/**
 * Create an onboarding with offline-first behavior:
 *  - Online  → POST directly. 201/200 both succeed (idempotent replay is fine);
 *              409 (duplicate phone) and 400 bubble up for the UI to show.
 *  - Offline → enqueue to the durable queue ("saved · will sync"); flushed once
 *              connectivity returns (idempotent on clientId, so never a dup).
 *  - Network drop mid-request → fall back to the queue.
 */
export function useCreateOnboarding() {
    const qc = useQueryClient();

    return useMutation<CreateOutcome, unknown, CreateArgs>({
        mutationFn: async ({ input, localPhotoUri }) => {
            if (!onlineManager.isOnline()) {
                await onboardingQueue.enqueue(input, localPhotoUri);
                return { queued: true };
            }
            try {
                const result = await fieldApi.createOnboarding(input);
                return { queued: false, result };
            } catch (e) {
                if (isApiError(e) && e.code === "NETWORK") {
                    await onboardingQueue.enqueue(input, localPhotoUri);
                    return { queued: true };
                }
                throw e;
            }
        },
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: ["field"] });
        },
    });
}
