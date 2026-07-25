import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

import { useTheme } from "@/theme";
import { AppText } from "./Text";

interface StatTileProps {
    label: string;
    value: string | number;
    sub?: string;
    icon?: React.ReactNode;
    onDark?: boolean;
    align?: "left" | "center";
    style?: ViewStyle;
}

/** A compact metric block: big value over a label, used in KPI rows. */
export function StatTile({
    label,
    value,
    sub,
    icon,
    onDark = false,
    align = "left",
    style,
}: StatTileProps) {
    const t = useTheme();
    const items = align === "center" ? styles.center : undefined;
    return (
        <View style={[styles.wrap, items, style]}>
            {icon ? <View style={styles.icon}>{icon}</View> : null}
            <AppText variant="h2" onDark={onDark} align={align}>
                {value}
            </AppText>
            <AppText variant="caption" onDark={onDark} muted align={align} style={styles.label}>
                {label}
            </AppText>
            {sub ? (
                <AppText variant="caption" color={onDark ? undefined : "accentDk"} onDark={onDark} align={align}>
                    {sub}
                </AppText>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { flex: 1 },
    center: { alignItems: "center" },
    icon: { marginBottom: 6 },
    label: { marginTop: 2 },
});
