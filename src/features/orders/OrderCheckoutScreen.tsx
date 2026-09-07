import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Switch, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { Building2, CheckCircle2, MessageSquare, Tag, Trash2, Truck, UserRound, WifiOff } from "lucide-react-native";

import { isApiError, type PlaceOrderResult } from "@/api";
import { useIsOnline } from "@/offline";
import { useTheme } from "@/theme";
import { AppText, Button, Card, Divider, EmptyState, Field, Header, InlineBanner, Screen } from "@/ui";
import { formatINR, prettyPhone } from "@/utils/format";
import type { RootStackScreenProps } from "@/navigation/types";
import { lineUnitPrice, packBreakdown, useCart, type CartLine } from "./CartContext";
import { QtySheet, type QtySheetTarget } from "./QtySheet";
import { useOnboardingDetail } from "@/features/queries";
import { useOrderPreview, usePlaceOrder } from "./hooks";
import { QtyStepper } from "./QtyStepper";
import { TierLadder } from "./TierLadder";

/**
 * Review the cart, see the server's exact pricing (tier prices, delivery, coupon), choose
 * whether to SMS the owner a prepay link, and place the COD order. On success the cart is
 * cleared and the agent lands back on the store with the order listed.
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
    const [sendLink, setSendLink] = useState(false);
    const [notes, setNotes] = useState("");
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
    const canPlace = online && items.length > 0 && !place.isPending && !preview.isError && !belowMin && gstReady;

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
                        {formatINR(o.total)}
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
        <Screen scroll padded={false} contentContainerStyle={styles.content}>
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
                    <Card padded={false} style={styles.card}>
                        {cart.lines.map((l, i) => {
                            const priced = p?.items.find((x) => x.variantId === l.variantId);
                            const unit = priced?.unitPrice ?? lineUnitPrice(l);
                            const tiers = priced?.tiers ?? l.tiers;
                            const breakdown = packBreakdown(l.quantity, l.units);
                            return (
                                <View key={l.variantId}>
                                    {i > 0 ? <Divider /> : null}
                                    <View style={styles.line}>
                                        <View style={styles.flex}>
                                            <AppText variant="title" numberOfLines={2}>
                                                {l.productName}
                                            </AppText>
                                            <AppText variant="caption" muted numberOfLines={1}>
                                                {[l.variantName, l.unit].filter(Boolean).join(" · ")} · {formatINR(unit)}
                                                {priced?.hasTierDiscount ? `  ${tr("shopOrder.tierApplied")}` : ""}
                                            </AppText>
                                            {breakdown && breakdown.length > 0 ? (
                                                <AppText variant="caption" color="accentDk">
                                                    {breakdown.map((b) => `${b.count} × ${b.unit.name}`).join(" + ")}
                                                </AppText>
                                            ) : null}
                                            <AppText variant="bodyStrong" style={styles.lineTotal}>
                                                {formatINR(priced?.lineTotal ?? unit * l.quantity)}
                                            </AppText>
                                            <TierLadder basePrice={priced?.basePrice ?? l.basePrice} tiers={tiers} quantity={l.quantity} variant="detail" />
                                        </View>
                                        <View style={styles.lineRight}>
                                            <QtyStepper value={l.quantity} max={l.maxQuantityPerOrder} onChange={(n) => cart.setLineQuantity(l.variantId, n, null)} onPressValue={() => setSheetLine(l)} />
                                            <Pressable onPress={() => cart.setLineQuantity(l.variantId, 0)} hitSlop={8} style={styles.trash} accessibilityLabel={tr("common.remove")}>
                                                <Trash2 size={16} color={t.colors.ink400} />
                                            </Pressable>
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                    </Card>

                    <Button title={tr("shopOrder.addMore")} variant="ghost" size="md" onPress={() => navigation.goBack()} style={styles.addMore} />

                    <Field
                        label={tr("shopOrder.couponLabel")}
                        optional
                        leftIcon={<Tag size={20} color={t.colors.ink500} />}
                        placeholder={tr("shopOrder.couponPlaceholder")}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        value={coupon}
                        onChangeText={setCoupon}
                        error={p?.coupon && !p.coupon.applied ? p.coupon.message ?? tr("shopOrder.couponInvalid") : undefined}
                        helper={p?.coupon?.applied ? tr("shopOrder.couponApplied", { amount: formatINR(p.coupon.discount) }) : undefined}
                        containerStyle={styles.field}
                    />

                    <Field
                        label={tr("shopOrder.notesLabel")}
                        optional
                        placeholder={tr("shopOrder.notesPlaceholder")}
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        containerStyle={styles.field}
                    />

                    <Card style={styles.card}>
                        <View style={styles.switchRow}>
                            <View style={[styles.flex, styles.switchText]}>
                                <AppText variant="title">{tr("shopOrder.gst.title")}</AppText>
                                <AppText variant="caption" muted>
                                    {target.kind === "store" ? tr("shopOrder.gst.sub") : tr("phoneOrder.gstSub")}
                                </AppText>
                            </View>
                            <Switch value={gstOn} onValueChange={setGstOn} trackColor={{ true: t.colors.accent, false: t.colors.border }} thumbColor={t.colors.white} />
                        </View>
                        {gstOn ? (
                            <View style={styles.gstFields}>
                                <Field
                                    label={tr("shopOrder.gst.gstin")}
                                    leftIcon={<Building2 size={20} color={t.colors.ink500} />}
                                    placeholder="06ABCDE1234F1Z5"
                                    autoCapitalize="characters"
                                    autoCorrect={false}
                                    value={gstin}
                                    onChangeText={(v) => { setGstTouched(true); setGstin(v); }}
                                    error={gstin.length > 0 && !gstinLooksValid ? tr("shopOrder.gst.gstinInvalid") : undefined}
                                    helper={gstinLooksValid && !gstinClean.startsWith("06") ? tr("shopOrder.gst.haryanaOnly") : undefined}
                                    containerStyle={styles.field}
                                />
                                <Field
                                    label={tr("shopOrder.gst.legalName")}
                                    placeholder={tr("shopOrder.gst.legalNamePlaceholder")}
                                    value={legalName}
                                    onChangeText={(v) => { setGstTouched(true); setLegalName(v); }}
                                    error={legalName.length > 0 && legalName.trim().length < 3 ? tr("shopOrder.gst.legalNameShort") : undefined}
                                    containerStyle={styles.field}
                                />
                                <Field
                                    label={tr("shopOrder.gst.tradeName")}
                                    optional
                                    value={tradeName}
                                    onChangeText={(v) => { setGstTouched(true); setTradeName(v); }}
                                    containerStyle={styles.fieldLast}
                                />
                            </View>
                        ) : null}
                    </Card>

                    <Card style={styles.card}>
                        <View style={styles.switchRow}>
                            <View style={[styles.flex, styles.switchText]}>
                                <AppText variant="title">{tr("shopOrder.sendLinkTitle")}</AppText>
                                <AppText variant="caption" muted>
                                    {tr("shopOrder.sendLinkSub")}
                                </AppText>
                            </View>
                            <Switch value={sendLink} onValueChange={setSendLink} trackColor={{ true: t.colors.accent, false: t.colors.border }} thumbColor={t.colors.white} />
                        </View>
                    </Card>

                    <Card style={styles.card}>
                        <TotalRow label={tr("shopOrder.subtotal")} value={p ? formatINR(p.itemsTotal) : "—"} />
                        {p && p.tierSavings > 0 ? <TotalRow label={tr("shopOrder.tierSavings")} value={`− ${formatINR(p.tierSavings)}`} tone="accentDk" /> : null}
                        {p && p.discount > 0 ? <TotalRow label={tr("shopOrder.couponDiscount")} value={`− ${formatINR(p.discount)}`} tone="accentDk" /> : null}
                        <TotalRow
                            label={tr("shopOrder.delivery")}
                            value={p ? (p.freeDeliveryApplied || p.deliveryFee === 0 ? tr("shopOrder.free") : formatINR(p.deliveryFee)) : "—"}
                            icon={<Truck size={14} color={t.colors.ink500} />}
                        />
                        <Divider style={styles.totalDivider} />
                        <View style={styles.totalRow}>
                            <AppText variant="h2">{tr("shopOrder.total")}</AppText>
                            <AppText variant="h1" color="primary">
                                {p ? formatINR(p.grandTotal) : formatINR(cart.estimate)}
                            </AppText>
                        </View>
                        <AppText variant="caption" muted>
                            {preview.isFetching ? tr("shopOrder.pricing") : tr("shopOrder.codNote")}
                        </AppText>
                        {belowMin && p ? (
                            <InlineBanner tone="warning" text={tr("shopOrder.belowMin", { amount: formatINR(p.minOrderAmount) })} style={styles.bannerTop} />
                        ) : null}
                        {previewError ? <InlineBanner tone="error" text={previewError} style={styles.bannerTop} /> : null}
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

                    <Button
                        title={tr("shopOrder.placeOrder", { amount: p ? formatINR(p.grandTotal) : formatINR(cart.estimate) })}
                        variant="dark"
                        onPress={submit}
                        loading={place.isPending}
                        disabled={!canPlace}
                        style={styles.place}
                    />
                </View>
            )}
        </Screen>
    );
}

function lineToTarget(l: CartLine): QtySheetTarget {
    return {
        title: l.productName,
        subtitle: [l.variantName, l.unit].filter(Boolean).join(" · ") || undefined,
        quantity: l.quantity,
        units: l.units,
        basePrice: l.basePrice,
        unitPrice: l.unitPrice,
        tiers: l.tiers,
        maxQuantityPerOrder: l.maxQuantityPerOrder,
        baseAvailable: l.units.find((u) => u.isBase)?.available ?? null,
    };
}

function TotalRow({ label, value, tone, icon }: { label: string; value: string; tone?: "accentDk"; icon?: React.ReactNode }) {
    return (
        <View style={styles.totalLine}>
            <View style={styles.totalLabel}>
                {icon}
                <AppText variant="body" muted>
                    {label}
                </AppText>
            </View>
            <AppText variant="bodyStrong" color={tone}>
                {value}
            </AppText>
        </View>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    content: { paddingBottom: 40 },
    px: { paddingHorizontal: 16 },
    card: { marginBottom: 14 },
    line: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14 },
    lineTotal: { marginTop: 4 },
    lineRight: { alignItems: "center", gap: 6 },
    trash: { padding: 4 },
    addMore: { marginBottom: 16 },
    field: { marginBottom: 14 },
    fieldLast: { marginBottom: 0 },
    gstFields: { marginTop: 14 },
    switchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    switchText: { gap: 2 },
    totalLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 5 },
    totalLabel: { flexDirection: "row", alignItems: "center", gap: 6 },
    totalDivider: { marginVertical: 10 },
    totalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
    banner: { marginBottom: 12 },
    bannerTop: { marginTop: 10 },
    place: { marginTop: 4 },
    successWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 8 },
    successTitle: { marginTop: 6 },
    creditNote: { marginTop: 8 },
    doneBtn: { marginTop: 20, alignSelf: "stretch" },
});
