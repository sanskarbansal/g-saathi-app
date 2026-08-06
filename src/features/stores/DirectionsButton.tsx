import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { Navigation } from "lucide-react-native";

import { useTheme } from "@/theme";
import { openDirections, type LatLng } from "@/utils/maps";

/** A compact round tap-to-navigate button — opens the store's location in Maps. */
export function DirectionsButton({
    location,
    label,
    size = 40,
    accessibilityLabel = "Directions",
}: {
    location: LatLng;
    label?: string;
    size?: number;
    accessibilityLabel?: string;
}) {
    const t = useTheme();
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            hitSlop={6}
            onPress={() => void openDirections(location, label)}
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
            <Navigation size={18} color={t.colors.primary} />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    btn: { alignItems: "center", justifyContent: "center" },
});
