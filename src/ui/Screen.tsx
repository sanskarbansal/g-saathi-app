import React from "react";
import {
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
    type ScrollViewProps,
    type ViewStyle,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { useTheme } from "@/theme";
import { useKeyboardHeight } from "./useKeyboardHeight";

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
 *
 * Scrollable screens auto-inset for the keyboard on iOS so a focused field at
 * the bottom of a form stays visible. On Android under edge-to-edge the activity
 * window no longer resizes for the keyboard (adjustResize is a no-op), so we add
 * the measured keyboard height as extra bottom padding — that makes the content
 * scrollable past the keyboard and lets the focused field scroll into view.
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
    const keyboardHeight = useKeyboardHeight();
    const bg = backgroundColor ?? t.colors.bg;
    const basePad = padded ? t.spacing.lg : 0;
    const pad = padded ? { padding: t.spacing.lg } : undefined;

    // Android edge-to-edge: lift the scroll content above the keyboard ourselves,
    // preserving the base bottom padding. iOS uses automaticallyAdjustKeyboardInsets.
    const androidKeyboardPad =
        Platform.OS === "android" && keyboardHeight > 0
            ? { paddingBottom: basePad + keyboardHeight }
            : null;

    if (scroll) {
        return (
            <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: bg }, style]}>
                <ScrollView
                    style={styles.flex}
                    contentContainerStyle={[pad, contentContainerStyle, androidKeyboardPad]}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
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
