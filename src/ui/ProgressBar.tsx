import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme } from "@/theme";

interface ProgressBarProps {
    /** 0..1 */
    progress: number;
    height?: number;
    trackColor?: string;
    color?: string;
    gradient?: boolean;
    onDark?: boolean;
    style?: ViewStyle;
}

/** Horizontal progress track with a lime fill (gradient by default). */
export function ProgressBar({
    progress,
    height = 10,
    trackColor,
    color,
    gradient = true,
    onDark = false,
    style,
}: ProgressBarProps) {
    const t = useTheme();
    const pct = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
    const track = trackColor ?? (onDark ? t.colors.onDarkFaint : t.colors.subtle);
    const fill = color ?? t.colors.accent;

    return (
        <View
            style={[{ height, borderRadius: height / 2, backgroundColor: track }, styles.track, style]}
            accessibilityRole="progressbar"
            accessibilityValue={{ now: Math.round(pct * 100), min: 0, max: 100 }}
        >
            <View style={[styles.fillWrap, { width: `${pct * 100}%`, borderRadius: height / 2 }]}>
                {gradient ? (
                    <LinearGradient
                        colors={t.gradients.accent}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[StyleSheet.absoluteFill, { borderRadius: height / 2 }]}
                    />
                ) : (
                    <View
                        style={[
                            StyleSheet.absoluteFill,
                            { backgroundColor: fill, borderRadius: height / 2 },
                        ]}
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    track: { overflow: "hidden", width: "100%" },
    fillWrap: { height: "100%", minWidth: 4 },
});
