import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

import { useTheme } from "@/theme";
import { AppText } from "./Text";

export type PillTone =
    | "neutral"
    | "accent"
    | "gold"
    | "success"
    | "warning"
    | "error"
    | "info"
    | "onDark";

interface PillProps {
    label: string;
    tone?: PillTone;
    size?: "sm" | "md";
    icon?: React.ReactNode;
    dot?: boolean;
    style?: ViewStyle;
}

/** Compact status/label chip. Also exported as `Badge`. */
export function Pill({ label, tone = "neutral", size = "md", icon, dot, style }: PillProps) {
    const t = useTheme();
    const tones: Record<PillTone, { bg: string; fg: string }> = {
        neutral: { bg: t.colors.subtle, fg: t.colors.ink700 },
        accent: { bg: t.colors.tertiary, fg: t.colors.primary },
        gold: { bg: "#FEF3C7", fg: "#92400E" },
        success: { bg: "#DCFCE7", fg: "#166534" },
        warning: { bg: "#FEF3C7", fg: "#92400E" },
        error: { bg: "#FEE2E2", fg: "#991B1B" },
        info: { bg: "#DBEAFE", fg: "#1E40AF" },
        onDark: { bg: t.colors.onDarkFaint, fg: t.colors.white },
    };
    const c = tones[tone];
    const pv = size === "sm" ? 3 : 5;
    const ph = size === "sm" ? 8 : 10;

    return (
        <View
            style={[
                styles.base,
                { backgroundColor: c.bg, paddingVertical: pv, paddingHorizontal: ph },
                style,
            ]}
        >
            {dot ? <View style={[styles.dot, { backgroundColor: c.fg }]} /> : null}
            {icon ? <View style={styles.icon}>{icon}</View> : null}
            <AppText variant={size === "sm" ? "caption" : "label"} style={{ color: c.fg }}>
                {label}
            </AppText>
        </View>
    );
}

export const Badge = Pill;

const styles = StyleSheet.create({
    base: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        borderRadius: 999,
    },
    dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
    icon: { marginRight: 4 },
});
