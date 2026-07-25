import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { PhoneScreen } from "@/features/auth/PhoneScreen";
import { OtpScreen } from "@/features/auth/OtpScreen";
import type { AuthStackParamList } from "./types";

const Stack = createNativeStackNavigator<AuthStackParamList>();

/** Pre-auth flow: phone → OTP. */
export function AuthNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
            <Stack.Screen name="Phone" component={PhoneScreen} />
            <Stack.Screen name="Otp" component={OtpScreen} />
        </Stack.Navigator>
    );
}
