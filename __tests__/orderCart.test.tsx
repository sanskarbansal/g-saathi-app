import React from "react";
import { act, renderHook } from "@testing-library/react-native";

import { CartProvider, useCart } from "@/features/orders";
import type { CatalogProduct, CatalogVariant } from "@/api";

const variant = (over: Partial<CatalogVariant> = {}): CatalogVariant => ({
    id: "v1",
    name: "5kg",
    sku: "RICE-5",
    sellingPrice: 100,
    mrp: 120,
    images: null,
    unit: "bag",
    inStock: true,
    isDefault: true,
    ...over,
});
const product = (over: Partial<CatalogProduct> = {}): CatalogProduct => ({
    id: "p1",
    name: "Basmati Rice",
    slug: "basmati",
    category: null,
    brand: null,
    variants: [variant()],
    ...over,
});

const wrapper = ({ children }: { children: React.ReactNode }) => <CartProvider>{children}</CartProvider>;

describe("order cart (order for this shop)", () => {
    it("adds, steps and removes lines; totals follow the segment price", () => {
        const { result } = renderHook(() => useCart(), { wrapper });
        act(() => result.current.startFor("s1", "Sharma Kirana"));
        act(() => result.current.setQuantity(product(), variant({ effectivePrice: 90 }), 2));
        expect(result.current.count).toBe(2);
        expect(result.current.estimate).toBe(180);
        expect(result.current.quantityOf("v1")).toBe(2);

        act(() => result.current.setLineQuantity("v1", 5));
        expect(result.current.toItems()).toEqual([{ productId: "p1", variantId: "v1", quantity: 5 }]);

        act(() => result.current.setLineQuantity("v1", 0));
        expect(result.current.lines).toHaveLength(0);
        expect(result.current.count).toBe(0);
    });

    it("keeps one clientId per attempt and rotates it when the cart is cleared", () => {
        const { result } = renderHook(() => useCart(), { wrapper });
        act(() => result.current.startFor("s1", "Sharma Kirana"));
        const first = result.current.clientId;
        act(() => result.current.setQuantity(product(), variant(), 1));
        expect(result.current.clientId).toBe(first); // stable while building
        act(() => result.current.clear());
        expect(result.current.clientId).not.toBe(first);
    });

    it("switching to another store empties the cart; re-opening the same store keeps it", () => {
        const { result } = renderHook(() => useCart(), { wrapper });
        act(() => result.current.startFor("s1", "A"));
        act(() => result.current.setQuantity(product(), variant(), 3));
        act(() => result.current.startFor("s1", "A"));
        expect(result.current.count).toBe(3);
        act(() => result.current.startFor("s2", "B"));
        expect(result.current.count).toBe(0);
        expect(result.current.storeId).toBe("s2");
    });
});

describe("tier ladder helpers", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { activeTier, nextTier, lineUnitPrice } = require("@/features/orders");
    const tiers = [
        { minQuantity: 5, unitPrice: 90 },
        { minQuantity: 10, unitPrice: 80 },
    ];

    it("picks the rung reached and the next one up", () => {
        expect(activeTier(tiers, 1)).toBeNull();
        expect(nextTier(tiers, 1)).toEqual(tiers[0]);
        expect(activeTier(tiers, 7)).toEqual(tiers[0]);
        expect(nextTier(tiers, 7)).toEqual(tiers[1]);
        expect(activeTier(tiers, 12)).toEqual(tiers[1]);
        expect(nextTier(tiers, 12)).toBeNull();
        expect(activeTier([], 3)).toBeNull();
    });

    it("cart estimate follows the rung the quantity has reached", () => {
        const { result } = renderHook(() => useCart(), { wrapper });
        act(() => result.current.startFor("s1", "A"));
        act(() => result.current.setQuantity(product(), variant({ tiers }), 4));
        expect(lineUnitPrice(result.current.lines[0])).toBe(100);
        expect(result.current.estimate).toBe(400);
        act(() => result.current.setLineQuantity("v1", 10));
        expect(lineUnitPrice(result.current.lines[0])).toBe(80);
        expect(result.current.estimate).toBe(800);
    });
});

describe("packs (variant units)", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { packBreakdown, sellableUnits } = require("@/features/orders");
    const units = [
        { id: "u-base", name: "Piece", factorToBase: 1, isBase: true, isSealed: false, sellable: true, sellingPrice: null, mrp: null, sortOrder: 0, available: 500 },
        { id: "u-inner", name: "Box", factorToBase: 6, isBase: false, isSealed: false, sellable: true, sellingPrice: null, mrp: null, sortOrder: 1, available: 80 },
        { id: "u-outer", name: "Case", factorToBase: 24, isBase: false, isSealed: false, sellable: true, sellingPrice: null, mrp: null, sortOrder: 2, available: 20 },
        { id: "u-nosell", name: "Pallet", factorToBase: 480, isBase: false, isSealed: false, sellable: false, sellingPrice: null, mrp: null, sortOrder: 3 },
    ];

    it("orders sellable packs base-first by size and drops non-sellable ones", () => {
        expect(sellableUnits({ units }).map((u: { id: string }) => u.id)).toEqual(["u-base", "u-inner", "u-outer"]);
        expect(sellableUnits({ units: undefined })).toEqual([]);
    });

    it("explains a base quantity greedily in packs", () => {
        const bd = packBreakdown(55, units).map((b: { unit: { name: string }; count: number }) => `${b.count} ${b.unit.name}`);
        expect(bd).toEqual(["2 Case", "1 Box", "1 Piece"]);
        expect(packBreakdown(24, units)).toHaveLength(1);
        expect(packBreakdown(3, [units[0]])).toBeNull();
    });

    it("a pack line is sent in BASE units with the pack noted", () => {
        const { result } = renderHook(() => useCart(), { wrapper });
        act(() => result.current.startFor("s1", "A"));
        act(() => result.current.setQuantity(product(), variant({ units }), 48, { unitId: "u-outer", packQuantity: 2 }));
        expect(result.current.toItems()).toEqual([{ productId: "p1", variantId: "v1", quantity: 48, unitId: "u-outer", packQuantity: 2 }]);
        // Stepping the base count clears the pack note (it no longer describes the line).
        act(() => result.current.setLineQuantity("v1", 49, null));
        expect(result.current.toItems()).toEqual([{ productId: "p1", variantId: "v1", quantity: 49 }]);
    });
});

describe("order targets", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { orderTargetKey } = require("@/api");
    it("scopes the cart per store, and per phone regardless of number format", () => {
        expect(orderTargetKey({ kind: "store", storeId: "s1", onboardingId: "o1" })).toBe("store:s1");
        expect(orderTargetKey({ kind: "customer", phone: "+91 97000 11122" })).toBe("phone:9700011122");
        expect(orderTargetKey({ kind: "customer", phone: "9700011122" })).toBe("phone:9700011122");
    });
});

describe("quantity limit (per-order max / stock)", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { quantityLimit } = require("@/features/orders");
    const units = [
        { id: "u-base", name: "Piece", factorToBase: 1, isBase: true, isSealed: false, sellable: true, sellingPrice: null, mrp: null, sortOrder: 0, available: 30 },
        { id: "u-box", name: "Box", factorToBase: 12, isBase: false, isSealed: false, sellable: true, sellingPrice: null, mrp: null, sortOrder: 1, available: 2 },
    ];

    it("is the tighter of the per-order cap and base stock", () => {
        expect(quantityLimit({ maxQuantityPerOrder: 50, units })).toBe(30);
        expect(quantityLimit({ maxQuantityPerOrder: 20, units })).toBe(20);
        expect(quantityLimit({ maxQuantityPerOrder: 20 })).toBe(20);
        expect(quantityLimit({ maxQuantityPerOrder: null, units })).toBe(30);
        expect(quantityLimit({ maxQuantityPerOrder: null })).toBeNull();
        expect(quantityLimit({ maxQuantityPerOrder: 0 })).toBeNull();
    });

    it("the cart never holds more than the limit, whichever setter asked", () => {
        const { result } = renderHook(() => useCart(), { wrapper });
        act(() => result.current.startFor("s1", "A"));
        act(() => result.current.setQuantity(product(), variant({ maxQuantityPerOrder: 20, units }), 500));
        expect(result.current.quantityOf("v1")).toBe(20);
        act(() => result.current.setLineQuantity("v1", 99));
        expect(result.current.quantityOf("v1")).toBe(20);
        // A whole pack that would overshoot is cut to the limit too.
        act(() => result.current.setQuantity(product(), variant({ maxQuantityPerOrder: 20, units }), 12 + 12, { unitId: "u-box", packQuantity: 2 }));
        expect(result.current.quantityOf("v1")).toBe(20);
        // Stock alone bounds it when there is no cap.
        act(() => result.current.setQuantity(product(), variant({ maxQuantityPerOrder: null, units }), 31));
        expect(result.current.quantityOf("v1")).toBe(30);
    });
});
