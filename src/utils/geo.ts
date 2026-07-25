/** Straight-line distance in metres between two lat/lng points (Haversine). */
export function haversineMeters(
    a: { lat: number; lng: number },
    b: { lat: number; lng: number },
): number {
    const R = 6371000; // Earth radius, metres
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const s =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s)));
}
