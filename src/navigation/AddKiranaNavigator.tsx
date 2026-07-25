import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import {
    AddKiranaProvider,
    ActivationScreen,
    DetailsScreen,
    KycScreen,
    SuccessScreen,
} from "@/features/onboarding";
import type { AddKiranaStackParamList } from "./types";

const Stack = createNativeStackNavigator<AddKiranaStackParamList>();

/** The Add-Kirana wizard, wrapped in its draft provider. Presented modally. */
export function AddKiranaNavigator() {
    return (
        <AddKiranaProvider>
            <Stack.Navigator
                screenOptions={{ headerShown: false, animation: "slide_from_right" }}
            >
                <Stack.Screen name="Details" component={DetailsScreen} />
                <Stack.Screen name="Kyc" component={KycScreen} />
                <Stack.Screen
                    name="Activation"
                    component={ActivationScreen}
                    options={{ gestureEnabled: false }}
                />
                <Stack.Screen
                    name="Success"
                    component={SuccessScreen}
                    options={{ gestureEnabled: false }}
                />
            </Stack.Navigator>
        </AddKiranaProvider>
    );
}
