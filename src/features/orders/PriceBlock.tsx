import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";

import { useTheme } from "@/theme";
import { AppText } from "@/ui";
import { formatPrice } from "@/utils/format";

interface Props {
    /** What the owner pays per base unit right now (segment / rung price). */
    price: number;
    /** Printed MRP per base unit. Always shown, so the owner sees the margin. */
    mrp: number;
    /** Selling unit for the "per piece" hint. */
    unit?: string | null;
    /** "lg" stacks price over MRP; "md" / "sm" keep both on one wrapping line. */
    size?: "sm" | "md" | "lg";
    style?: ViewStyle;
}

/** Rupees saved per unit against MRP, and the rounded percentage — null when there is no saving. */
export function mrpSaving(price: number, mrp: number): { amount: number; pct: number } | null {
    if (!(mrp > 0) || !(price >= 0) || price >= mrp) return null;
    const amount = mrp - price;
    return { amount, pct: Math.round((amount / mrp) * 100) };
}

/**
 * Selling price with the MRP beside it, labelled. When the price is under MRP the MRP is
 * struck through and the saving is called out ("₹30 off · 11%"); when it equals MRP the
 * MRP is simply stated so the owner still sees it.
 */
export function PriceBlock({ price, mrp, unit, size = "lg", style }: Props) {
    const t = useTheme();
    const { t: tr } = useTranslation();
    const saving = mrpSaving(price, mrp);
    const u = unit?.trim();

    return (
        <View style={[size === "lg" ? styles.wrap : styles.wrapInline, style]}>
            <View style={styles.priceLine}>
                <AppText variant={size === "lg" ? "h2" : size === "md" ? "title" : "bodyStrong"} color="ink900">
                    {formatPrice(price)}
                </AppText>
                {u ? (
                    <AppText variant="caption" muted>
                        {tr("shopOrder.price.perUnit", { unit: u })}
                    </AppText>
                ) : null}
            </View>
            {mrp > 0 ? (
                <View style={styles.mrpLine}>
                    <AppText variant="caption" muted>
                        {tr("shopOrder.price.mrp")}{" "}
                    </AppText>
                    <AppText variant="caption" muted style={saving ? styles.strike : undefined}>
                        {formatPrice(mrp)}
                    </AppText>
                    {saving ? (
                        <View style={[styles.savePill, { backgroundColor: t.colors.tertiary }]}>
                            <AppText variant="caption" color="primary">
                                {tr("shopOrder.price.off", { amount: formatPrice(saving.amount), pct: saving.pct })}
                            </AppText>
                        </View>
                    ) : null}
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { gap: 2 },
    wrapInline: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 10, rowGap: 2 },
    priceLine: { flexDirection: "row", alignItems: "baseline", gap: 6, flexWrap: "wrap" },
    mrpLine: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 2 },
    strike: { textDecorationLine: "line-through" },
    savePill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, marginLeft: 6 },
});
