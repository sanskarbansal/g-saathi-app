import React from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    View,
    type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { useTheme } from "@/theme";
import { AppText } from "./Text";

export type ButtonVariant = "primary" | "dark" | "ghost" | "gold" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
    title: string;
    onPress?: () => void;
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    disabled?: boolean;
    fullWidth?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    haptic?: boolean;
    style?: ViewStyle;
    accessibilityLabel?: string;
}

const HEIGHTS: Record<ButtonSize, number> = { sm: 44, md: 52, lg: 56 };

/**
 * Primary interactive control. Gradient fills for `primary` (lime) and `gold`;
 * solid `dark` (brand green); bordered `ghost`. Meets the ≥48dp field target.
 */
export function Button({
    title,
    onPress,
    variant = "primary",
    size = "lg",
    loading = false,
    disabled = false,
    fullWidth = true,
    leftIcon,
    rightIcon,
    haptic = true,
    style,
    accessibilityLabel,
}: ButtonProps) {
    const t = useTheme();
    const isDisabled = disabled || loading;

    const handlePress = () => {
        if (isDisabled) return;
        if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        onPress?.();
    };

    const height = HEIGHTS[size];
    const gradient =
        variant === "primary"
            ? t.gradients.accent
            : variant === "gold"
              ? t.gradients.gold
              : null;

    const textColor =
        variant === "primary" || variant === "gold"
            ? t.colors.primary
            : variant === "dark" || variant === "danger"
              ? t.colors.white
              : t.colors.primary;

    const containerBase: ViewStyle = {
        height,
        borderRadius: t.radius.lg,
        alignSelf: fullWidth ? "stretch" : "flex-start",
        opacity: isDisabled ? 0.55 : 1,
    };

    const inner = (
        <View style={styles.row}>
            {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
            {loading ? (
                <ActivityIndicator color={textColor} />
            ) : (
                <AppText variant="title" style={{ color: textColor }} numberOfLines={1}>
                    {title}
                </AppText>
            )}
            {rightIcon && !loading ? <View style={styles.iconRight}>{rightIcon}</View> : null}
        </View>
    );

    // Solid variants
    const solidBg =
        variant === "dark"
            ? t.colors.primary
            : variant === "danger"
              ? t.colors.error
              : "transparent";
    const borderStyle: ViewStyle =
        variant === "ghost"
            ? { borderWidth: 1.5, borderColor: t.colors.border, backgroundColor: t.colors.surface }
            : {};

    return (
        <Pressable
            onPress={handlePress}
            disabled={isDisabled}
            accessibilityRole="button"
            accessibilityState={{ disabled: isDisabled, busy: loading }}
            accessibilityLabel={accessibilityLabel ?? title}
            style={({ pressed }) => [
                containerBase,
                style,
                pressed && !isDisabled ? styles.pressed : null,
            ]}
        >
            {gradient ? (
                <LinearGradient
                    colors={gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.fill, { borderRadius: t.radius.lg }, t.shadow.accent]}
                >
                    {inner}
                </LinearGradient>
            ) : (
                <View
                    style={[
                        styles.fill,
                        { borderRadius: t.radius.lg, backgroundColor: solidBg },
                        borderStyle,
                    ]}
                >
                    {inner}
                </View>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    fill: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 20,
    },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
    icon: { marginRight: 8 },
    iconRight: { marginLeft: 8 },
    pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
});
