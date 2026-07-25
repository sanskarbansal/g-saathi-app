import { useMutation, useQueryClient } from "@tanstack/react-query";

import { fieldApi, qk, type LogVisitInput, type LogVisitResult } from "@/api";

/** Log a GPS-verified store check-in, then refresh beat / visits / portfolio / home. */
export function useLogVisit() {
    const qc = useQueryClient();
    return useMutation<LogVisitResult, unknown, LogVisitInput>({
        mutationFn: (body) => fieldApi.logVisit(body),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: ["field", "beat"] });
            void qc.invalidateQueries({ queryKey: ["field", "visits"] });
            void qc.invalidateQueries({ queryKey: qk.stores });
            void qc.invalidateQueries({ queryKey: qk.home });
        },
    });
}
