import { Linking, Platform } from "react-native";

/** A saved point on the map — decimal-degree latitude / longitude. */
export interface LatLng {
    lat: number;
    lng: number;
}

/**
 * Universal Google Maps directions link. Opens the Google Maps app when it's
 * installed, otherwise the browser — works on both Android and iOS and needs no
 * extra native config (the app already allows `https` VIEW intents), so it's a
 * safe fallback when the platform-native scheme isn't available.
 */
export function directionsUrl({ lat, lng }: LatLng): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/**
 * Open the store's location in the device's maps app so the agent can see where
 * it is and navigate there. Tries the platform-native scheme first (Apple Maps
 * on iOS, a `geo:` intent on Android) and falls back to the universal Google
 * Maps URL. Best-effort — mirrors `callPhone()` / `sendWhatsAppInstall()`: a
 * missing maps app never throws.
 *
 * @returns true if a maps target was opened, false if every attempt failed.
 */
export async function openDirections(loc: LatLng, label?: string): Promise<boolean> {
    const { lat, lng } = loc ?? ({} as LatLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;

    const dest = `${lat},${lng}`;
    const q = label ? encodeURIComponent(label) : dest;
    const nativeUrl = Platform.select({
        ios: `maps://?daddr=${dest}&q=${q}`, // Apple Maps, destination-addressed
        android: `geo:0,0?q=${dest}(${q})`, // shows the OS maps-app chooser
        default: directionsUrl(loc),
    }) as string;

    try {
        const supported = await Linking.canOpenURL(nativeUrl);
        await Linking.openURL(supported ? nativeUrl : directionsUrl(loc));
        return true;
    } catch {
        // Native scheme unavailable (e.g. simulator) — try the universal link.
        try {
            await Linking.openURL(directionsUrl(loc));
            return true;
        } catch {
            return false;
        }
    }
}
