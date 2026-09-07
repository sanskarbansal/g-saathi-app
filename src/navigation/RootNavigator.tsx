import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useSession } from "@/auth";
import { ForbiddenScreen } from "@/features/auth/ForbiddenScreen";
import { StoreDetailScreen } from "@/features/stores/StoreDetailScreen";
import { CustomerLookupScreen, OrderCatalogScreen, OrderCheckoutScreen } from "@/features/orders";
import { AppTabs } from "./AppTabs";
import { AuthNavigator } from "./AuthNavigator";
import { AddKiranaNavigator } from "./AddKiranaNavigator";
import { SplashScreen } from "./SplashScreen";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Chooses the tree by session status; hosts the tabs, Add-Kirana modal, detail. */
export function RootNavigator() {
    const { status } = useSession();

    if (status === "loading") return <SplashScreen />;
    if (status === "unauthenticated") return <AuthNavigator />;
    if (status === "forbidden") return <ForbiddenScreen />;

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Tabs" component={AppTabs} />
            <Stack.Group screenOptions={{ presentation: "modal", animation: "slide_from_bottom" }}>
                <Stack.Screen name="AddKirana" component={AddKiranaNavigator} />
            </Stack.Group>
            <Stack.Screen
                name="StoreDetail"
                component={StoreDetailScreen}
                options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
                name="CustomerLookup"
                component={CustomerLookupScreen}
                options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
                name="OrderCatalog"
                component={OrderCatalogScreen}
                options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
                name="OrderCheckout"
                component={OrderCheckoutScreen}
                options={{ animation: "slide_from_right" }}
            />
        </Stack.Navigator>
    );
}
