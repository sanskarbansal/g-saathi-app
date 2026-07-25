import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

import { useTheme } from "@/theme";

interface RingProps {
    /** 0..1 */
    progress: number;
    size?: number;
    strokeWidth?: number;
    trackColor?: string;
    /** Solid stroke color; ignored when `gradient` is set. */
    color?: string;
    gradient?: readonly [string, string];
    children?: React.ReactNode;
}

/**
 * Circular progress ring (SVG). Renders the arc from the top, clockwise, with an
 * optional lime gradient. Center content (a big number) goes in `children`.
 */
export function Ring({
    progress,
    size = 160,
    strokeWidth = 14,
    trackColor,
    color,
    gradient,
    children,
}: RingProps) {
    const t = useTheme();
    const pct = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
    const r = (size - strokeWidth) / 2;
    const cx = size / 2;
    const cy = size / 2;
    const circumference = 2 * Math.PI * r;
    const dashOffset = circumference * (1 - pct);
    const strokeColor = gradient ? "url(#ringGrad)" : (color ?? t.colors.accent);

    return (
        <View style={{ width: size, height: size }}>
            <Svg width={size} height={size}>
                {gradient ? (
                    <Defs>
                        <LinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                            <Stop offset="0" stopColor={gradient[0]} />
                            <Stop offset="1" stopColor={gradient[1]} />
                        </LinearGradient>
                    </Defs>
                ) : null}
                <Circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    stroke={trackColor ?? t.colors.subtle}
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                <Circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    fill="none"
                    // Start at 12 o'clock and sweep clockwise.
                    transform={`rotate(-90 ${cx} ${cy})`}
                />
            </Svg>
            {children ? (
                <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    center: { alignItems: "center", justifyContent: "center" },
});
