import { Linking } from "react-native";

/**
 * Open WhatsApp to the shop owner with a prefilled install message. No backend
 * call — the "send install link" step is a device deep-link per the build spec.
 * The owner counts as "installed" automatically when they install the app and
 * register with the shop's phone (backend claimStoreForUser) — never a manual step.
 */
export async function sendWhatsAppInstall(
    phone: string,
    message: string,
): Promise<boolean> {
    const digits = phone.replace(/\D/g, "").slice(-10);
    if (digits.length !== 10) return false;
    const text = encodeURIComponent(message);
    const appUrl = `whatsapp://send?phone=91${digits}&text=${text}`;
    const webUrl = `https://wa.me/91${digits}?text=${text}`;
    try {
        const canApp = await Linking.canOpenURL(appUrl);
        await Linking.openURL(canApp ? appUrl : webUrl);
        return true;
    } catch {
        try {
            await Linking.openURL(webUrl);
            return true;
        } catch {
            return false;
        }
    }
}
