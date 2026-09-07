import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";

import "@/i18n"; // initialize i18next (side effect)
import { ThemeProvider, useAppFonts } from "@/theme";
import { QueryProvider, initOnlineManager, initMutationQueue } from "@/offline";
import { AuthProvider } from "@/auth";
import { LocationProvider } from "@/location";
import { CartProvider } from "@/features/orders";
import { RootNavigator } from "@/navigation/RootNavigator";
import { SplashScreen } from "@/navigation/SplashScreen";

// Bridge connectivity → React Query once, at startup.
initOnlineManager();

export default function App() {
    const [fontsLoaded] = useAppFonts();

    // Hydrate + auto-flush the offline onboarding queue.
    useEffect(() => {
        const unsubscribe = initMutationQueue();
        return () => unsubscribe();
    }, []);

    if (!fontsLoaded) {
        return (
            <ThemeProvider>
                <SplashScreen />
            </ThemeProvider>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <QueryProvider>
                    <ThemeProvider>
                        <AuthProvider>
                            <LocationProvider>
                                <CartProvider>
                                    <NavigationContainer>
                                        <StatusBar style="light" />
                                        <RootNavigator />
                                    </NavigationContainer>
                                </CartProvider>
                            </LocationProvider>
                        </AuthProvider>
                    </ThemeProvider>
                </QueryProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
