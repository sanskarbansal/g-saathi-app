import type { ExpoConfig, ConfigContext } from "expo/config";

/**
 * Groship Saathi — field-agent companion app.
 *
 * The API base URL is injected from the environment (never hardcoded). Set
 * EXPO_PUBLIC_API_URL in `.env` (see `.env.example`). It is surfaced to the app
 * via `Constants.expoConfig.extra.apiUrl` and read in `src/config/env.ts`.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
    ...config,
    name: "Groship Saathi",
    slug: "groship-saathi",
    version: "0.1.0",
    orientation: "portrait",
    scheme: "saathi",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    icon: "./assets/icon.png",
    splash: {
        image: "./assets/splash.png",
        resizeMode: "contain",
        backgroundColor: "#1A2E05",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
        supportsTablet: true,
        bundleIdentifier: "com.groship.saathi",
        infoPlist: {
            ITSAppUsesNonExemptEncryption: false,
            NSLocationWhenInUseUsageDescription:
                "Groship Saathi uses your location to pin shops you onboard and to share your live location with your field manager while you're on your beat.",
            NSCameraUsageDescription: "Groship Saathi uses the camera to capture a storefront photo during onboarding.",
            NSPhotoLibraryUsageDescription: "Groship Saathi lets you attach a storefront photo from your library during onboarding.",
            LSApplicationQueriesSchemes: ["whatsapp"],
        },
    },
    android: {
        package: "com.groship.saathi",
        adaptiveIcon: {
            foregroundImage: "./assets/icon.png",
            backgroundColor: "#1A2E05",
        },
        edgeToEdgeEnabled: true,
        permissions: ["android.permission.ACCESS_COARSE_LOCATION", "android.permission.ACCESS_FINE_LOCATION", "android.permission.CAMERA"],
    },
    plugins: [
        "expo-secure-store",
        [
            "expo-location",
            {
                locationWhenInUsePermission:
                    "Groship Saathi uses your location to pin shops you onboard and to share your live location with your field manager while you're on your beat.",
            },
        ],
        [
            "expo-image-picker",
            {
                // These config-plugin props are the source of truth for the iOS
                // usage descriptions in a prebuild / dev build / EAS build.
                photosPermission: "Groship Saathi lets you attach a storefront photo from your library during onboarding.",
                cameraPermission: "Groship Saathi uses the camera to capture a storefront photo during onboarding.",
            },
        ],
        "expo-font",
        // Android: largeHeap + hardware acceleration, so the OS is less likely to
        // kill us while the system camera activity is in the foreground.
        "./plugins/withAndroidCameraResilience",
    ],
    extra: {
        // Read in src/config/env.ts. EXPO_PUBLIC_* vars are inlined at build time;
        // we also mirror it here so `expo-constants` can surface it consistently.
        apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api/v1",
        eas: {
            projectId: "c008bef1-ae9c-467a-a77e-9e4b5e9fd5ef",
        },
    },
});
