import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

import { useTheme } from "@/theme";
import { AppText } from "./Text";

export type BannerTone = "info" | "success" | "warning" | "error" | "offline" | "syncing";

interface InlineBannerProps {
    text: string;
    tone?: BannerTone;
    icon?: React.ReactNode;
    right?: React.ReactNode;
    style?: ViewStyle;
}

/** A thin tinted status strip — used for offline / "saved · syncing" notices. */
export function InlineBanner({ text, tone = "info", icon, right, style }: InlineBannerProps) {
    const t = useTheme();
    const tones: Record<BannerTone, { bg: string; fg: string }> = {
        info: { bg: "#DBEAFE", fg: "#1E40AF" },
        success: { bg: "#DCFCE7", fg: "#166534" },
        warning: { bg: "#FEF3C7", fg: "#92400E" },
        error: { bg: "#FEE2E2", fg: "#991B1B" },
        offline: { bg: t.colors.ink900, fg: t.colors.white },
        syncing: { bg: t.colors.tertiary, fg: t.colors.primary },
    };
    const c = tones[tone];

    return (
        <View style={[styles.row, { backgroundColor: c.bg, borderRadius: t.radius.md }, style]}>
            {icon ? <View style={styles.icon}>{icon}</View> : null}
            <AppText variant="label" style={{ color: c.fg, flex: 1 }}>
                {text}
            </AppText>
            {right ? <View style={styles.right}>{right}</View> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    icon: { marginRight: 8 },
    right: { marginLeft: 8 },
});
