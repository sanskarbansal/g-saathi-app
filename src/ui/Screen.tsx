import React from "react";
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
    type ScrollViewProps,
    type ViewStyle,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { useTheme } from "@/theme";

interface ScreenProps {
    children: React.ReactNode;
    scroll?: boolean;
    padded?: boolean;
    refreshing?: boolean;
    onRefresh?: () => void;
    edges?: readonly Edge[];
    backgroundColor?: string;
    style?: ViewStyle;
    contentContainerStyle?: ViewStyle;
    scrollProps?: ScrollViewProps;
}

/**
 * Standard screen frame: safe-area aware, brand background, optional scroll +
 * pull-to-refresh. Content padding uses the token scale.
 */
export function Screen({
    children,
    scroll = false,
    padded = true,
    refreshing = false,
    onRefresh,
    edges = ["top", "left", "right"],
    backgroundColor,
    style,
    contentContainerStyle,
    scrollProps,
}: ScreenProps) {
    const t = useTheme();
    const bg = backgroundColor ?? t.colors.bg;
    const pad = padded ? { padding: t.spacing.lg } : undefined;

    if (scroll) {
        return (
            <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: bg }, style]}>
                <ScrollView
                    style={styles.flex}
                    contentContainerStyle={[pad, contentContainerStyle]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        onRefresh ? (
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor={t.colors.accentDk}
                                colors={[t.colors.accentDk]}
                            />
                        ) : undefined
                    }
                    {...scrollProps}
                >
                    {children}
                </ScrollView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: bg }, style]}>
            <View style={[styles.flex, pad, contentContainerStyle]}>{children}</View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
});
