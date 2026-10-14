import React from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { Minus, Plus } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { useTheme } from "@/theme";
import { AppText } from "@/ui";
import { useHoldRepeat } from "./HoldStepper";

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
 * Compact (36dp) so a catalog row stays short, with hit-slop so the touch target still
 * works with a thumb in bright sunlight. Hold − or + to repeat and accelerate; tap the
 * number to open the bulk-quantity sheet.
 */
export function QtyStepper({ value, onChange, max, disabled, onPressValue, style }: Props) {
    const t = useTheme();
    const { t: tr } = useTranslation();
    const limit = typeof max === "number" && max > 0 ? max : null;
    const { start, stop, atMax } = useHoldRepeat({ value, onChange, max: limit });

    const addOne = () => {
        if (disabled) return;
        if (limit != null && value + 1 > limit) return;
        Haptics.selectionAsync().catch(() => {});
        onChange(value + 1);
    };

    if (value === 0) {
        return (
            <Pressable
                onPress={addOne}
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
            <Pressable onPressIn={() => !disabled && start(-1)} onPressOut={stop} hitSlop={{ top: 8, bottom: 8, left: 6, right: 2 }} style={styles.stepBtn} accessibilityRole="button" accessibilityLabel="−">
                <Minus size={18} color={t.colors.primary} />
            </Pressable>
            <Pressable onPress={onPressValue} disabled={!onPressValue} hitSlop={4} accessibilityLabel={tr("shopOrder.qty.edit")}>
                <AppText variant="bodyStrong" color="primary" style={[styles.value, onPressValue ? styles.valueEditable : null]}>
                    {value}
                </AppText>
            </Pressable>
            <Pressable onPressIn={() => !disabled && start(1)} onPressOut={stop} hitSlop={{ top: 8, bottom: 8, left: 2, right: 6 }} disabled={atMax} style={styles.stepBtn} accessibilityRole="button" accessibilityLabel="+">
                <Plus size={18} color={atMax ? t.colors.ink400 : t.colors.primary} />
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    addBtn: {
        height: 36,
        minWidth: 84,
        justifyContent: "center",
        paddingHorizontal: 14,
        borderRadius: 999,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    stepper: {
        height: 36,
        borderRadius: 999,
        borderWidth: 1.5,
        flexDirection: "row",
        alignItems: "center",
    },
    // 36dp visual, with hitSlop on the buttons so the touch target still clears 44dp.
    stepBtn: { width: 40, height: 36, alignItems: "center", justifyContent: "center" },
    value: { minWidth: 30, textAlign: "center" },
    valueEditable: { textDecorationLine: "underline", textDecorationStyle: "dotted" },
});
