import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, type DimensionValue, type ViewStyle } from "react-native";

import { useTheme } from "@/theme";

interface SkeletonProps {
    width?: DimensionValue;
    height?: number;
    radius?: number;
    style?: ViewStyle;
}

/** A pulsing placeholder block for loading states. */
export function Skeleton({ width = "100%", height = 16, radius = 8, style }: SkeletonProps) {
    const t = useTheme();
    const opacity = useRef(new Animated.Value(0.5)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [opacity]);

    return (
        <Animated.View
            style={[
                { width, height, borderRadius: radius, backgroundColor: t.colors.subtle, opacity },
                style,
            ]}
        />
    );
}

/** Convenience: a card-shaped skeleton block. */
export function SkeletonCard({ height = 120 }: { height?: number }) {
    const t = useTheme();
    return (
        <View style={[styles.card, { borderRadius: t.radius.lg, backgroundColor: t.colors.surface }]}>
            <Skeleton width="55%" height={14} />
            <Skeleton width="35%" height={28} style={{ marginTop: 12 }} />
            <Skeleton width="80%" height={10} style={{ marginTop: 16 }} />
        </View>
    );
}

const styles = StyleSheet.create({
    card: { padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: "#E5E7EB" },
});
