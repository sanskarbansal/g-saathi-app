import React from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";

import { useTheme } from "@/theme";
import { AppText } from "./Text";

export interface SegmentOption<T extends string> {
    label: string;
    value: T;
}

interface SegmentedProps<T extends string> {
    options: SegmentOption<T>[];
    value: T;
    onChange: (value: T) => void;
    style?: ViewStyle;
}

/** Segmented control (e.g. language चुनें). Selected segment fills with lime. */
export function Segmented<T extends string>({
    options,
    value,
    onChange,
    style,
}: SegmentedProps<T>) {
    const t = useTheme();
    return (
        <View
            style={[
                styles.wrap,
                { backgroundColor: t.colors.subtle, borderRadius: t.radius.md },
                style,
            ]}
        >
            {options.map((opt) => {
                const active = opt.value === value;
                return (
                    <Pressable
                        key={opt.value}
                        onPress={() => onChange(opt.value)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        style={[
                            styles.seg,
                            { borderRadius: t.radius.md - 3 },
                            active && { backgroundColor: t.colors.accent, ...t.shadow.card },
                        ]}
                    >
                        <AppText
                            variant="subtitle"
                            style={{ color: active ? t.colors.primary : t.colors.ink500 }}
                            numberOfLines={1}
                        >
                            {opt.label}
                        </AppText>
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { flexDirection: "row", padding: 3 },
    seg: {
        flex: 1,
        minHeight: 44,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 8,
    },
});
