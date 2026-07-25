import React from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { ChevronLeft, X } from "lucide-react-native";

import { useTheme } from "@/theme";
import { AppText } from "./Text";

interface HeaderProps {
    title?: string;
    subtitle?: string;
    onBack?: () => void;
    backVariant?: "chevron" | "close";
    right?: React.ReactNode;
    variant?: "light" | "dark";
    style?: ViewStyle;
}

/** Presentational screen header used inside `Screen` (native headers are hidden). */
export function Header({
    title,
    subtitle,
    onBack,
    backVariant = "chevron",
    right,
    variant = "light",
    style,
}: HeaderProps) {
    const t = useTheme();
    const onDark = variant === "dark";
    const iconColor = onDark ? t.colors.white : t.colors.ink900;
    const BackIcon = backVariant === "close" ? X : ChevronLeft;

    return (
        <View style={[styles.row, style]}>
            <View style={styles.side}>
                {onBack ? (
                    <Pressable
                        onPress={onBack}
                        hitSlop={12}
                        accessibilityRole="button"
                        accessibilityLabel="Back"
                        style={({ pressed }) => [
                            styles.iconBtn,
                            { backgroundColor: onDark ? t.colors.onDarkFaint : t.colors.subtle },
                            pressed && styles.pressed,
                        ]}
                    >
                        <BackIcon size={22} color={iconColor} />
                    </Pressable>
                ) : null}
            </View>

            <View style={styles.center}>
                {title ? (
                    <AppText variant="title" onDark={onDark} numberOfLines={1} align="center">
                        {title}
                    </AppText>
                ) : null}
                {subtitle ? (
                    <AppText variant="caption" onDark={onDark} muted align="center">
                        {subtitle}
                    </AppText>
                ) : null}
            </View>

            <View style={[styles.side, styles.right]}>{right}</View>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        minHeight: 52,
    },
    side: { width: 64, justifyContent: "center" },
    right: { alignItems: "flex-end" },
    center: { flex: 1, alignItems: "center" },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    pressed: { opacity: 0.7 },
});
