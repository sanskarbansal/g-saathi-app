import { Linking } from "react-native";

/** Open the phone dialer for a stored number (e.g. "+91 98765 43210"). Best-effort. */
export async function callPhone(phone: string): Promise<void> {
    const dialable = phone.replace(/[^\d+]/g, "");
    if (!dialable) return;
    try {
        await Linking.openURL(`tel:${dialable}`);
    } catch {
        // Dialer unavailable (e.g. tablet/simulator) — no-op.
    }
}
