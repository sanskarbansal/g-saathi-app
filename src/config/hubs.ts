/**
 * STUB hub list for the nearest-Groship-hub selector (Bhiwani zone).
 *
 * `warehouseId` is intentionally `null` here: the real warehouse UUIDs come from a
 * hubs/warehouses endpoint that is NOT part of the field contract (§4) yet, and
 * POSTing a fabricated UUID would fail the FK. So the picker is display-only for
 * now, and we only send `warehouseId` when a hub carries a real id. Wire real ids
 * here once the endpoint is confirmed (see README "Deferred / TODO").
 */
export interface Hub {
    key: string;
    name: string;
    area: string;
    warehouseId: string | null;
}

export const HUBS: Hub[] = [
    { key: "bhiwani-central", name: "Bhiwani Central Hub", area: "Bhiwani", warehouseId: null },
    { key: "bhiwani-industrial", name: "Bhiwani Industrial Area", area: "Bhiwani", warehouseId: null },
    { key: "loharu-road", name: "Loharu Road Hub", area: "Bhiwani", warehouseId: null },
    { key: "hansi-gate", name: "Hansi Gate Hub", area: "Bhiwani", warehouseId: null },
    { key: "tosham-chungi", name: "Tosham Chungi Hub", area: "Bhiwani", warehouseId: null },
];

export function findHub(key?: string | null): Hub | null {
    if (!key) return null;
    return HUBS.find((h) => h.key === key) ?? null;
}
