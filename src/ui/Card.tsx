import React from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";

import { useTheme } from "@/theme";

interface CardProps {
    children: React.ReactNode;
    onPress?: () => void;
    padded?: boolean;
    elevated?: boolean;
    style?: ViewStyle;
    accessibilityLabel?: string;
}

/** Rounded 16px surface with a soft shadow — the base container for content. */
export function Card({
    children,
    onPress,
    padded = true,
    elevated = true,
    style,
    accessibilityLabel,
}: CardProps) {
    const t = useTheme();
    const base: ViewStyle = {
        backgroundColor: t.colors.surface,
        borderRadius: t.radius.lg,
        padding: padded ? t.spacing.lg : 0,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: t.colors.border,
        ...(elevated ? t.shadow.card : {}),
    };

    if (onPress) {
        return (
            <Pressable
                onPress={onPress}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
                style={({ pressed }) => [base, style, pressed && styles.pressed]}
            >
                {children}
            </Pressable>
        );
    }

    return <View style={[base, style]}>{children}</View>;
}

const styles = StyleSheet.create({
    pressed: { opacity: 0.85, transform: [{ scale: 0.995 }] },
});
