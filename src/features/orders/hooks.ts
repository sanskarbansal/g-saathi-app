import { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fieldApi, orderTargetKey, qk, type OrderCartItem, type OrderTarget, type PlaceOrderInput, type PlaceOrderResult } from "@/api";

/** Debounce a fast-changing value (search text, cart) before it hits the network. */
export function useDebounced<T>(value: T, ms = 350): T {
    const [v, setV] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setV(value), ms);
        return () => clearTimeout(id);
    }, [value, ms]);
    return v;
}

/** The hub catalog for an order target, filtered by a (debounced) search term. */
export function useCatalog(target: OrderTarget, search: string, categoryId?: string) {
    const q = search.trim();
    return useQuery({
        queryKey: qk.catalog(orderTargetKey(target), q, categoryId),
        queryFn: () => fieldApi.getCatalog(target, { search: q || undefined, categoryId, limit: 60 }),
        placeholderData: keepPreviousData,
        staleTime: 60_000,
    });
}

/** Look a customer up by phone (only fires on a plausible 10-digit number). */
export function useCustomerLookup(phone: string) {
    const digits = phone.replace(/\D/g, "").slice(-10);
    return useQuery({
        queryKey: qk.customerLookup(digits),
        queryFn: () => fieldApi.lookupCustomer(digits),
        enabled: digits.length === 10,
        staleTime: 30_000,
        retry: 1,
    });
}

/**
 * Server pricing for the current cart. Re-runs as the cart changes (debounced); the
 * numbers it returns are exactly what placing will charge.
 */
export function useOrderPreview(target: OrderTarget, items: OrderCartItem[], couponCode: string) {
    const key = JSON.stringify(items) + "|" + couponCode.trim();
    const debouncedKey = useDebounced(key, 400);
    return useQuery({
        queryKey: ["field", "orderPreview", orderTargetKey(target), debouncedKey] as const,
        queryFn: () => fieldApi.previewFor(target, items, couponCode.trim() || undefined),
        enabled: items.length > 0,
        placeholderData: keepPreviousData,
        staleTime: 15_000,
        retry: 1,
    });
}

/** Orders this agent placed (optionally for one store / one kind). */
export function useOrders(storeId?: string, limit = 20, kind?: "store" | "customer") {
    return useQuery({
        queryKey: qk.orders(storeId, kind),
        queryFn: () => fieldApi.listOrders({ storeId, kind, limit }),
    });
}

export function useOrder(orderId: string | undefined) {
    return useQuery({
        queryKey: qk.order(orderId ?? "none"),
        queryFn: () => fieldApi.getOrder(orderId as string),
        enabled: Boolean(orderId),
    });
}

/** Place the order; on success refresh the orders, the onboarding detail and the score. */
export function usePlaceOrder(target: OrderTarget) {
    const qc = useQueryClient();
    return useMutation<PlaceOrderResult, unknown, PlaceOrderInput>({
        mutationFn: (body) => fieldApi.placeFor(target, body),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: ["field", "orders"] });
            void qc.invalidateQueries({ queryKey: qk.home });
            void qc.invalidateQueries({ queryKey: qk.stores });
            if (target.kind === "store") void qc.invalidateQueries({ queryKey: qk.onboarding(target.onboardingId) });
            if (target.kind === "customer") void qc.invalidateQueries({ queryKey: ["field", "customerLookup"] });
        },
    });
}

export function useSendPaymentLink(orderId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => fieldApi.sendOrderPaymentLink(orderId),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: qk.order(orderId) });
        },
    });
}
