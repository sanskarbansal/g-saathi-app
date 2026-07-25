import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
    fieldApi,
    qk,
    type AdvanceableStage,
    type OnboardingDetail,
    type UpdateOnboardingResult,
} from "@/api";

/**
 * Advance an onboarding's funnel stage (forward-only, enforced server-side).
 * Used for agent-advanceable steps only (khata_imported). `app_installed` is the
 * owner-verified activation (set automatically when the owner registers) and
 * `first_order` comes from attributing a real order — neither is set through here.
 * On success we patch the detail cache and invalidate the dependent lists + score.
 */
export function useAdvanceStage(onboardingId: string) {
    const qc = useQueryClient();

    return useMutation<UpdateOnboardingResult, unknown, AdvanceableStage>({
        mutationFn: (stage) => fieldApi.updateOnboarding(onboardingId, { stage }),
        onSuccess: (data) => {
            qc.setQueryData<OnboardingDetail>(qk.onboarding(onboardingId), (prev) =>
                prev
                    ? { ...prev, onboarding: data.onboarding, checklist: data.checklist }
                    : prev,
            );
            void qc.invalidateQueries({ queryKey: qk.stores });
            void qc.invalidateQueries({ queryKey: ["field", "onboardings"] });
            void qc.invalidateQueries({ queryKey: qk.home });
            void qc.invalidateQueries({ queryKey: ["field", "score"] });
        },
    });
}
