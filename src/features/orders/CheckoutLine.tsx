import React from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Package, X } from "lucide-react-native";

import type { CatalogUnit } from "@/api";
import { useTheme } from "@/theme";
import { AppText } from "@/ui";
import { formatPrice } from "@/utils/format";
import { packBreakdown, type CartLine } from "./CartContext";
import { PackControls } from "./PackControls";
import { mrpSaving } from "./PriceBlock";
import { activeTier, nextTier, type TierRung } from "./TierLadder";
import { QtyStepper } from "./QtyStepper";

interface Props {
    line: CartLine;
    /** Server-priced figures for this line once the preview has landed. */
    unitPrice: number;
    mrp: number;
    basePrice: number;
    tiers: TierRung[] | undefined | null;
    lineTotal: number;
    hasTierDiscount: boolean;
    limit: number | null;
    onChange: (quantity: number) => void;
    onPressQuantity: () => void;
    onRemove: () => void;
    first?: boolean;
}

/**
 * One cart line on the review screen, built to be read aloud to a kirana owner: name, then
 * the facts (variant · weight · unit · pack sizes) as small chips, then price vs MRP. The
 * line total sits on the right; a single control row underneath handles loose and pack
 * quantities. Tier rungs are condensed to one nudge line — the full ladder lives in the sheet.
 */
export function CheckoutLine({ line: l, unitPrice, mrp, basePrice, tiers, lineTotal, hasTierDiscount, limit, onChange, onPressQuantity, onRemove, first }: Props) {
    const t = useTheme();
    const { t: tr } = useTranslation();
    const saving = mrpSaving(unitPrice, mrp);
    const breakdown = packBreakdown(l.quantity, l.units);
    const packs = l.units.filter((u) => !u.isBase && u.factorToBase > 1);
    const base = l.units.find((u) => u.isBase);
    const unitLabel = (base?.name ?? l.unit ?? "").trim();
    const next = nextTier(tiers, l.quantity);
    const active = activeTier(tiers, l.quantity);
    const hasPacks = packs.length > 0;

    return (
        <View style={[styles.line, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.colors.border }]}>
            <View style={styles.head}>
                <View style={[styles.thumb, { backgroundColor: t.colors.subtle }]}>
                    {l.image ? <Image source={{ uri: l.image }} style={styles.thumbImg} resizeMode="cover" /> : <Package size={18} color={t.colors.ink400} />}
                </View>

                <View style={styles.body}>
                    <AppText variant="subtitle">{l.productName}</AppText>
                    <SpecChips variantName={l.variantName} weight={l.weight} unit={unitLabel} packs={packs} />
                    <View style={styles.priceRow}>
                        <AppText variant="bodyStrong" color="ink900">
                            {formatPrice(unitPrice)}
                            {unitLabel ? (
                                <AppText variant="caption" muted>
                                    {" "}
                                    {tr("shopOrder.price.perUnit", { unit: unitLabel })}
                                </AppText>
                            ) : null}
                        </AppText>
                        {mrp > 0 ? (
                            <AppText variant="caption" muted>
                                {tr("shopOrder.price.mrp")}{" "}
                                <AppText variant="caption" muted style={saving ? styles.strike : undefined}>
                                    {formatPrice(mrp)}
                                </AppText>
                            </AppText>
                        ) : null}
                        {saving ? (
                            <AppText variant="caption" color="accentDk">
                                {tr("shopOrder.price.offPct", { pct: saving.pct })}
                            </AppText>
                        ) : null}
                    </View>
                </View>

                <View style={styles.totalWrap}>
                    <AppText variant="title" color="primary">
                        {formatPrice(lineTotal)}
                    </AppText>
                    <AppText variant="caption" muted align="right">
                        {tr("shopOrder.price.lineCalc", { qty: l.quantity, price: formatPrice(unitPrice) })}
                    </AppText>
                    {hasTierDiscount || active ? (
                        <AppText variant="caption" color="accentDk" align="right">
                            {tr("shopOrder.tier.title")}
                        </AppText>
                    ) : null}
                </View>
            </View>

            {/* Loose −/+ then one −/+ per pack, all on one wrapping row; remove at the end. */}
            <View style={styles.controls}>
                <View style={styles.steppers}>
                    <QtyStepper value={l.quantity} max={limit} onChange={onChange} onPressValue={onPressQuantity} />
                    {hasPacks ? <PackControls quantity={l.quantity} units={l.units} limit={limit} onChange={onChange} /> : null}
                </View>
                <Pressable onPress={onRemove} hitSlop={8} style={[styles.remove, { backgroundColor: t.colors.subtle }]} accessibilityRole="button" accessibilityLabel={tr("common.remove")}>
                    <X size={14} color={t.colors.ink700} />
                </Pressable>
            </View>

            {(hasPacks && breakdown && breakdown.length > 0) || next || (active && !next) ? (
                <View style={styles.meta}>
                    {hasPacks && breakdown && breakdown.length > 0 ? (
                        <AppText variant="caption" color="ink700">
                            {"= " + breakdown.map((b) => `${b.count} ${b.unit.name}`).join(" + ")}
                        </AppText>
                    ) : null}
                    {next ? (
                        <AppText variant="caption" color="accentDk">
                            {tr("shopOrder.tier.nudge", { more: next.minQuantity - l.quantity, price: formatPrice(next.unitPrice) })}
                        </AppText>
                    ) : active && basePrice > active.unitPrice ? (
                        <AppText variant="caption" color="accentDk">
                            {tr("shopOrder.tier.best")}
                        </AppText>
                    ) : null}
                </View>
            ) : null}
        </View>
    );
}

/**
 * The facts an agent reads out before the owner says yes — variant, weight, selling unit and
 * every pack size — each as a tiny labelled chip so none is guessed from a "500g · kg" string.
 */
function SpecChips({ variantName, weight, unit, packs }: { variantName?: string | null; weight?: string | null; unit?: string | null; packs: CatalogUnit[] }) {
    const t = useTheme();
    const { t: tr } = useTranslation();
    const chips: { key: string; label?: string; value: string }[] = [];
    const vn = variantName?.trim();
    const wt = weight?.trim();
    const un = unit?.trim();
    if (vn && vn.toLowerCase() !== "default") chips.push({ key: "variant", label: tr("shopOrder.specs.variant"), value: vn });
    if (wt && wt !== vn) chips.push({ key: "weight", label: tr("shopOrder.specs.weight"), value: wt });
    if (un) chips.push({ key: "unit", label: tr("shopOrder.specs.unit"), value: un });
    for (const p of packs) chips.push({ key: p.id, value: tr("shopOrder.specs.pack", { name: p.name, factor: p.factorToBase, unit: un || tr("shopOrder.qty.units") }) });
    if (chips.length === 0) return null;
    return (
        <View style={styles.chips} accessibilityLabel={chips.map((c) => (c.label ? `${c.label} ${c.value}` : c.value)).join(", ")}>
            {chips.map((c) => (
                <View key={c.key} style={[styles.chip, { backgroundColor: t.colors.subtle }]}>
                    {c.label ? (
                        <AppText variant="caption" muted>
                            {c.label}{" "}
                        </AppText>
                    ) : null}
                    <AppText variant="label" color="ink900">
                        {c.value}
                    </AppText>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    line: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
    head: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    thumb: { width: 44, height: 44, borderRadius: 8, alignItems: "center", justifyContent: "center", overflow: "hidden" },
    thumbImg: { width: 44, height: 44 },
    body: { flex: 1, gap: 4 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
    chip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    priceRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", columnGap: 8, rowGap: 0 },
    totalWrap: { alignItems: "flex-end", maxWidth: "34%", gap: 1 },
    controls: { flexDirection: "row", alignItems: "center", gap: 8 },
    steppers: { flex: 1, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
    remove: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    meta: { flexDirection: "row", flexWrap: "wrap", columnGap: 10, rowGap: 2 },
    strike: { textDecorationLine: "line-through" },
});
