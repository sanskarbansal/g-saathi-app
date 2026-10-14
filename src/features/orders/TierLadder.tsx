import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";
import { Layers } from "lucide-react-native";

import { useTheme } from "@/theme";
import { AppText } from "@/ui";
import { formatPrice } from "@/utils/format";

export interface TierRung {
    minQuantity: number;
    unitPrice: number;
}

interface Props {
    /** List price for a single unit (before any rung). */
    basePrice: number;
    /** Discount rungs, ascending by minQuantity (as the server returns them). */
    tiers: TierRung[] | undefined | null;
    /** Current quantity in the cart — highlights the rung reached and drives the nudge. */
    quantity: number;
    /** "chips" (catalog row, compact) or "detail" (checkout line, with the next-rung nudge). */
    variant?: "chips" | "detail";
    style?: ViewStyle;
}

/** The rung that applies at `quantity` (highest minQuantity ≤ quantity), or null at base. */
export function activeTier(tiers: TierRung[] | undefined | null, quantity: number): TierRung | null {
    if (!tiers || tiers.length === 0) return null;
    let hit: TierRung | null = null;
    for (const r of tiers) if (quantity >= r.minQuantity) hit = r;
    return hit;
}

/** The next rung above `quantity`, or null when the top rung is already reached. */
export function nextTier(tiers: TierRung[] | undefined | null, quantity: number): TierRung | null {
    if (!tiers || tiers.length === 0) return null;
    return tiers.find((r) => r.minQuantity > quantity) ?? null;
}

/**
 * Quantity-break price ladder for one variant — the "buy more, pay less" slabs the
 * kirana owner is entitled to. Shows every rung as a chip (base → each discount), marks
 * the rung the current quantity has reached, and (in detail mode) nudges toward the
 * next one: "Add 3 more → ₹80 each". Renders nothing when a variant has no rungs.
 */
export function TierLadder({ basePrice, tiers, quantity, variant = "chips", style }: Props) {
    const t = useTheme();
    const { t: tr } = useTranslation();
    if (!tiers || tiers.length === 0) return null;

    const active = activeTier(tiers, quantity);
    const next = nextTier(tiers, quantity);
    // Rung chips: base price first (labelled "1+"), then each discount rung.
    const rungs: { key: string; label: string; price: number; on: boolean }[] = [
        { key: "base", label: tr("shopOrder.tier.base"), price: basePrice, on: quantity > 0 && !active },
        ...tiers.map((r) => ({
            key: String(r.minQuantity),
            label: tr("shopOrder.tier.from", { qty: r.minQuantity }),
            price: r.unitPrice,
            on: active?.minQuantity === r.minQuantity,
        })),
    ];

    return (
        <View style={[styles.wrap, style]}>
            <View style={styles.chips}>
                <View style={styles.header}>
                    <Layers size={12} color={t.colors.accentDk} />
                    <AppText variant="overline" color="accentDk">
                        {tr("shopOrder.tier.title")}
                    </AppText>
                </View>
                {rungs.map((r) => (
                    <View
                        key={r.key}
                        style={[
                            styles.chip,
                            {
                                backgroundColor: r.on ? t.colors.primary : t.colors.tertiary,
                                borderColor: r.on ? t.colors.primary : t.colors.secondary,
                            },
                        ]}
                    >
                        <AppText variant="caption" color={r.on ? "white" : "primary"}>
                            {r.label}
                        </AppText>
                        <AppText variant="label" color={r.on ? "accentLt" : "primary"}>
                            {formatPrice(r.price)}
                        </AppText>
                    </View>
                ))}
            </View>
            {variant === "detail" && next ? (
                <AppText variant="caption" color="accentDk" style={styles.nudge}>
                    {tr("shopOrder.tier.nudge", { more: next.minQuantity - quantity, price: formatPrice(next.unitPrice) })}
                </AppText>
            ) : null}
            {variant === "detail" && active && !next ? (
                <AppText variant="caption" color="accentDk" style={styles.nudge}>
                    {tr("shopOrder.tier.best")}
                </AppText>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { marginTop: 2, gap: 2 },
    header: { flexDirection: "row", alignItems: "center", gap: 4, marginRight: 2 },
    chips: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 5 },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 7,
        height: 22,
        borderRadius: 999,
        borderWidth: 1,
    },
    nudge: { marginTop: 2 },
});
