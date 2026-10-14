import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Switch, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { Building2, CheckCircle2, ChevronDown, ChevronUp, MessageSquare, Plus, Smartphone, Tag, Truck, UserRound, WifiOff } from "lucide-react-native";

import { isApiError, type PlaceOrderResult } from "@/api";
import { useIsOnline } from "@/offline";
import { useTheme } from "@/theme";
import { AppText, Button, Card, Divider, EmptyState, Field, Header, InlineBanner, Screen } from "@/ui";
import { formatPrice, prettyPhone } from "@/utils/format";
import type { RootStackScreenProps } from "@/navigation/types";
import { lineUnitPrice, packNoteFor, quantityLimit, useCart, type CartLine } from "./CartContext";
import { CheckoutLine } from "./CheckoutLine";
import { QtySheet, type QtySheetTarget } from "./QtySheet";
import { useOnboardingDetail } from "@/features/queries";
import { useOrderPreview, usePlaceOrder } from "./hooks";

/**
 * Review the cart, see the server's exact pricing (tier prices, delivery, coupon), choose
 * whether to SMS the owner a prepay link, and place the COD order. On success the cart is
 * cleared and the agent lands back on the store with the order listed.
 *
 * Layout, top to bottom: items (the part the agent reads out to the owner), bill, then one
 * "options" card where coupon / note / GST / payment link stay folded until needed. The
 * sticky footer carries the total and the place button.
 */
export function OrderCheckoutScreen({ route, navigation }: RootStackScreenProps<"OrderCheckout">) {
    const { target, title } = route.params;
    const shopName = title;
    const onboardingId = target.kind === "store" ? target.onboardingId : undefined;
    const t = useTheme();
    const { t: tr } = useTranslation();
    const cart = useCart();
    const online = useIsOnline();
    const [coupon, setCoupon] = useState("");
    const [couponOpen, setCouponOpen] = useState(false);
    const [sendLink, setSendLink] = useState(false);
    const [notes, setNotes] = useState("");
    const [notesOpen, setNotesOpen] = useState(false);
    const [placed, setPlaced] = useState<PlaceOrderResult | null>(null);
    const [sheetLine, setSheetLine] = useState<CartLine | null>(null);

    // GST (B2B tax invoice) — prefilled from the store's KYC (GSTIN captured at onboarding).
    const detail = useOnboardingDetail(onboardingId);
    const store = detail.data?.store;
    const [gstOn, setGstOn] = useState(false);
    const [gstin, setGstin] = useState("");
    const [legalName, setLegalName] = useState("");
    const [tradeName, setTradeName] = useState("");
    const [gstTouched, setGstTouched] = useState(false);
    useEffect(() => {
        if (gstTouched) return;
        if (target.kind === "store") {
            if (!store) return;
            setGstin(store.gstin ?? "");
            setLegalName(store.ownerName ?? "");
            setTradeName(store.shopName ?? shopName);
        } else {
            setLegalName(target.customerName ?? "");
        }
    }, [store, gstTouched, shopName, target]);
    const gstinClean = gstin.replace(/\s+/g, "").toUpperCase();
    const gstinLooksValid = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstinClean);
    const gstReady = !gstOn || (gstinLooksValid && legalName.trim().length >= 3);

    const items = cart.toItems();
    const preview = useOrderPreview(target, items, coupon);
    const place = usePlaceOrder(target);

    const submit = () => {
        if (items.length === 0 || place.isPending) return;
        place.mutate(
            {
                clientId: cart.clientId,
                items,
                couponCode: coupon.trim() || undefined,
                sendPaymentLink: sendLink,
                notes: notes.trim() || undefined,
                invoiceType: gstOn ? "b2b" : "b2c",
                gstDetails: gstOn ? { gstin: gstinClean, legalName: legalName.trim(), tradeName: tradeName.trim() || undefined } : undefined,
            },
            {
                onSuccess: (result) => {
                    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    setPlaced(result);
                    cart.clear();
                },
                onError: () => {
                    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                },
            },
        );
    };

    const finish = () => {
        // Back to the store detail (two screens up: Checkout → Catalog → StoreDetail).
        navigation.pop(2);
    };

    const errorText = place.error ? (isApiError(place.error) ? place.error.message : tr("errors.UNKNOWN")) : null;
    const previewError = preview.error && isApiError(preview.error) ? preview.error.message : null;
    const p = preview.data;
    const belowMin = p ? !p.meetsMinimum : false;
    // Everything the owner pays less than printed MRP: list discount + bulk rungs + coupon.
    const totalSaving = p ? Math.max(0, p.itemsMrpTotal - p.itemsTotal) + (p.discount > 0 ? p.discount : 0) : 0;
    const canPlace = online && items.length > 0 && !place.isPending && !preview.isError && !belowMin && gstReady;
    const blocker: string | null = !online
        ? tr("shopOrder.offline")
        : belowMin && p
          ? tr("shopOrder.belowMin", { amount: formatPrice(p.minOrderAmount) })
          : !gstReady
            ? tr("shopOrder.gst.incomplete")
            : previewError
              ? previewError
              : null;
    const unitCount = cart.lines.reduce((n, l) => n + l.quantity, 0);
    const grand = p ? formatPrice(p.grandTotal) : formatPrice(cart.estimate);
    const couponApplied = p?.coupon?.applied ? p.coupon.discount : null;
    const couponError = coupon.trim() && p?.coupon && !p.coupon.applied ? (p.coupon.message ?? tr("shopOrder.couponInvalid")) : undefined;
    const showCoupon = couponOpen || coupon.length > 0;
    const showNotes = notesOpen || notes.length > 0;

    if (placed) {
        const o = placed.order;
        return (
            <Screen>
                <View style={styles.successWrap}>
                    <CheckCircle2 size={56} color={t.colors.success} />
                    <AppText variant="h1" align="center" style={styles.successTitle}>
                        {placed.idempotentReplay ? tr("shopOrder.alreadyPlacedTitle") : tr("shopOrder.placedTitle")}
                    </AppText>
                    <AppText variant="display" color="primary">
                        {formatPrice(o.total)}
                    </AppText>
                    <AppText variant="body" muted align="center">
                        {tr("shopOrder.placedSub", { number: o.orderNumber, shop: shopName })}
                    </AppText>
                    {target.kind === "customer" ? (
                        <AppText variant="caption" muted align="center">
                            {tr("phoneOrder.deliverTo", { name: o.customerName ?? shopName, phone: o.customerPhone ?? target.phone })}
                        </AppText>
                    ) : null}
                    {o.invoiceType === "b2b" ? (
                        <AppText variant="caption" muted align="center">
                            {tr("shopOrder.gst.onOrder", { gstin: o.gstin ?? "" })}
                        </AppText>
                    ) : null}
                    {placed.paymentLink ? (
                        <InlineBanner tone="success" icon={<MessageSquare size={16} color="#166534" />} text={tr("shopOrder.linkSent")} style={styles.banner} />
                    ) : null}
                    {placed.adjustedItems && placed.adjustedItems.length > 0 ? (
                        <InlineBanner
                            tone="warning"
                            text={tr("shopOrder.adjusted", { names: placed.adjustedItems.map((a) => a.productName).join(", ") })}
                            style={styles.banner}
                        />
                    ) : null}
                    {placed.skippedItems && placed.skippedItems.length > 0 ? (
                        <InlineBanner
                            tone="warning"
                            text={tr("shopOrder.skipped", { names: placed.skippedItems.map((a) => a.productName).join(", ") })}
                            style={styles.banner}
                        />
                    ) : null}
                    <AppText variant="caption" muted align="center" style={styles.creditNote}>
                        {target.kind === "store" ? tr("shopOrder.creditNote") : tr("phoneOrder.creditNote")}
                    </AppText>
                    <Button title={tr("common.done")} onPress={finish} style={styles.doneBtn} />
                </View>
            </Screen>
        );
    }

    return (
        <Screen padded={false}>
            <Screen scroll padded={false} edges={[]} contentContainerStyle={styles.content}>
                <View style={styles.px}>
                    <Header title={tr("shopOrder.checkoutTitle")} subtitle={shopName} onBack={() => navigation.goBack()} />
                    {target.kind === "customer" ? (
                        <InlineBanner
                            tone="info"
                            icon={<UserRound size={16} color="#1E40AF" />}
                            text={tr("phoneOrder.forCustomer", { name: target.customerName ?? shopName, phone: prettyPhone(target.phone) })}
                            style={styles.banner}
                        />
                    ) : null}
                    {!online ? <InlineBanner tone="offline" icon={<WifiOff size={16} color={t.colors.white} />} text={tr("shopOrder.offline")} style={styles.banner} /> : null}
                </View>

                {cart.lines.length === 0 ? (
                    <EmptyState title={tr("shopOrder.cartEmpty")} actionLabel={tr("shopOrder.backToCatalog")} onAction={() => navigation.goBack()} />
                ) : (
                    <View style={styles.px}>
                        {/* ── Items ─────────────────────────────────────────── */}
                        <Card padded={false} style={styles.card}>
                            <View style={styles.cardHead}>
                                <AppText variant="subtitle">
                                    {tr("shopOrder.itemsCount", { count: cart.lines.length })}
                                    <AppText variant="caption" muted>
                                        {"  ·  " + tr("shopOrder.qty.unitsTotal", { count: unitCount })}
                                    </AppText>
                                </AppText>
                                <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.addMore} accessibilityRole="button" accessibilityLabel={tr("shopOrder.addMore")}>
                                    <Plus size={14} color={t.colors.accentDk} />
                                    <AppText variant="label" color="accentDk">
                                        {tr("shopOrder.addMoreShort")}
                                    </AppText>
                                </Pressable>
                            </View>
                            {cart.lines.map((l, i) => {
                                const priced = p?.items.find((x) => x.variantId === l.variantId);
                                const unit = priced?.unitPrice ?? lineUnitPrice(l);
                                return (
                                    <CheckoutLine
                                        key={l.variantId}
                                        first={i === 0}
                                        line={l}
                                        unitPrice={unit}
                                        mrp={priced?.mrp ?? l.mrp}
                                        basePrice={priced?.basePrice ?? l.basePrice}
                                        tiers={priced?.tiers ?? l.tiers}
                                        lineTotal={priced?.lineTotal ?? unit * l.quantity}
                                        hasTierDiscount={Boolean(priced?.hasTierDiscount)}
                                        limit={quantityLimit(l)}
                                        onChange={(q) => cart.setLineQuantity(l.variantId, q, packNoteFor(q, l.units))}
                                        onPressQuantity={() => setSheetLine(l)}
                                        onRemove={() => cart.setLineQuantity(l.variantId, 0)}
                                    />
                                );
                            })}
                        </Card>

                        {/* ── Bill ──────────────────────────────────────────── */}
                        <Card padded={false} style={styles.card}>
                            <View style={styles.bill}>
                                {p && p.itemsMrpTotal > p.itemsTotal ? <BillRow label={tr("shopOrder.price.mrpTotal")} value={formatPrice(p.itemsMrpTotal)} strike /> : null}
                                <BillRow label={tr("shopOrder.subtotal")} value={p ? formatPrice(p.itemsTotal) : "—"} />
                                {p && p.tierSavings > 0 ? <BillRow label={tr("shopOrder.tierSavings")} value={`− ${formatPrice(p.tierSavings)}`} tone="accentDk" /> : null}
                                {p && p.discount > 0 ? <BillRow label={tr("shopOrder.couponDiscount")} value={`− ${formatPrice(p.discount)}`} tone="accentDk" /> : null}
                                <BillRow
                                    label={tr("shopOrder.delivery")}
                                    value={p ? (p.freeDeliveryApplied || p.deliveryFee === 0 ? tr("shopOrder.free") : formatPrice(p.deliveryFee)) : "—"}
                                    icon={<Truck size={13} color={t.colors.ink500} />}
                                    tone={p && (p.freeDeliveryApplied || p.deliveryFee === 0) ? "accentDk" : undefined}
                                />
                                <Divider style={styles.billDivider} />
                                <View style={styles.totalRow}>
                                    <AppText variant="title">{tr("shopOrder.total")}</AppText>
                                    <AppText variant="h2" color="primary">
                                        {grand}
                                    </AppText>
                                </View>
                                {totalSaving > 0 ? (
                                    <View style={[styles.saveRow, { backgroundColor: t.colors.tertiary }]}>
                                        <AppText variant="label" color="primary">
                                            {tr("shopOrder.price.youSave", { amount: formatPrice(totalSaving) })}
                                        </AppText>
                                    </View>
                                ) : null}
                                {belowMin && p ? (
                                    <InlineBanner tone="warning" text={tr("shopOrder.belowMin", { amount: formatPrice(p.minOrderAmount) })} style={styles.bannerTop} />
                                ) : null}
                                {previewError ? <InlineBanner tone="error" text={previewError} style={styles.bannerTop} /> : null}
                            </View>
                        </Card>

                        {/* ── Options: folded rows so the common path stays short ── */}
                        <Card padded={false} style={styles.card}>
                            <OptionRow
                                icon={<Tag size={18} color={t.colors.ink700} />}
                                title={tr("shopOrder.couponLabel")}
                                value={couponApplied != null ? tr("shopOrder.couponApplied", { amount: formatPrice(couponApplied) }) : coupon.trim() ? coupon.trim().toUpperCase() : undefined}
                                valueTone={couponApplied != null ? "accentDk" : couponError ? "error" : undefined}
                                open={showCoupon}
                                onPress={() => setCouponOpen((v) => !v)}
                            />
                            {showCoupon ? (
                                <View style={styles.optionBody}>
                                    <Field
                                        placeholder={tr("shopOrder.couponPlaceholder")}
                                        autoCapitalize="characters"
                                        autoCorrect={false}
                                        autoFocus={couponOpen && coupon.length === 0}
                                        value={coupon}
                                        onChangeText={setCoupon}
                                        error={couponError}
                                        containerStyle={styles.fieldLast}
                                    />
                                </View>
                            ) : null}
                            <Divider />

                            <OptionRow
                                icon={<MessageSquare size={18} color={t.colors.ink700} />}
                                title={tr("shopOrder.notesLabel")}
                                value={notes.trim() ? notes.trim() : undefined}
                                open={showNotes}
                                onPress={() => setNotesOpen((v) => !v)}
                            />
                            {showNotes ? (
                                <View style={styles.optionBody}>
                                    <Field placeholder={tr("shopOrder.notesPlaceholder")} autoFocus={notesOpen && notes.length === 0} value={notes} onChangeText={setNotes} multiline containerStyle={styles.fieldLast} />
                                </View>
                            ) : null}
                            <Divider />

                            <OptionRow
                                icon={<Building2 size={18} color={t.colors.ink700} />}
                                title={tr("shopOrder.gst.title")}
                                sub={gstOn ? (target.kind === "store" ? tr("shopOrder.gst.sub") : tr("phoneOrder.gstSub")) : undefined}
                                right={<Switch value={gstOn} onValueChange={setGstOn} trackColor={{ true: t.colors.accent, false: t.colors.border }} thumbColor={t.colors.white} />}
                            />
                            {gstOn ? (
                                <View style={styles.optionBody}>
                                    <Field
                                        label={tr("shopOrder.gst.gstin")}
                                        placeholder="06ABCDE1234F1Z5"
                                        autoCapitalize="characters"
                                        autoCorrect={false}
                                        value={gstin}
                                        onChangeText={(v) => {
                                            setGstTouched(true);
                                            setGstin(v);
                                        }}
                                        error={gstin.length > 0 && !gstinLooksValid ? tr("shopOrder.gst.gstinInvalid") : undefined}
                                        helper={gstinLooksValid && !gstinClean.startsWith("06") ? tr("shopOrder.gst.haryanaOnly") : undefined}
                                        containerStyle={styles.field}
                                    />
                                    <Field
                                        label={tr("shopOrder.gst.legalName")}
                                        placeholder={tr("shopOrder.gst.legalNamePlaceholder")}
                                        value={legalName}
                                        onChangeText={(v) => {
                                            setGstTouched(true);
                                            setLegalName(v);
                                        }}
                                        error={legalName.length > 0 && legalName.trim().length < 3 ? tr("shopOrder.gst.legalNameShort") : undefined}
                                        containerStyle={styles.field}
                                    />
                                    <Field
                                        label={tr("shopOrder.gst.tradeName")}
                                        optional
                                        value={tradeName}
                                        onChangeText={(v) => {
                                            setGstTouched(true);
                                            setTradeName(v);
                                        }}
                                        containerStyle={styles.fieldLast}
                                    />
                                </View>
                            ) : null}
                            <Divider />

                            <OptionRow
                                icon={<Smartphone size={18} color={t.colors.ink700} />}
                                title={tr("shopOrder.sendLinkTitle")}
                                sub={tr("shopOrder.sendLinkSub")}
                                right={<Switch value={sendLink} onValueChange={setSendLink} trackColor={{ true: t.colors.accent, false: t.colors.border }} thumbColor={t.colors.white} />}
                            />
                        </Card>

                        {errorText ? <InlineBanner tone="error" text={errorText} style={styles.banner} /> : null}

                        <QtySheet
                            visible={sheetLine !== null}
                            target={sheetLine ? lineToTarget(sheetLine) : null}
                            onClose={() => setSheetLine(null)}
                            onApply={(q, pack) => {
                                if (sheetLine) cart.setLineQuantity(sheetLine.variantId, q, pack);
                            }}
                        />
                    </View>
                )}
            </Screen>

            {cart.lines.length > 0 ? (
                <View style={[styles.footer, { backgroundColor: t.colors.surface, borderTopColor: t.colors.border }]}>
                    <AppText variant="caption" color={blocker ? "warning" : undefined} muted={!blocker} numberOfLines={2}>
                        {blocker ?? (preview.isFetching ? tr("shopOrder.pricing") : tr("shopOrder.codNote"))}
                    </AppText>
                    <View style={styles.footerRow}>
                        <View style={styles.flex}>
                            <AppText variant="caption" muted>
                                {tr("shopOrder.total")}
                            </AppText>
                            <AppText variant="h2" color="primary">
                                {grand}
                            </AppText>
                        </View>
                        <Button title={tr("shopOrder.placeOrderShort")} variant="dark" size="md" fullWidth={false} onPress={submit} loading={place.isPending} disabled={!canPlace} style={styles.placeBtn} />
                    </View>
                </View>
            ) : null}
        </Screen>
    );
}

function lineToTarget(l: CartLine): QtySheetTarget {
    return {
        title: l.productName,
        specs: { variantName: l.variantName, unit: l.unit, weight: l.weight },
        mrp: l.mrp,
        quantity: l.quantity,
        units: l.units,
        basePrice: l.basePrice,
        unitPrice: l.unitPrice,
        tiers: l.tiers,
        maxQuantityPerOrder: l.maxQuantityPerOrder,
        baseAvailable: l.units.find((u) => u.isBase)?.available ?? null,
    };
}

function BillRow({ label, value, tone, icon, strike }: { label: string; value: string; tone?: "accentDk"; icon?: React.ReactNode; strike?: boolean }) {
    return (
        <View style={styles.billLine}>
            <View style={styles.billLabel}>
                {icon}
                <AppText variant="caption" muted>
                    {label}
                </AppText>
            </View>
            <AppText variant="label" color={strike ? "ink500" : (tone ?? "ink900")} style={strike ? styles.strike : undefined}>
                {value}
            </AppText>
        </View>
    );
}

/**
 * One folded option: icon, title, and either a chevron (tap to expand) or a control such
 * as a Switch. A `value` shows the current state inline so a closed row still tells the
 * agent what was set ("WELCOME50", "Coupon applied — ₹50 off").
 */
function OptionRow({
    icon,
    title,
    sub,
    value,
    valueTone,
    open,
    onPress,
    right,
}: {
    icon: React.ReactNode;
    title: string;
    sub?: string;
    value?: string;
    valueTone?: "accentDk" | "error";
    open?: boolean;
    onPress?: () => void;
    right?: React.ReactNode;
}) {
    const t = useTheme();
    const content = (
        <View style={styles.optionRow}>
            <View style={styles.optionIcon}>{icon}</View>
            <View style={styles.flex}>
                <AppText variant="bodyStrong">{title}</AppText>
                {value ? (
                    <AppText variant="caption" color={valueTone ?? "ink700"} numberOfLines={1}>
                        {value}
                    </AppText>
                ) : sub ? (
                    <AppText variant="caption" muted>
                        {sub}
                    </AppText>
                ) : null}
            </View>
            {right ?? (open ? <ChevronUp size={18} color={t.colors.ink400} /> : <ChevronDown size={18} color={t.colors.ink400} />)}
        </View>
    );
    if (!onPress) return content;
    return (
        <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ expanded: open }} style={({ pressed }) => (pressed ? styles.pressed : null)}>
            {content}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    content: { paddingBottom: 132 },
    px: { paddingHorizontal: 16 },
    card: { marginBottom: 12 },
    cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingLeft: 12, paddingRight: 8, paddingVertical: 8 },
    addMore: { flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 6, paddingVertical: 6 },
    bill: { paddingHorizontal: 12, paddingVertical: 8 },
    billLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 3 },
    billLabel: { flexDirection: "row", alignItems: "center", gap: 5 },
    billDivider: { marginVertical: 6 },
    totalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    saveRow: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginTop: 6 },
    strike: { textDecorationLine: "line-through" },
    optionRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10, minHeight: 48 },
    optionIcon: { width: 24, alignItems: "center" },
    optionBody: { paddingHorizontal: 12, paddingBottom: 12 },
    pressed: { opacity: 0.7 },
    field: { marginBottom: 10 },
    fieldLast: { marginBottom: 0 },
    footer: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 20,
        borderTopWidth: StyleSheet.hairlineWidth,
        gap: 4,
    },
    footerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    placeBtn: { minWidth: 160, paddingHorizontal: 20 },
    banner: { marginBottom: 12 },
    bannerTop: { marginTop: 8 },
    successWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 8 },
    successTitle: { marginTop: 6 },
    creditNote: { marginTop: 8 },
    doneBtn: { marginTop: 20, alignSelf: "stretch" },
});
