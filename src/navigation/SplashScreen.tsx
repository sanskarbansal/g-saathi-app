import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ShoppingBag } from "lucide-react-native";

import { useTheme } from "@/theme";
import { AppText } from "@/ui";

/** Branded loading screen shown during cold-start session validation. */
export function SplashScreen() {
    const t = useTheme();
    return (
        <LinearGradient colors={t.gradients.hero} style={styles.fill}>
            <View style={styles.center}>
                <View style={styles.logo}>
                    <ShoppingBag size={30} color={t.colors.primary} />
                </View>
                <AppText variant="h1" onDark style={styles.title}>
                    Groship Saathi
                </AppText>
                <ActivityIndicator color={t.colors.accentLt} style={styles.spinner} />
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    fill: { flex: 1 },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    logo: {
        width: 64,
        height: 64,
        borderRadius: 18,
        backgroundColor: "#A3E635",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
    },
    title: { marginBottom: 24 },
    spinner: { marginTop: 8 },
});
