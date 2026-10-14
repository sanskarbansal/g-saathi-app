import React from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";
import { Boxes, Minus, Plus } from "lucide-react-native";

import type { CatalogUnit } from "@/api";
import { useTheme } from "@/theme";
import { AppText } from "@/ui";
import { packBreakdown } from "./CartContext";
import { useHoldRepeat } from "./HoldStepper";

interface Props {
    /** Current BASE quantity of the line. */
    quantity: number;
    /** Sellable units, base first (from `sellableUnits`). Renders nothing without a pack. */
    units: CatalogUnit[];
    /** Hard ceiling in base units (null = none). */
    limit: number | null;
    disabled?: boolean;
    /** Called with the new BASE quantity. */
    onChange: (quantity: number) => void;
    style?: ViewStyle;
}

/**
 * One −/+ row per pack (Box ×6, Case ×24 …) that adds or removes a whole pack at a time.
 * The count shown is how many of that pack the quantity contains, explained greedily from
 * the biggest pack down, so "30" with Case 24 and Box 6 reads Case 1 · Box 1. Hold to repeat.
 */
export function PackControls({ quantity, units, limit, disabled, onChange, style }: Props) {
    const packs = units.filter((u) => !u.isBase && u.factorToBase > 1);
    if (packs.length === 0) return null;
    const breakdown = packBreakdown(quantity, units) ?? [];
    return (
        <View style={[styles.wrap, style]}>
            {packs.map((u) => (
                <PackRow
                    key={u.id}
                    unit={u}
                    count={breakdown.find((b) => b.unit.id === u.id)?.count ?? 0}
                    quantity={quantity}
                    limit={limit}
                    disabled={disabled || (u.available != null && u.available <= 0 && quantity < u.factorToBase)}
                    onChange={onChange}
                />
            ))}
        </View>
    );
}

function PackRow({ unit, count, quantity, limit, disabled, onChange }: { unit: CatalogUnit; count: number; quantity: number; limit: number | null; disabled?: boolean; onChange: (q: number) => void }) {
    const t = useTheme();
    const { t: tr } = useTranslation();
    const f = unit.factorToBase;
    // Drive the hold in units of this pack: value = whole packs that fit, bounded by the base limit.
    const maxPacks = limit != null ? Math.floor(limit / f) : null;
    const { start, stop } = useHoldRepeat({
        value: Math.floor(quantity / f),
        min: 0,
        max: maxPacks,
        accelerate: false,
        onChange: (packsNow) => {
            const packsBefore = Math.floor(quantity / f);
            onChange(Math.max(0, quantity + (packsNow - packsBefore) * f));
        },
    });
    const canRemove = !disabled && quantity >= f;
    const canAdd = !disabled && (limit == null || quantity + f <= limit);

    return (
        <View style={[styles.row, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
            <Pressable
                onPressIn={() => canRemove && start(-1)}
                onPressOut={stop}
                disabled={!canRemove}
                accessibilityRole="button"
                accessibilityLabel={tr("shopOrder.qty.removePack", { name: unit.name })}
                style={[styles.btn, { opacity: canRemove ? 1 : 0.35 }]}
            >
                <Minus size={16} color={t.colors.primary} />
            </Pressable>
            <View style={styles.label}>
                <Boxes size={13} color={t.colors.ink500} />
                <AppText variant="label" color="ink900">
                    {unit.name}
                </AppText>
                <AppText variant="caption" muted>
                    ×{f}
                </AppText>
                <AppText variant="label" color={count > 0 ? "accentDk" : "ink400"} style={styles.count}>
                    {count}
                </AppText>
            </View>
            <Pressable
                onPressIn={() => canAdd && start(1)}
                onPressOut={stop}
                disabled={!canAdd}
                accessibilityRole="button"
                accessibilityLabel={tr("shopOrder.qty.addPack", { name: unit.name })}
                style={[styles.btn, { opacity: canAdd ? 1 : 0.35 }]}
            >
                <Plus size={16} color={t.colors.primary} />
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    row: { flexDirection: "row", alignItems: "center", height: 32, borderRadius: 999, borderWidth: 1, paddingHorizontal: 1 },
    btn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
    label: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 2 },
    count: { minWidth: 16, textAlign: "center", marginLeft: 2 },
});
