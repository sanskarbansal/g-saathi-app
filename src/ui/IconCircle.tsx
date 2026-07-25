import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

import { useTheme } from "@/theme";

interface IconCircleProps {
    children: React.ReactNode;
    size?: number;
    color?: string;
    style?: ViewStyle;
}

/** A tinted round container for a leading icon (used in list rows, tiles). */
export function IconCircle({ children, size = 44, color, style }: IconCircleProps) {
    const t = useTheme();
    return (
        <View
            style={[
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: color ?? t.colors.tertiary,
                },
                styles.center,
                style,
            ]}
        >
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    center: { alignItems: "center", justifyContent: "center" },
});
