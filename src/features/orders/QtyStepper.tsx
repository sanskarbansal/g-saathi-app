import React from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { Minus, Plus } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { useTheme } from "@/theme";
import { AppText } from "@/ui";

interface Props {
    value: number;
    onChange: (next: number) => void;
    max?: number | null;
    disabled?: boolean;
    /** Tap the number to open bulk entry (packs / typed quantity). */
    onPressValue?: () => void;
    style?: ViewStyle;
}

/**
 * Field-friendly quantity control: a lime "Add" pill at zero, a −/n/+ stepper otherwise.
 * 44dp targets so it works with a thumb in bright sunlight.
 */
export function QtyStepper({ value, onChange, max, disabled, onPressValue, style }: Props) {
    const t = useTheme();
    const { t: tr } = useTranslation();
    const atMax = typeof max === "number" && max > 0 && value >= max;

    const bump = (delta: number) => {
        if (disabled) return;
        const next = Math.max(0, value + delta);
        if (typeof max === "number" && max > 0 && next > max) return;
        Haptics.selectionAsync().catch(() => {});
        onChange(next);
    };

    if (value === 0) {
        return (
            <Pressable
                onPress={() => bump(1)}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={tr("shopOrder.add")}
                style={[styles.addBtn, { backgroundColor: disabled ? t.colors.subtle : t.colors.accent }, style]}
            >
                <Plus size={16} color={disabled ? t.colors.ink400 : t.colors.primary} />
                <AppText variant="label" color={disabled ? "ink400" : "primary"}>
                    {tr("shopOrder.add")}
                </AppText>
            </Pressable>
        );
    }

    return (
        <View style={[styles.stepper, { borderColor: t.colors.accentDk, backgroundColor: t.colors.tertiary }, style]}>
            <Pressable onPress={() => bump(-1)} hitSlop={6} style={styles.stepBtn} accessibilityLabel="−">
                <Minus size={18} color={t.colors.primary} />
            </Pressable>
            <Pressable onPress={onPressValue} disabled={!onPressValue} hitSlop={4} accessibilityLabel={tr("shopOrder.qty.edit")}>
                <AppText variant="bodyStrong" color="primary" style={[styles.value, onPressValue ? styles.valueEditable : null]}>
                    {value}
                </AppText>
            </Pressable>
            <Pressable onPress={() => bump(1)} hitSlop={6} disabled={atMax} style={styles.stepBtn} accessibilityLabel="+">
                <Plus size={18} color={atMax ? t.colors.ink400 : t.colors.primary} />
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    addBtn: {
        height: 40,
        paddingHorizontal: 14,
        borderRadius: 999,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    stepper: {
        height: 40,
        borderRadius: 999,
        borderWidth: 1.5,
        flexDirection: "row",
        alignItems: "center",
    },
    stepBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
    value: { minWidth: 28, textAlign: "center" },
    valueEditable: { textDecorationLine: "underline", textDecorationStyle: "dotted" },
});
