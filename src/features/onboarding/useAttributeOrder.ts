import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
    fieldApi,
    qk,
    type AttributeOrderResult,
    type OnboardingDetail,
} from "@/api";

/**
 * Attribute a real Groship order to a shop by its order NUMBER. The backend
 * verifies the order and credits its real total as `revenue` (no self-reported
 * amount). Updates the detail cache and refreshes score / home / lists.
 */
export function useAttributeOrder(onboardingId: string) {
    const qc = useQueryClient();

    return useMutation<AttributeOrderResult, unknown, { orderNumber: string }>({
        mutationFn: ({ orderNumber }) => fieldApi.attributeOrder(onboardingId, { orderNumber }),
        onSuccess: (data) => {
            qc.setQueryData<OnboardingDetail>(qk.onboarding(onboardingId), (prev) =>
                prev
                    ? { ...prev, onboarding: data.onboarding, checklist: data.checklist }
                    : prev,
            );
            void qc.invalidateQueries({ queryKey: ["field"] });
        },
    });
}
