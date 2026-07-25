import type { NavigatorScreenParams } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";

/** Bottom tabs. A "Rewards" tab is intentionally NOT here yet (no backend). */
export type AppTabsParamList = {
    Home: undefined;
    Beat: undefined;
    Score: undefined;
    Profile: undefined;
};

/** Root stack: the tab shell + the Add-Kirana modal flow + store detail. */
export type RootStackParamList = {
    Tabs: NavigatorScreenParams<AppTabsParamList> | undefined;
    AddKirana: undefined;
    StoreDetail: { onboardingId: string; shopName?: string };
};

/** The Add-Kirana wizard (presented modally). Draft state lives in context. */
export type AddKiranaStackParamList = {
    Details: undefined;
    Kyc: undefined;
    Activation: undefined;
    Success: undefined;
};

/** The pre-auth stack. */
export type AuthStackParamList = {
    Phone: undefined;
    Otp: { phone: string };
};

// ── Screen prop helpers ──────────────────────────────────────────────────────
export type RootStackScreenProps<T extends keyof RootStackParamList> =
    NativeStackScreenProps<RootStackParamList, T>;

export type AppTabScreenProps<T extends keyof AppTabsParamList> = CompositeScreenProps<
    BottomTabScreenProps<AppTabsParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
>;

export type AddKiranaScreenProps<T extends keyof AddKiranaStackParamList> =
    NativeStackScreenProps<AddKiranaStackParamList, T>;

export type AuthStackScreenProps<T extends keyof AuthStackParamList> =
    NativeStackScreenProps<AuthStackParamList, T>;

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace ReactNavigation {
        // Makes `useNavigation()` typed app-wide.
        interface RootParamList extends RootStackParamList {}
    }
}
