import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

import type { CatalogProduct, CatalogUnit, CatalogVariant, OrderCartItem } from "@/api";
import { generateClientId } from "@/utils/capture";

/** One line in the agent's cart — a snapshot of the variant so the list renders offline. */
export interface CartLine {
    productId: string;
    variantId: string;
    productName: string;
    variantName: string;
    unit: string | null;
    /** Net weight / volume as the hub typed it ("500g") — labelled on the checkout line. */
    weight: string | null;
    image: string | null;
    /** Per-base-unit price shown while building the cart (server re-prices at preview/place). */
    unitPrice: number;
    /** List price before any quantity-break rung. */
    basePrice: number;
    /** Quantity-break ladder visible to this store, ascending by minQuantity. */
    tiers: { minQuantity: number; unitPrice: number }[];
    mrp: number;
    maxQuantityPerOrder: number | null;
    /** Sellable packs for this variant (base first), for the pack picker + breakdown. */
    units: CatalogUnit[];
    /** The pack the agent last chose (null = base unit) and how many of it. */
    packUnitId: string | null;
    packQuantity: number | null;
    /** BASE units — what is actually ordered. */
    quantity: number;
}

interface CartState {
    storeId: string | null;
    shopName: string | null;
    lines: CartLine[];
}

interface CartApi extends CartState {
    /** Total base units across all lines. */
    count: number;
    /** Sum of unitPrice × qty — an estimate until the server previews it. */
    estimate: number;
    /** The offline idempotency key for the NEXT place attempt (stable until the cart is cleared). */
    clientId: string;
    /** Bind the cart to a store; switching stores empties it. */
    startFor(storeId: string, shopName: string): void;
    setQuantity(product: CatalogProduct, variant: CatalogVariant, quantity: number, pack?: { unitId: string; packQuantity: number } | null): void;
    setLineQuantity(variantId: string, quantity: number, pack?: { unitId: string; packQuantity: number } | null): void;
    quantityOf(variantId: string): number;
    toItems(): OrderCartItem[];
    clear(): void;
}

/** The packs an agent can pick for a variant: sellable, whole factor, base first then by size. */
export function sellableUnits(variant: Pick<CatalogVariant, "units">): CatalogUnit[] {
    return (variant.units ?? [])
        .filter((u) => u.sellable !== false && Number.isInteger(u.factorToBase) && u.factorToBase >= 1)
        .sort((a, b) => (a.isBase ? -1 : b.isBase ? 1 : a.factorToBase - b.factorToBase));
}

/**
 * Explain a base quantity in packs: "2 × Outer (24) + 3 pcs". Greedy from the largest
 * pack down; returns null when the variant has no packs beyond base.
 */
export function packBreakdown(quantity: number, units: CatalogUnit[]): { unit: CatalogUnit; count: number }[] | null {
    const packs = units.filter((u) => !u.isBase && u.factorToBase > 1).sort((a, b) => b.factorToBase - a.factorToBase);
    if (packs.length === 0) return null;
    const out: { unit: CatalogUnit; count: number }[] = [];
    let rest = quantity;
    for (const u of packs) {
        const n = Math.floor(rest / u.factorToBase);
        if (n > 0) {
            out.push({ unit: u, count: n });
            rest -= n * u.factorToBase;
        }
    }
    const base = units.find((u) => u.isBase);
    if (rest > 0 && base) out.push({ unit: base, count: rest });
    return out;
}

/**
 * The pack note to send with a line at `quantity`: set only when the quantity is exactly a
 * whole number of ONE pack (so "2 × Case" is preserved for the hub), else null (loose).
 */
export function packNoteFor(quantity: number, units: CatalogUnit[]): { unitId: string; packQuantity: number } | null {
    const bd = packBreakdown(quantity, units);
    const first = bd?.[0];
    return bd && bd.length === 1 && first && !first.unit.isBase ? { unitId: first.unit.id, packQuantity: first.count } : null;
}

/**
 * The most of a variant that can go in the cart, in BASE units: the per-order cap (which the
 * hub already folds live stock into) and, when the pack hierarchy reports it, the base units
 * on hand — whichever is tighter. `null` when nothing bounds it.
 */
export function quantityLimit(v: { maxQuantityPerOrder?: number | null; units?: CatalogUnit[] | null }): number | null {
    const cap = v.maxQuantityPerOrder != null && v.maxQuantityPerOrder > 0 ? v.maxQuantityPerOrder : null;
    const base = (v.units ?? []).find((u) => u.isBase);
    const stock = base?.available != null && base.available >= 0 ? base.available : null;
    if (cap == null) return stock;
    if (stock == null) return cap;
    return Math.min(cap, stock);
}

/** Clamp a requested base quantity into [0, limit]. */
function clampQuantity(quantity: number, limit: number | null): number {
    const q = Math.max(0, Math.floor(quantity));
    return limit != null && q > limit ? limit : q;
}

/** Per-unit price for a line at its current quantity: the highest rung reached, else the qty-1 price. */
export function lineUnitPrice(l: CartLine): number {
    let price = l.unitPrice;
    for (const r of l.tiers) if (l.quantity >= r.minQuantity && r.unitPrice < price) price = r.unitPrice;
    return price;
}

const CartContext = createContext<CartApi | null>(null);

/**
 * In-memory cart for "order for this shop". Deliberately NOT persisted: a cart is built
 * and placed within one store visit, and stock/prices are only trustworthy live. Scoped
 * to one store at a time (opening the catalog for a different shop starts fresh).
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<CartState>({ storeId: null, shopName: null, lines: [] });
    const clientIdRef = useRef<string>(generateClientId());

    const startFor = useCallback((storeId: string, shopName: string) => {
        setState((s) => {
            if (s.storeId === storeId) return { ...s, shopName };
            clientIdRef.current = generateClientId();
            return { storeId, shopName, lines: [] };
        });
    }, []);

    const setLineQuantity = useCallback((variantId: string, quantity: number, pack?: { unitId: string; packQuantity: number } | null) => {
        setState((s) => {
            const existing = s.lines.find((l) => l.variantId === variantId);
            if (!existing) return s;
            // Never let a line exceed what the hub will accept — whichever path asked for it.
            const q = clampQuantity(quantity, quantityLimit(existing));
            const lines =
                q === 0
                    ? s.lines.filter((l) => l.variantId !== variantId)
                    : s.lines.map((l) =>
                          l.variantId === variantId
                              ? { ...l, quantity: q, packUnitId: pack === undefined ? l.packUnitId : (pack?.unitId ?? null), packQuantity: pack === undefined ? l.packQuantity : (pack?.packQuantity ?? null) }
                              : l,
                      );
            return { ...s, lines };
        });
    }, []);

    const setQuantity = useCallback((product: CatalogProduct, variant: CatalogVariant, quantity: number, pack?: { unitId: string; packQuantity: number } | null) => {
        setState((s) => {
            // Never let a line exceed what the hub will accept — whichever path asked for it.
            const q = clampQuantity(quantity, quantityLimit({ maxQuantityPerOrder: variant.maxQuantityPerOrder, units: sellableUnits(variant) }));
            const existing = s.lines.find((l) => l.variantId === variant.id);
            if (q === 0) return { ...s, lines: s.lines.filter((l) => l.variantId !== variant.id) };
            if (existing) {
                return {
                    ...s,
                    lines: s.lines.map((l) =>
                        l.variantId === variant.id
                            ? { ...l, quantity: q, packUnitId: pack === undefined ? l.packUnitId : (pack?.unitId ?? null), packQuantity: pack === undefined ? l.packQuantity : (pack?.packQuantity ?? null) }
                            : l,
                    ),
                };
            }
            const line: CartLine = {
                productId: product.id,
                variantId: variant.id,
                productName: product.name,
                variantName: variant.name,
                unit: variant.unit ?? null,
                weight: variant.weight ?? null,
                image: variant.images?.[0] ?? null,
                unitPrice: variant.effectivePrice ?? variant.sellingPrice,
                basePrice: variant.sellingPrice,
                tiers: variant.tiers ?? [],
                mrp: variant.mrp,
                maxQuantityPerOrder: variant.maxQuantityPerOrder ?? null,
                units: sellableUnits(variant),
                packUnitId: pack?.unitId ?? null,
                packQuantity: pack?.packQuantity ?? null,
                quantity: q,
            };
            return { ...s, lines: [...s.lines, line] };
        });
    }, []);

    const clear = useCallback(() => {
        clientIdRef.current = generateClientId();
        setState((s) => ({ ...s, lines: [] }));
    }, []);

    const value = useMemo<CartApi>(() => {
        const count = state.lines.reduce((n, l) => n + l.quantity, 0);
        // Estimate follows the rung each line's quantity has reached (server confirms at preview).
        const estimate = state.lines.reduce((n, l) => n + lineUnitPrice(l) * l.quantity, 0);
        return {
            ...state,
            count,
            estimate,
            clientId: clientIdRef.current,
            startFor,
            setQuantity,
            setLineQuantity,
            quantityOf: (variantId) => state.lines.find((l) => l.variantId === variantId)?.quantity ?? 0,
            toItems: () =>
                state.lines.map((l) => ({
                    productId: l.productId,
                    variantId: l.variantId,
                    quantity: l.quantity,
                    ...(l.packUnitId && l.packQuantity ? { unitId: l.packUnitId, packQuantity: l.packQuantity } : {}),
                })),
            clear,
        };
    }, [state, startFor, setQuantity, setLineQuantity, clear]);

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error("useCart must be used within CartProvider");
    return ctx;
}
