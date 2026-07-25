import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { Home, MapPinned, BarChart3, User, Plus, type LucideIcon } from "lucide-react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import { useTheme } from "@/theme";
import { AppText } from "@/ui";
import type { AppTabsParamList } from "./types";

const ICONS: Record<keyof AppTabsParamList, LucideIcon> = {
    Home: Home,
    Beat: MapPinned,
    Score: BarChart3,
    Profile: User,
};
const LABELS: Record<keyof AppTabsParamList, string> = {
    Home: "tabs.home",
    Beat: "tabs.beat",
    Score: "tabs.score",
    Profile: "tabs.profile",
};

/**
 * Custom bottom nav: Home · Beat · [＋ Add Kirana FAB] · Score · Profile.
 * The center FAB opens the Add-Kirana modal on the root stack. A "Rewards" slot
 * is intentionally left out for now (no backend) — add it here later.
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
    const t = useTheme();
    const { t: tr } = useTranslation();
    const insets = useSafeAreaInsets();

    const routes = state.routes;
    const leftRoutes = routes.slice(0, 2);
    const rightRoutes = routes.slice(2);

    const openAddKirana = () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        navigation.getParent()?.navigate("AddKirana");
    };

    const renderItem = (routeName: string, index: number) => {
        const focused = state.index === index;
        const name = routeName as keyof AppTabsParamList;
        const Icon = ICONS[name];
        const color = focused ? t.colors.accentDk : t.colors.ink400;

        const onPress = () => {
            const event = navigation.emit({
                type: "tabPress",
                target: routes[index]?.key ?? "",
                canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) navigation.navigate(name);
        };

        return (
            <Pressable
                key={routeName}
                onPress={onPress}
                style={styles.item}
                accessibilityRole="button"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={tr(LABELS[name])}
            >
                <Icon size={23} color={color} strokeWidth={focused ? 2.4 : 2} />
                <AppText variant="caption" style={{ color, marginTop: 3 }}>
                    {tr(LABELS[name])}
                </AppText>
            </Pressable>
        );
    };

    return (
        <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
            <View style={styles.row}>
                {leftRoutes.map((r, i) => renderItem(r.name, i))}

                <View style={styles.fabSlot}>
                    <Pressable
                        onPress={openAddKirana}
                        accessibilityRole="button"
                        accessibilityLabel={tr("tabs.addKirana")}
                        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
                    >
                        <LinearGradient
                            colors={t.gradients.accent}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.fabInner}
                        >
                            <Plus size={28} color={t.colors.primary} strokeWidth={2.6} />
                        </LinearGradient>
                    </Pressable>
                </View>

                {rightRoutes.map((r, i) => renderItem(r.name, i + 2))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#FFFFFF",
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: "#E5E7EB",
        shadowColor: "#111827",
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: -4 },
        elevation: 12,
    },
    row: { flexDirection: "row", alignItems: "flex-start", paddingTop: 10, minHeight: 60 },
    item: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 2 },
    fabSlot: { width: 72, alignItems: "center" },
    fab: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginTop: -28,
    },
    fabPressed: { transform: [{ scale: 0.94 }] },
    fabInner: {
        flex: 1,
        borderRadius: 30,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 4,
        borderColor: "#FFFFFF",
        shadowColor: "#65A30D",
        shadowOpacity: 0.4,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
    },
});
