import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { Phone } from "lucide-react-native";

import { useTheme } from "@/theme";
import { callPhone } from "@/utils/call";

/** A compact round tap-to-call button for a kirana owner's phone. */
export function CallButton({ phone, size = 40 }: { phone: string; size?: number }) {
    const t = useTheme();
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel="Call"
            hitSlop={6}
            onPress={() => void callPhone(phone)}
            style={({ pressed }) => [
                styles.btn,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: t.colors.subtle,
                    opacity: pressed ? 0.6 : 1,
                },
            ]}
        >
            <Phone size={18} color={t.colors.primary} />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    btn: { alignItems: "center", justifyContent: "center" },
});
