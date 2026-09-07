import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AlertCircle, Boxes, ChevronRight, Package, Search, ShoppingCart, WifiOff } from "lucide-react-native";

import { orderTargetKey, type CatalogProduct, type CatalogVariant } from "@/api";
import { useIsOnline } from "@/offline";
import { useTheme } from "@/theme";
import { AppText, EmptyState, Field, Header, InlineBanner, Screen, Skeleton } from "@/ui";
import { formatINR } from "@/utils/format";
import type { RootStackScreenProps } from "@/navigation/types";
import { packBreakdown, sellableUnits, useCart } from "./CartContext";
import { QtySheet, type QtySheetTarget } from "./QtySheet";
import { useCatalog, useDebounced } from "./hooks";
import { QtyStepper } from "./QtyStepper";
import { TierLadder } from "./TierLadder";

/** One sellable row = one variant (most products have exactly one). */
interface Row {
    key: string;
    product: CatalogProduct;
    variant: CatalogVariant;
    /** True for the 2nd+ variant of a product, so the product name isn't repeated. */
    continuation: boolean;
}

/**
 * Build a cart from the hub catalog that serves this shop. Search-first (a rep knows what
 * the kirana wants), with an inline stepper per variant and a sticky cart bar that leads
 * to checkout. Prices shown are the store owner's segment prices from the server.
 */
export function OrderCatalogScreen({ route, navigation }: RootStackScreenProps<"OrderCatalog">) {
    const { target, title } = route.params;
    const targetKey = orderTargetKey(target);
    const t = useTheme();
    const { t: tr } = useTranslation();
    const cart = useCart();
    const online = useIsOnline();
    const [search, setSearch] = useState("");
    const [sheet, setSheet] = useState<{ product: CatalogProduct; variant: CatalogVariant; target: QtySheetTarget } | null>(null);
    const debounced = useDebounced(search, 350);
    const catalog = useCatalog(target, debounced);

    // Bind (or re-bind) the cart to this target as soon as the screen opens.
    useEffect(() => {
        cart.startFor(targetKey, title);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [targetKey, title]);

    const rows = useMemo<Row[]>(() => {
        const products = catalog.data?.products ?? [];
        const out: Row[] = [];
        for (const p of products) {
            const variants = (p.variants ?? []).filter((v) => v.inStock);
            variants.forEach((v, i) => out.push({ key: v.id, product: p, variant: v, continuation: i > 0 }));
        }
        return out;
    }, [catalog.data]);

    const renderItem = useCallback(
        ({ item }: { item: Row }) => {
            const { product, variant } = item;
            const price = variant.effectivePrice ?? variant.sellingPrice;
            const showMrp = variant.mrp > price;
            const subtitle = [variant.name, variant.weight ? `${variant.weight}${variant.unit ? " " + variant.unit : ""}` : variant.unit]
                .filter(Boolean)
                .join(" · ");
            const qty = cart.quantityOf(variant.id);
            const image = variant.images?.[0] ?? null;
            const units = sellableUnits(variant);
            const packs = units.filter((u) => !u.isBase);
            const breakdown = qty > 0 ? packBreakdown(qty, units) : null;
            const openSheet = () =>
                setSheet({
                    product,
                    variant,
                    target: {
                        title: product.name,
                        subtitle: subtitle || undefined,
                        quantity: qty,
                        units,
                        basePrice: variant.sellingPrice,
                        unitPrice: price,
                        tiers: variant.tiers ?? [],
                        maxQuantityPerOrder: variant.maxQuantityPerOrder ?? null,
                        baseAvailable: units.find((u) => u.isBase)?.available ?? null,
                    },
                });

            return (
                <View style={[styles.row, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
                    <View style={[styles.thumb, { backgroundColor: t.colors.subtle }]}>
                        {image ? <Image source={{ uri: image }} style={styles.thumbImg} /> : <Package size={22} color={t.colors.ink400} />}
                    </View>
                    <View style={styles.rowBody}>
                        <AppText variant="title" numberOfLines={2}>
                            {product.name}
                        </AppText>
                        {subtitle ? (
                            <AppText variant="caption" muted numberOfLines={1}>
                                {subtitle}
                            </AppText>
                        ) : null}
                        <View style={styles.priceRow}>
                            <AppText variant="bodyStrong">{formatINR(price)}</AppText>
                            {showMrp ? (
                                <AppText variant="caption" muted style={styles.mrp}>
                                    {formatINR(variant.mrp)}
                                </AppText>
                            ) : null}
                        </View>
                        <TierLadder basePrice={variant.sellingPrice} tiers={variant.tiers} quantity={qty} />
                        {packs.length > 0 ? (
                            <View style={styles.packRow}>
                                {packs.map((u) => (
                                    <Pressable
                                        key={u.id}
                                        disabled={!online || (u.available != null && u.available <= 0)}
                                        onPress={() => {
                                            const next = qty + u.factorToBase;
                                            const bd = packBreakdown(next, units);
                                            const first = bd?.[0];
                                            const single = bd && bd.length === 1 && first && first.unit.id === u.id ? first : null;
                                            cart.setQuantity(product, variant, next, single ? { unitId: u.id, packQuantity: single.count } : null);
                                        }}
                                        style={[styles.packChip, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}
                                        accessibilityLabel={tr("shopOrder.qty.addPack", { name: u.name })}
                                    >
                                        <Boxes size={14} color={t.colors.ink700} />
                                        <AppText variant="caption" color="ink700">
                                            {tr("shopOrder.qty.addPack", { name: u.name })} ×{u.factorToBase}
                                        </AppText>
                                    </Pressable>
                                ))}
                            </View>
                        ) : null}
                        {breakdown && breakdown.length > 0 ? (
                            <AppText variant="caption" color="accentDk">
                                {breakdown.map((b) => `${b.count} × ${b.unit.name}`).join(" + ")}
                            </AppText>
                        ) : null}
                    </View>
                    <QtyStepper
                        value={qty}
                        max={variant.maxQuantityPerOrder}
                        disabled={!online}
                        onChange={(n) => cart.setQuantity(product, variant, n, null)}
                        onPressValue={openSheet}
                    />
                </View>
            );
        },
        [cart, online, t.colors, tr],
    );

    const listEmpty = catalog.isLoading ? (
        <View style={styles.pad}>
            <Skeleton height={84} radius={16} style={styles.skel} />
            <Skeleton height={84} radius={16} style={styles.skel} />
            <Skeleton height={84} radius={16} style={styles.skel} />
        </View>
    ) : catalog.isError ? (
        <EmptyState
            icon={<AlertCircle size={30} color={t.colors.error} />}
            tone="error"
            title={tr("errors.title")}
            message={online ? tr("errors.NETWORK") : tr("shopOrder.offline")}
            actionLabel={tr("common.retry")}
            onAction={() => catalog.refetch()}
        />
    ) : (
        <EmptyState
            icon={<Search size={30} color={t.colors.ink400} />}
            title={debounced.trim() ? tr("shopOrder.noResults") : tr("shopOrder.emptyCatalog")}
            message={debounced.trim() ? tr("shopOrder.noResultsSub") : undefined}
        />
    );

    return (
        <Screen padded={false}>
            <View style={styles.headerWrap}>
                <Header title={target.kind === "store" ? tr("shopOrder.title") : tr("phoneOrder.title")} subtitle={title} onBack={() => navigation.goBack()} />
                <Field
                    leftIcon={<Search size={20} color={t.colors.ink500} />}
                    placeholder={tr("shopOrder.searchPlaceholder")}
                    value={search}
                    onChangeText={setSearch}
                    autoCorrect={false}
                    returnKeyType="search"
                    containerStyle={styles.search}
                />
                {!online ? <InlineBanner tone="offline" icon={<WifiOff size={16} color={t.colors.white} />} text={tr("shopOrder.offline")} /> : null}
            </View>

            <FlatList
                data={rows}
                keyExtractor={(r) => r.key}
                renderItem={renderItem}
                contentContainerStyle={[styles.list, cart.count > 0 && styles.listWithBar]}
                ListEmptyComponent={listEmpty}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                initialNumToRender={12}
            />

            <QtySheet
                visible={sheet !== null}
                target={sheet?.target ?? null}
                onClose={() => setSheet(null)}
                onApply={(q, pack) => {
                    if (sheet) cart.setQuantity(sheet.product, sheet.variant, q, pack);
                }}
            />

            {cart.count > 0 ? (
                <Pressable
                    onPress={() => navigation.navigate("OrderCheckout", { target, title })}
                    style={[styles.cartBar, { backgroundColor: t.colors.primary }]}
                    accessibilityRole="button"
                >
                    <View style={[styles.cartIcon, { backgroundColor: t.colors.accent }]}>
                        <ShoppingCart size={18} color={t.colors.primary} />
                    </View>
                    <View style={styles.flex}>
                        <AppText variant="label" onDark muted>
                            {tr("shopOrder.itemsInCart", { count: cart.count })}
                        </AppText>
                        <AppText variant="title" onDark>
                            {formatINR(cart.estimate)}
                        </AppText>
                    </View>
                    <AppText variant="bodyStrong" color="accent">
                        {tr("shopOrder.viewCart")}
                    </AppText>
                    <ChevronRight size={20} color={t.colors.accent} />
                </Pressable>
            ) : null}
        </Screen>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    headerWrap: { paddingHorizontal: 16 },
    search: { marginTop: 4, marginBottom: 8 },
    list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 },
    listWithBar: { paddingBottom: 110 },
    pad: { paddingTop: 8 },
    skel: { marginBottom: 12 },
    row: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        padding: 12,
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
        marginBottom: 10,
    },
    thumb: { width: 56, height: 56, borderRadius: 12, alignItems: "center", justifyContent: "center", overflow: "hidden" },
    thumbImg: { width: 56, height: 56 },
    rowBody: { flex: 1, gap: 2 },
    priceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2, flexWrap: "wrap" },
    mrp: { textDecorationLine: "line-through" },
    packRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
    packChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, height: 32, borderRadius: 999, borderWidth: 1 },
    cartBar: {
        position: "absolute",
        left: 16,
        right: 16,
        bottom: 20,
        borderRadius: 20,
        paddingVertical: 12,
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
    },
    cartIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
