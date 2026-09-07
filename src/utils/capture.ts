import { Platform } from "react-native";
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

/**
 * Camera options tuned for the low-RAM Android handsets our agents carry.
 *
 * `launchCameraAsync` hands off to the system camera activity, and on a 2–3 GB
 * device Android will happily kill our process while that activity is in the
 * foreground. The smaller the bitmap we ask to come back with, the less likely
 * the OS reclaims us — and the less likely we OOM decoding a 48 MP JPEG on
 * return. `exif`/`base64` off keeps the result payload small too.
 */
const PHOTO_OPTIONS: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    quality: 0.4,
    allowsMultipleSelection: false,
    allowsEditing: false,
    exif: false,
    base64: false,
};

/** Normalise a raw picker result into our `CapturedPhoto`, or null. */
async function toCapturedPhoto(
    result: ImagePicker.ImagePickerResult | ImagePicker.ImagePickerErrorResult | null,
): Promise<CapturedPhoto | null> {
    if (!result) return null;
    // An error result carries `code`/`message` instead of assets.
    if ("code" in result) return null;
    if (result.canceled) return null;
    const uri = result.assets?.[0]?.uri;
    if (!uri) return null;
    const hash = await hashPhoto(uri);
    return { uri, hash };
}

/**
 * Launch camera or gallery, returning the picked photo + its hash (or null).
 *
 * Every failure mode here is non-fatal: a thrown native error (camera busy,
 * no camera app, permission revoked mid-flight, out of storage) resolves to
 * `null` rather than propagating as an unhandled rejection, which on a release
 * build is indistinguishable from "the app closed".
 */
export async function pickStorefrontPhoto(
    source: "camera" | "gallery",
): Promise<CapturedPhoto | null> {
    try {
        let result: ImagePicker.ImagePickerResult;

        if (source === "camera") {
            // The camera genuinely needs permission (+ NSCameraUsageDescription).
            const perm = await ImagePicker.requestCameraPermissionsAsync();
            if (perm.status !== "granted") return null;
            result = await ImagePicker.launchCameraAsync(PHOTO_OPTIONS);
        } else {
            // Gallery: the iOS system photo picker (PHPicker) needs NO library
            // permission — requesting NSPhotoLibraryUsageDescription access is
            // unnecessary and crashes builds that don't declare it. Launch directly.
            result = await ImagePicker.launchImageLibraryAsync(PHOTO_OPTIONS);
        }

        return await toCapturedPhoto(result);
    } catch {
        return null;
    }
}

/**
 * Recover a photo that was captured while Android had killed our process.
 *
 * On Android the camera runs in a separate activity. Under memory pressure the
 * OS destroys `MainActivity` (and our whole JS context) behind it, so when the
 * agent taps the shutter and confirms, the app cold-starts instead of returning
 * to the onboarding form — from the agent's seat, "the app closed and I lost my
 * shop". `getPendingResultAsync` hands back the result the OS delivered to the
 * restarted activity, so the shot the agent already took is not thrown away.
 *
 * Call this once when the Add-Kirana flow mounts. No-op off Android.
 */
export async function recoverPendingPhoto(): Promise<CapturedPhoto | null> {
    if (Platform.OS !== "android") return null;
    if (typeof ImagePicker.getPendingResultAsync !== "function") return null;
    try {
        const pending: unknown = await ImagePicker.getPendingResultAsync();
        // Some module versions hand back an array of pending results.
        const first = Array.isArray(pending) ? (pending[0] ?? null) : pending;
        return await toCapturedPhoto(
            (first ?? null) as ImagePicker.ImagePickerResult | null,
        );
    } catch {
        return null;
    }
}
