import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AlertCircle, Boxes, ChevronRight, Package, Search, ShoppingCart, WifiOff, X } from "lucide-react-native";

import { orderTargetKey, type CatalogProduct, type CatalogVariant } from "@/api";
import { useIsOnline } from "@/offline";
import { useTheme } from "@/theme";
import { AppText, EmptyState, Field, Header, InlineBanner, Screen, Skeleton } from "@/ui";
import { formatPrice } from "@/utils/format";
import type { RootStackScreenProps } from "@/navigation/types";
import { packBreakdown, packNoteFor, quantityLimit, sellableUnits, useCart } from "./CartContext";
import { PriceBlock } from "./PriceBlock";
import { QtySheet, type QtySheetTarget } from "./QtySheet";
import { useCatalog, useDebounced } from "./hooks";
import { QtyStepper } from "./QtyStepper";
import { TierLadder, activeTier } from "./TierLadder";
import { VariantSpecs } from "./VariantSpecs";

/** One card = one product with every in-stock variant listed under it. */
interface Row {
    key: string;
    product: CatalogProduct;
    variants: CatalogVariant[];
}

const LOW_STOCK_AT = 10;

/**
 * Build a cart from the hub catalog that serves this shop. Search-first (a rep knows what
 * the kirana wants). Each product is one card: the full name on top, then every sellable
 * variant with its variant / unit / weight spelled out, the price next to MRP, and a
 * stepper that always sits in the same place. A sticky cart bar leads to checkout.
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
    const [onlyInCart, setOnlyInCart] = useState(false);
    const debounced = useDebounced(search, 350);
    const catalog = useCatalog(target, debounced);

    // Bind (or re-bind) the cart to this target as soon as the screen opens.
    useEffect(() => {
        cart.startFor(targetKey, title);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [targetKey, title]);

    const inCartIds = useMemo(() => new Set(cart.lines.map((l) => l.variantId)), [cart.lines]);
    // Nothing in the cart any more → drop back to the full list instead of showing an empty one.
    useEffect(() => {
        if (cart.lines.length === 0) setOnlyInCart(false);
    }, [cart.lines.length]);

    const rows = useMemo<Row[]>(() => {
        const out: Row[] = [];
        for (const p of catalog.products) {
            let variants = (p.variants ?? []).filter((v) => v.inStock);
            if (onlyInCart) variants = variants.filter((v) => inCartIds.has(v.id));
            if (variants.length > 0) out.push({ key: p.id, product: p, variants });
        }
        return out;
    }, [catalog.products, onlyInCart, inCartIds]);

    const openSheet = useCallback(
        (product: CatalogProduct, variant: CatalogVariant) => {
            const units = sellableUnits(variant);
            setSheet({
                product,
                variant,
                target: {
                    title: product.name,
                    specs: { variantName: variant.name, unit: variant.unit, weight: variant.weight ?? null },
                    mrp: variant.mrp,
                    quantity: cart.quantityOf(variant.id),
                    units,
                    basePrice: variant.sellingPrice,
                    unitPrice: variant.effectivePrice ?? variant.sellingPrice,
                    tiers: variant.tiers ?? [],
                    maxQuantityPerOrder: variant.maxQuantityPerOrder ?? null,
                    baseAvailable: units.find((u) => u.isBase)?.available ?? null,
                },
            });
        },
        [cart],
    );

    const renderItem = useCallback(
        ({ item }: { item: Row }) => {
            const { product, variants } = item;
            const image = variants.find((v) => v.images?.[0])?.images?.[0] ?? null;
            const meta = [product.brand?.name, product.category?.name].filter(Boolean).join(" · ");

            return (
                <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}>
                    {/* Product header — the name is never clipped; a long name just wraps. */}
                    <View style={styles.cardHead}>
                        <View style={[styles.thumb, { backgroundColor: t.colors.subtle }]}>
                            {image ? <Image source={{ uri: image }} style={styles.thumbImg} resizeMode="cover" /> : <Package size={18} color={t.colors.ink400} />}
                        </View>
                        <View style={styles.flex}>
                            <AppText variant="subtitle">{product.name}</AppText>
                            {meta || variants.length > 1 ? (
                                <AppText variant="caption" muted>
                                    {[meta, variants.length > 1 ? tr("shopOrder.price.variants", { count: variants.length }) : ""].filter(Boolean).join(" · ")}
                                </AppText>
                            ) : null}
                        </View>
                    </View>

                    {variants.map((variant) => {
                        const price = variant.effectivePrice ?? variant.sellingPrice;
                        const qty = cart.quantityOf(variant.id);
                        const units = sellableUnits(variant);
                        const packs = units.filter((u) => !u.isBase);
                        const breakdown = qty > 0 ? packBreakdown(qty, units) : null;
                        const baseAvailable = units.find((u) => u.isBase)?.available ?? null;
                        const lowStock = baseAvailable != null && baseAvailable > 0 && baseAvailable <= LOW_STOCK_AT;
                        // Hard ceiling for this line: the hub's per-order max (stock already folded in) and pack stock.
                        const limit = quantityLimit({ maxQuantityPerOrder: variant.maxQuantityPerOrder, units });
                        const atLimit = limit != null && qty >= limit;
                        // Per-unit price at the rung this quantity has reached (what the cart estimate uses).
                        const rung = activeTier(variant.tiers, qty);
                        const unitNow = rung ? rung.unitPrice : price;

                        return (
                            <View
                                key={variant.id}
                                style={[styles.variant, { borderTopColor: t.colors.border }, qty > 0 ? styles.variantInCart : null]}
                            >
                                {/* Action row: specs + price/MRP on the left, stepper always on the right. */}
                                <View style={styles.actionRow}>
                                    <View style={[styles.flex, styles.variantInfo]}>
                                        <VariantSpecs layout="inline" variantName={variant.name} unit={variant.unit} weight={variant.weight} />
                                        <PriceBlock size="md" price={price} mrp={variant.mrp} unit={variant.unit} />
                                    </View>
                                    <QtyStepper
                                        value={qty}
                                        max={limit}
                                        disabled={!online}
                                        onChange={(n) => cart.setQuantity(product, variant, n, null)}
                                        onPressValue={() => openSheet(product, variant)}
                                    />
                                </View>

                                {atLimit ? (
                                    <AppText variant="caption" color="warning">
                                        {tr("shopOrder.qty.atCap", { max: limit, packs: "" })}
                                    </AppText>
                                ) : lowStock ? (
                                    <AppText variant="caption" color="warning">
                                        {tr("shopOrder.price.lowStock", { count: baseAvailable })}
                                    </AppText>
                                ) : null}

                                <TierLadder basePrice={variant.sellingPrice} tiers={variant.tiers} quantity={qty} />

                                {packs.length > 0 ? (
                                    <View style={styles.packRow}>
                                        {packs.map((u) => {
                                            // A pack is addable only if the whole pack still fits under the limit.
                                            const fits = limit == null || qty + u.factorToBase <= limit;
                                            const packDisabled = !online || !fits || (u.available != null && u.available <= 0);
                                            return (
                                                <Pressable
                                                    key={u.id}
                                                    disabled={packDisabled}
                                                    onPress={() => {
                                                        const next = qty + u.factorToBase;
                                                        cart.setQuantity(product, variant, next, packNoteFor(next, units));
                                                    }}
                                                    style={[styles.packChip, { backgroundColor: packDisabled ? t.colors.subtle : t.colors.surface, borderColor: t.colors.border }]}
                                                    accessibilityLabel={tr("shopOrder.qty.addPack", { name: u.name })}
                                                    accessibilityState={{ disabled: packDisabled }}
                                                >
                                                    <Boxes size={14} color={packDisabled ? t.colors.ink400 : t.colors.ink700} />
                                                    <AppText variant="caption" color={packDisabled ? "ink400" : "ink700"}>
                                                        {tr("shopOrder.qty.addPack", { name: u.name })} ×{u.factorToBase}
                                                    </AppText>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                ) : null}

                                {qty > 0 ? (
                                    <AppText variant="caption" color="accentDk">
                                        {tr("shopOrder.price.inCart", { qty, price: formatPrice(unitNow), total: formatPrice(unitNow * qty) })}
                                        {breakdown && breakdown.length > 0 ? (
                                            <AppText variant="caption" muted>
                                                {"  ·  " + breakdown.map((b) => `${b.count} × ${b.unit.name}`).join(" + ")}
                                            </AppText>
                                        ) : null}
                                    </AppText>
                                ) : null}
                            </View>
                        );
                    })}
                </View>
            );
        },
        [cart, online, openSheet, t.colors, tr],
    );

    const listEmpty = catalog.isLoading ? (
        <View style={styles.pad}>
            <Skeleton height={104} radius={14} style={styles.skel} />
            <Skeleton height={104} radius={14} style={styles.skel} />
            <Skeleton height={104} radius={14} style={styles.skel} />
            <Skeleton height={104} radius={14} style={styles.skel} />
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
                    rightAccessory={
                        search.length > 0 ? (
                            <Pressable onPress={() => setSearch("")} hitSlop={10} accessibilityRole="button" accessibilityLabel={tr("common.clear")} style={[styles.clearBtn, { backgroundColor: t.colors.subtle }]}>
                                <X size={16} color={t.colors.ink700} />
                            </Pressable>
                        ) : undefined
                    }
                    placeholder={tr("shopOrder.searchPlaceholder")}
                    value={search}
                    onChangeText={setSearch}
                    autoCorrect={false}
                    returnKeyType="search"
                    containerStyle={styles.search}
                />
                {!online ? <InlineBanner tone="offline" icon={<WifiOff size={16} color={t.colors.white} />} text={tr("shopOrder.offline")} /> : null}
                {catalog.products.length > 0 || cart.lines.length > 0 ? (
                    <View style={styles.filterRow}>
                        <FilterChip
                            label={tr("shopOrder.price.products", { count: catalog.total })}
                            on={!onlyInCart}
                            onPress={() => setOnlyInCart(false)}
                        />
                        {cart.lines.length > 0 ? (
                            <FilterChip
                                label={`${tr("shopOrder.price.inCartFilter")} · ${cart.lines.length}`}
                                on={onlyInCart}
                                onPress={() => setOnlyInCart(true)}
                            />
                        ) : null}
                        {catalog.isFetching && !catalog.isFetchingNextPage ? <ActivityIndicator size="small" color={t.colors.accentDk} /> : null}
                    </View>
                ) : null}
            </View>

            <FlatList
                data={rows}
                keyExtractor={(r) => r.key}
                renderItem={renderItem}
                extraData={cart.lines}
                contentContainerStyle={[styles.list, cart.count > 0 && styles.listWithBar]}
                ListEmptyComponent={listEmpty}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                initialNumToRender={8}
                onEndReachedThreshold={0.6}
                onEndReached={() => {
                    if (!onlyInCart && catalog.hasNextPage && !catalog.isFetchingNextPage) void catalog.fetchNextPage();
                }}
                ListFooterComponent={
                    catalog.isFetchingNextPage ? (
                        <View style={styles.footerLoading}>
                            <ActivityIndicator size="small" color={t.colors.accentDk} />
                            <AppText variant="caption" muted>
                                {tr("shopOrder.price.loadingMore")}
                            </AppText>
                        </View>
                    ) : null
                }
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
                            {cart.lines.length !== cart.count ? ` · ${tr("shopOrder.itemsCount", { count: cart.lines.length })}` : ""}
                        </AppText>
                        <AppText variant="title" onDark>
                            {formatPrice(cart.estimate)}
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

function FilterChip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
    const t = useTheme();
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[styles.filterChip, { backgroundColor: on ? t.colors.primary : t.colors.surface, borderColor: on ? t.colors.primary : t.colors.border }]}
        >
            <AppText variant="label" color={on ? "white" : "ink700"}>
                {label}
            </AppText>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    headerWrap: { paddingHorizontal: 16 },
    search: { marginTop: 2, marginBottom: 6 },
    clearBtn: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    filterRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
    filterChip: { height: 30, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, justifyContent: "center" },
    footerLoading: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
    list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 },
    listWithBar: { paddingBottom: 110 },
    pad: { paddingTop: 8 },
    skel: { marginBottom: 8 },
    card: {
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        marginBottom: 8,
        overflow: "hidden",
    },
    cardHead: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 10, paddingVertical: 8 },
    thumb: { width: 40, height: 40, borderRadius: 8, alignItems: "center", justifyContent: "center", overflow: "hidden" },
    thumbImg: { width: 40, height: 40 },
    variant: { paddingHorizontal: 10, paddingVertical: 7, gap: 4, borderTopWidth: StyleSheet.hairlineWidth },
    variantInfo: { gap: 2 },
    // Soft lime wash marks a variant that is already in the cart (lime-50, under the brand tertiary).
    variantInCart: { backgroundColor: "#F7FEE7" },
    actionRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    packRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
    packChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, height: 28, borderRadius: 999, borderWidth: 1 },
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
