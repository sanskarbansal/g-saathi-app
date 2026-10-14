import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";

import { useTheme } from "@/theme";
import { AppText } from "@/ui";

interface Props {
    /** The variant's own name as the hub set it up — "500g", "1kg", "Pack of 6". */
    variantName?: string | null;
    /** The selling unit — "piece", "kg", "ml", "bag". */
    unit?: string | null;
    /** Free-text net weight / volume — "500g", "1kg". */
    weight?: string | null;
    /** "md" for the sheet, "sm" for tighter tiles. */
    size?: "sm" | "md";
    /** "tiles" (label over value) or "inline" — one wrapping line, for dense lists. */
    layout?: "tiles" | "inline";
    style?: ViewStyle;
}

/**
 * The three facts a kirana owner asks about before saying yes — variant, unit and weight —
 * each shown with its own label so nothing is guessed from a "500g · kg" string. Tiles for
 * missing facts are simply left out; renders nothing when all three are missing.
 */
export function VariantSpecs({ variantName, unit, weight, size = "md", layout = "tiles", style }: Props) {
    const t = useTheme();
    const { t: tr } = useTranslation();
    const specs: { key: string; label: string; value: string }[] = [];
    const vn = variantName?.trim();
    const un = unit?.trim();
    const wt = weight?.trim();
    // A "Default" variant name tells the owner nothing — skip it.
    if (vn && vn.toLowerCase() !== "default") specs.push({ key: "variant", label: tr("shopOrder.specs.variant"), value: vn });
    if (un) specs.push({ key: "unit", label: tr("shopOrder.specs.unit"), value: un });
    if (wt) specs.push({ key: "weight", label: tr("shopOrder.specs.weight"), value: wt });
    if (specs.length === 0) return null;

    if (layout === "inline") {
        return (
            <View style={[styles.inlineRow, style]} accessibilityLabel={specs.map((s) => `${s.label} ${s.value}`).join(", ")}>
                {specs.map((s, i) => (
                    <AppText key={s.key} variant="caption" color="ink900">
                        {i > 0 ? <AppText variant="caption" color="ink400">{"  ·  "}</AppText> : null}
                        <AppText variant="caption" muted>
                            {s.label}{" "}
                        </AppText>
                        <AppText variant="label" color="ink900">
                            {s.value}
                        </AppText>
                    </AppText>
                ))}
            </View>
        );
    }

    return (
        <View style={[styles.row, style]} accessibilityLabel={specs.map((s) => `${s.label} ${s.value}`).join(", ")}>
            {specs.map((s) => (
                <View
                    key={s.key}
                    style={[styles.tile, size === "sm" ? styles.tileSm : styles.tileMd, { backgroundColor: t.colors.subtle, borderColor: t.colors.border }]}
                >
                    <AppText variant="caption" muted>
                        {s.label}
                    </AppText>
                    <AppText variant={size === "sm" ? "label" : "subtitle"} color="ink900">
                        {s.value}
                    </AppText>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    inlineRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
    tile: { borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, gap: 1 },
    tileMd: { paddingHorizontal: 10, paddingVertical: 6 },
    tileSm: { paddingHorizontal: 8, paddingVertical: 4 },
});
