import React from "react";
import { useTranslation } from "react-i18next";

import { Pill, type PillTone } from "@/ui";
import type { OnboardingStage } from "@/api";

const TONE: Record<OnboardingStage, PillTone> = {
    draft: "neutral",
    profile_created: "info",
    app_installed: "accent",
    khata_imported: "accent",
    first_order: "gold",
    active: "success",
};

/** A colored chip for an onboarding funnel stage. */
export function StageBadge({ stage, size = "sm" }: { stage: OnboardingStage; size?: "sm" | "md" }) {
    const { t } = useTranslation();
    return <Pill tone={TONE[stage]} label={t(`stage.${stage}`)} size={size} />;
}
