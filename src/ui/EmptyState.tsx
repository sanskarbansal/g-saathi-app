import React from "react";
import { StyleSheet, View } from "react-native";

import { useTheme } from "@/theme";
import { AppText } from "./Text";
import { Button } from "./Button";

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    message?: string;
    actionLabel?: string;
    onAction?: () => void;
    tone?: "neutral" | "error";
}

/** Centered empty / error state with an optional retry action. */
export function EmptyState({
    icon,
    title,
    message,
    actionLabel,
    onAction,
    tone = "neutral",
}: EmptyStateProps) {
    const t = useTheme();
    return (
        <View style={styles.wrap}>
            {icon ? (
                <View
                    style={[
                        styles.iconWrap,
                        { backgroundColor: tone === "error" ? "#FEE2E2" : t.colors.tertiary },
                    ]}
                >
                    {icon}
                </View>
            ) : null}
            <AppText variant="h2" align="center">
                {title}
            </AppText>
            {message ? (
                <AppText variant="body" muted align="center" style={styles.msg}>
                    {message}
                </AppText>
            ) : null}
            {actionLabel && onAction ? (
                <Button
                    title={actionLabel}
                    onPress={onAction}
                    variant="dark"
                    fullWidth={false}
                    style={styles.action}
                />
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
    iconWrap: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    msg: { marginTop: 8, maxWidth: 300 },
    action: { marginTop: 20, paddingHorizontal: 28 },
});
