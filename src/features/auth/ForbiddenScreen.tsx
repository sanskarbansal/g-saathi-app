import React from "react";
import { useTranslation } from "react-i18next";
import { ShieldAlert } from "lucide-react-native";

import { useSession } from "@/auth";
import { useTheme } from "@/theme";
import { EmptyState, Screen } from "@/ui";

/** Shown when a valid user signs in but is NOT an active field agent (403). */
export function ForbiddenScreen() {
    const t = useTheme();
    const { t: tr } = useTranslation();
    const { resetToLogin } = useSession();

    return (
        <Screen>
            <EmptyState
                icon={<ShieldAlert size={30} color={t.colors.error} />}
                tone="error"
                title={tr("auth.forbiddenTitle")}
                message={tr("auth.forbiddenMessage")}
                actionLabel={tr("auth.forbiddenCta")}
                onAction={resetToLogin}
            />
        </Screen>
    );
}
