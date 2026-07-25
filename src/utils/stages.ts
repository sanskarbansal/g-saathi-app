import type { AdvanceableStage, ChecklistStep, OnboardingStage } from "@/api/types";

/** Funnel order (forward-only), matching the backend ONBOARDING_STAGES. */
export const STAGE_ORDER: OnboardingStage[] = [
    "draft",
    "profile_created",
    "app_installed",
    "khata_imported",
    "first_order",
    "active",
];

export function stageRank(stage: OnboardingStage): number {
    const i = STAGE_ORDER.indexOf(stage);
    return i === -1 ? 0 : i;
}

export function isAtLeast(stage: OnboardingStage, min: OnboardingStage): boolean {
    return stageRank(stage) >= stageRank(min);
}

/** The stage that a completed checklist step corresponds to. */
export const STEP_STAGE: Record<ChecklistStep, AdvanceableStage> = {
    app_installed: "app_installed",
    khata_imported: "khata_imported",
    first_order: "first_order",
};

/** Ordered checklist steps as the activation UI renders them. */
export const CHECKLIST_STEPS: ChecklistStep[] = [
    "app_installed",
    "khata_imported",
    "first_order",
];

/** Is a checklist step already satisfied by the current stage? */
export function stepDoneByStage(step: ChecklistStep, stage: OnboardingStage): boolean {
    return isAtLeast(stage, STEP_STAGE[step]);
}
