import * as Crypto from "expo-crypto";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";

/** UUID v4 for the offline idempotency key (`clientId`). */
export function generateClientId(): string {
    return Crypto.randomUUID();
}

export interface CapturedGps {
    lat: number;
    lng: number;
    accuracyM?: number;
}

export type GpsResult =
    | { status: "granted"; gps: CapturedGps }
    | { status: "denied" }
    | { status: "error" };

/** Request permission and capture the current coordinate. */
export async function captureGps(): Promise<GpsResult> {
    try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status !== "granted") return { status: "denied" };
        const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
        });
        return {
            status: "granted",
            gps: {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                accuracyM:
                    typeof pos.coords.accuracy === "number"
                        ? Math.max(0, Math.round(pos.coords.accuracy))
                        : undefined,
            },
        };
    } catch {
        return { status: "error" };
    }
}

export interface CapturedPhoto {
    uri: string;
    hash: string;
}

/**
 * A content hash for the storefront photo. NOTE: this hashes the URI + a nonce as
 * an integrity token only — true file-bytes hashing + upload is deferred until the
 * backend photo-upload endpoint exists (see README "Deferred / TODO"). We send
 * `storefrontPhotoHash` + a local URI today, per the build spec.
 */
export async function hashPhoto(uri: string): Promise<string> {
    const digest = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${uri}|${Date.now()}`,
    );
    return digest.slice(0, 64);
}

/** Launch camera or gallery, returning the picked photo + its hash (or null). */
export async function pickStorefrontPhoto(
    source: "camera" | "gallery",
): Promise<CapturedPhoto | null> {
    let result: ImagePicker.ImagePickerResult;

    if (source === "camera") {
        // The camera genuinely needs permission (+ NSCameraUsageDescription).
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (perm.status !== "granted") return null;
        result = await ImagePicker.launchCameraAsync({ quality: 0.5, mediaTypes: ["images"] });
    } else {
        // Gallery: the iOS system photo picker (PHPicker) needs NO library
        // permission — requesting NSPhotoLibraryUsageDescription access is
        // unnecessary and crashes builds that don't declare it. Launch directly.
        result = await ImagePicker.launchImageLibraryAsync({ quality: 0.5, mediaTypes: ["images"] });
    }

    if (result.canceled || !result.assets?.[0]) return null;
    const uri = result.assets[0].uri;
    const hash = await hashPhoto(uri);
    return { uri, hash };
}
