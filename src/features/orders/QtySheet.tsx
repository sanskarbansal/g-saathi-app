import React, { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react-native";

import type { CatalogUnit } from "@/api";
import { useTheme } from "@/theme";
import { AppText, Button, useKeyboardHeight } from "@/ui";
import { formatPrice } from "@/utils/format";
import { packBreakdown } from "./CartContext";
import { HoldStepper } from "./HoldStepper";
import { PriceBlock } from "./PriceBlock";
import { TierLadder, activeTier, type TierRung } from "./TierLadder";
import { VariantSpecs } from "./VariantSpecs";

export interface QtySheetTarget {
    title: string;
    subtitle?: string;
    /** Variant / unit / weight, shown labelled under the title. */
    specs?: { variantName?: string | null; unit?: string | null; weight?: string | null };
    /** Printed MRP per base unit — shown beside the price so the owner sees the saving. */
    mrp?: number;
    /** Current BASE quantity in the cart. */
    quantity: number;
    /** Sellable packs, base first (from `sellableUnits`). */
    units: CatalogUnit[];
    basePrice: number;
    unitPrice: number;
    tiers: TierRung[];
    maxQuantityPerOrder: number | null;
    /** Base units in stock, when known (caps the pack count). */
    baseAvailable?: number | null;
}

interface Props {
    visible: boolean;
    target: QtySheetTarget | null;
    onClose: () => void;
    /** Base quantity plus the pack the agent used (null = typed as loose units). */
    onApply: (quantity: number, pack: { unitId: string; packQuantity: number } | null) => void;
}

const QUICK_ADDS = [5, 10, 25, 50, 100];

/**
 * Bulk quantity entry. Two ways in: pick a pack (case / box / …) and how many of it, or
 * type a loose base quantity. Both resolve to BASE units — that is what the order stores —
 * and the sheet shows the resulting total, the rung it lands on, and the line price.
 */
export function QtySheet({ visible, target, onClose, onApply }: Props) {
    const t = useTheme();
    const { t: tr } = useTranslation();
    const keyboardHeight = useKeyboardHeight();

    const base = target?.units.find((u) => u.isBase) ?? null;
    const packs = useMemo(() => (target?.units ?? []).filter((u) => !u.isBase && u.factorToBase > 1), [target]);

    const [unitId, setUnitId] = useState<string | null>(null);
    const [count, setCount] = useState("");

    // Reset per open: start from the pack the line already used, else loose units.
    useEffect(() => {
        if (!visible || !target) return;
        const bd = packBreakdown(target.quantity, target.units);
        const first = bd?.[0];
        const single = bd && bd.length === 1 && first && !first.unit.isBase ? first : null;
        setUnitId(single ? single.unit.id : null);
        setCount(target.quantity > 0 ? String(single ? single.count : target.quantity) : "");
    }, [visible, target]);

    // ── Everything below runs on EVERY render (hooks must stay in a fixed order), so the
    //    limit maths tolerates a null target; the early return comes after the last hook. ──
    const chosen = unitId ? packs.find((u) => u.id === unitId) ?? null : null;
    const factor = chosen ? chosen.factorToBase : 1;

    // The most this line can hold, in BASE units: the per-order cap and the stock on hand,
    // whichever is tighter (null = unbounded). In the chosen pack that is `maxCount` packs.
    const cap = target?.maxQuantityPerOrder ?? null;
    const baseAvailable = target?.baseAvailable ?? null;
    const limits = [cap != null && cap > 0 ? cap : null, baseAvailable].filter((v): v is number => v != null);
    const limitBase = limits.length ? Math.min(...limits) : null;
    const maxCount = limitBase != null ? Math.floor(limitBase / factor) : null;
    const limitReason: "cap" | "stock" | null =
        limitBase == null ? null : cap != null && cap > 0 && limitBase === cap && (baseAvailable == null || cap <= baseAvailable) ? "cap" : "stock";

    /**
     * Clamp a requested count to the maximum this line allows. Typing 500 into an item that
     * caps at 120 lands on 120 (and says so) instead of an error the agent has to fix by hand.
     */
    const clampCount = (raw: number): number => {
        const v = Math.max(0, Math.floor(raw));
        return maxCount != null && v > maxCount ? maxCount : v;
    };
    const requested = Math.max(0, Math.floor(Number(count) || 0));
    const n = clampCount(requested);
    const clamped = n !== requested;

    // Keep the field showing the clamped value so what the agent sees is what gets applied.
    useEffect(() => {
        if (clamped) setCount(String(n));
    }, [clamped, n]);

    if (!target) return null;

    const baseQty = n * factor;
    const rung = activeTier(target.tiers, baseQty);
    const unit = rung ? rung.unitPrice : target.unitPrice;
    const breakdown = packBreakdown(baseQty, target.units);

    const bump = (delta: number) => {
        Haptics.selectionAsync().catch(() => {});
        setCount(String(clampCount(n + delta)));
    };

    const apply = () => {
        if (baseQty <= 0) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        onApply(baseQty, chosen ? { unitId: chosen.id, packQuantity: n } : null);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            {/*
             * Keep the Apply button above the keyboard on both platforms. iOS: a real
             * KeyboardAvoidingView (behavior "padding") resizes the sheet as the keyboard
             * animates in. Android: KAV is unreliable inside a Modal under edge-to-edge, so the
             * measured keyboard height is applied as bottom padding instead — the pattern the
             * other sheets in this app use. The sheet caps at 88% of what remains, and the
             * scroll area is the only thing that shrinks, so the button is always on screen.
             */}
            <KeyboardAvoidingView
                style={[styles.backdrop, Platform.OS === "android" ? { paddingBottom: keyboardHeight } : null]}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                enabled={Platform.OS === "ios"}
            >
                <Pressable style={styles.flex} onPress={onClose} />
                <View style={[styles.sheet, { backgroundColor: t.colors.surface }]}>
                    <View style={styles.handle} />
                    <View style={styles.header}>
                        <View style={[styles.flex, styles.headText]}>
                            <AppText variant="h2">{target.title}</AppText>
                            {target.subtitle ? (
                                <AppText variant="caption" muted>
                                    {target.subtitle}
                                </AppText>
                            ) : null}
                            {target.specs ? <VariantSpecs size="sm" {...target.specs} /> : null}
                            {target.mrp != null ? <PriceBlock size="sm" price={unit} mrp={target.mrp} unit={base?.name ?? target.specs?.unit} /> : null}
                        </View>
                        <Pressable onPress={onClose} hitSlop={10} style={[styles.closeBtn, { backgroundColor: t.colors.subtle }]}>
                            <X size={20} color={t.colors.ink500} />
                        </Pressable>
                    </View>

                    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" style={styles.scroll} showsVerticalScrollIndicator={false}>
                        {/* Unit picker: loose base vs each pack */}
                        <AppText variant="overline" muted style={styles.label}>
                            {tr("shopOrder.qty.unit")}
                        </AppText>
                        <View style={styles.chips}>
                            <UnitChip
                                label={base ? `${tr("shopOrder.qty.loose")} · ${base.name}` : tr("shopOrder.qty.loose")}
                                selected={!chosen}
                                onPress={() => setUnitId(null)}
                            />
                            {packs.map((u) => (
                                <UnitChip
                                    key={u.id}
                                    label={`${u.name} × ${u.factorToBase}`}
                                    sub={u.available != null ? tr("shopOrder.qty.packsLeft", { count: u.available }) : undefined}
                                    selected={chosen?.id === u.id}
                                    disabled={u.available != null && u.available <= 0}
                                    onPress={() => setUnitId(u.id)}
                                />
                            ))}
                        </View>

                        {/* Count: big −/+ with hold-to-accelerate — no keyboard, for packs and loose units alike. */}
                        <View style={styles.field}>
                            <AppText variant="label" color="ink700" style={styles.label}>
                                {chosen ? tr("shopOrder.qty.howManyPacks", { name: chosen.name }) : tr("shopOrder.qty.howManyUnits", { name: base?.name ?? tr("shopOrder.qty.units") })}
                            </AppText>
                            <HoldStepper
                                value={n}
                                max={maxCount}
                                onChange={(v) => setCount(String(v))}
                                testID="qty-count"
                                caption={
                                    chosen
                                        ? tr("shopOrder.qty.packMath", { count: n, name: chosen.name, factor: factor, total: baseQty, unit: base?.name ?? tr("shopOrder.qty.units") })
                                        : tr("shopOrder.qty.holdHint")
                                }
                            />
                        </View>
                        <View style={styles.chips}>
                            {QUICK_ADDS.filter((q) => maxCount == null || n < maxCount).map((q) => (
                                <Pressable key={q} onPress={() => bump(q)} style={[styles.quick, { backgroundColor: t.colors.tertiary, borderColor: t.colors.secondary }]}>
                                    <AppText variant="label" color="primary">
                                        +{q}
                                    </AppText>
                                </Pressable>
                            ))}
                            {maxCount != null && maxCount > 0 && n < maxCount ? (
                                <Pressable onPress={() => { Haptics.selectionAsync().catch(() => {}); setCount(String(maxCount)); }} style={[styles.quick, { backgroundColor: t.colors.primary, borderColor: t.colors.primary }]}>
                                    <AppText variant="label" color="white">
                                        {tr("shopOrder.qty.max", { count: maxCount })}
                                    </AppText>
                                </Pressable>
                            ) : null}
                            {n > 0 ? (
                                <Pressable onPress={() => setCount("")} style={[styles.quick, { backgroundColor: t.colors.subtle, borderColor: t.colors.border }]}>
                                    <AppText variant="label" muted>
                                        {tr("common.clear")}
                                    </AppText>
                                </Pressable>
                            ) : null}
                        </View>

                        {/* Result */}
                        <View style={[styles.summary, { backgroundColor: t.colors.subtle }]}>
                            <View style={styles.summaryRow}>
                                <AppText variant="body" muted>
                                    {tr("shopOrder.qty.total")}
                                </AppText>
                                <AppText variant="h2">
                                    {baseQty} {base?.name ?? tr("shopOrder.qty.units")}
                                </AppText>
                            </View>
                            {breakdown && breakdown.length > 0 ? (
                                <AppText variant="caption" muted>
                                    {breakdown.map((b) => `${b.count} × ${b.unit.name}`).join(" + ")}
                                </AppText>
                            ) : null}
                            <View style={styles.summaryRow}>
                                <AppText variant="body" muted>
                                    {tr("shopOrder.qty.lineTotal", { price: formatPrice(unit) })}
                                </AppText>
                                <AppText variant="h2" color="primary">
                                    {formatPrice(unit * baseQty)}
                                </AppText>
                            </View>
                            <TierLadder basePrice={target.basePrice} tiers={target.tiers} quantity={baseQty} variant="detail" />
                            {maxCount != null && n >= maxCount && n > 0 ? (
                                <AppText variant="caption" color={clamped ? "warning" : "ink500"}>
                                    {limitReason === "cap"
                                        ? tr("shopOrder.qty.atCap", { max: limitBase, packs: chosen ? tr("shopOrder.qty.inPacks", { count: maxCount, name: chosen.name }) : "" })
                                        : tr("shopOrder.qty.atStock", { available: limitBase, packs: chosen ? tr("shopOrder.qty.inPacks", { count: maxCount, name: chosen.name }) : "" })}
                                </AppText>
                            ) : null}
                            {maxCount === 0 ? (
                                <AppText variant="caption" color="error">
                                    {tr("shopOrder.qty.packTooBig", { name: chosen?.name ?? "" })}
                                </AppText>
                            ) : null}
                        </View>
                    </ScrollView>

                    <Button title={baseQty > 0 ? tr("shopOrder.qty.apply", { qty: baseQty }) : tr("shopOrder.qty.remove")} variant={baseQty > 0 ? "dark" : "danger"} onPress={baseQty > 0 ? apply : () => { onApply(0, null); onClose(); }} style={styles.apply} />
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

function UnitChip({ label, sub, selected, disabled, onPress }: { label: string; sub?: string; selected: boolean; disabled?: boolean; onPress: () => void }) {
    const t = useTheme();
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={[
                styles.unitChip,
                {
                    backgroundColor: selected ? t.colors.primary : disabled ? t.colors.subtle : t.colors.surface,
                    borderColor: selected ? t.colors.primary : t.colors.border,
                },
            ]}
        >
            <AppText variant="label" color={selected ? "white" : disabled ? "ink400" : "ink900"}>
                {label}
            </AppText>
            {sub ? (
                <AppText variant="caption" color={selected ? "accentLt" : "ink500"}>
                    {sub}
                </AppText>
            ) : null}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    backdrop: { flex: 1, backgroundColor: "rgba(17,24,39,0.45)", justifyContent: "flex-end" },
    sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28, maxHeight: "88%", flexShrink: 1 },
    // flexShrink lets the scroll area (not the Apply button) give way when the keyboard is up —
    // RN's default flexShrink is 0, which is what pushed the button off-screen.
    scroll: { flexGrow: 0, flexShrink: 1 },
    handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB", marginBottom: 14 },
    header: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 14 },
    headText: { gap: 6 },
    closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    label: { marginBottom: 8 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
    unitChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 1.5, minHeight: 44, justifyContent: "center" },
    quick: { paddingHorizontal: 14, height: 40, borderRadius: 999, borderWidth: 1, alignItems: "center", justifyContent: "center" },
    field: { marginBottom: 10 },
    summary: { borderRadius: 16, padding: 14, gap: 6, marginBottom: 6 },
    summaryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    apply: { marginTop: 12 },
});
