import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/theme";

interface HeroHeaderProps {
    children: React.ReactNode;
    /** Add top inset padding for the status bar (default true). */
    safeTop?: boolean;
    style?: ViewStyle;
    rounded?: boolean;
}

/** The dark-green gradient hero used at the top of Home and Score. */
export function HeroHeader({ children, safeTop = true, style, rounded = true }: HeroHeaderProps) {
    const t = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <LinearGradient
            colors={t.gradients.hero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
                styles.hero,
                rounded && {
                    borderBottomLeftRadius: t.radius.xxl,
                    borderBottomRightRadius: t.radius.xxl,
                },
                {
                    paddingTop: (safeTop ? insets.top : 0) + t.spacing.lg,
                    paddingHorizontal: t.spacing.lg,
                    paddingBottom: t.spacing.xl,
                },
                style,
            ]}
        >
            <View>{children}</View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    hero: { width: "100%" },
});
