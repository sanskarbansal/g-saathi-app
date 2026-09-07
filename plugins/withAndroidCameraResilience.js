const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Android-only hardening for the storefront-photo capture.
 *
 * `launchCameraAsync` hands control to the system camera activity. On the 2–3 GB
 * handsets our field agents carry, Android frequently reclaims our process while
 * that activity is in front — the agent taps the shutter and the app cold-starts
 * instead of returning to the onboarding form.
 *
 *   - `largeHeap`: a bigger Dalvik heap makes us a less attractive kill target
 *     and gives us headroom to decode the returned JPEG.
 *   - `hardwareAccelerated`: explicit, so image decode/draw stays on the GPU.
 *
 * Lives as a config plugin (rather than a hand edit to android/) so the setting
 * survives `expo prebuild --clean`.
 */
module.exports = function withAndroidCameraResilience(config) {
    return withAndroidManifest(config, (cfg) => {
        const app = cfg.modResults.manifest.application?.[0];
        if (app) {
            app.$["android:largeHeap"] = "true";
            app.$["android:hardwareAccelerated"] = "true";
        }
        return cfg;
    });
};
