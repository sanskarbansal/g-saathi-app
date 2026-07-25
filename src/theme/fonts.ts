import {
    useFonts,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
} from "@expo-google-fonts/inter";

/** Load the Inter family used across the app. Returns `[loaded, error]`. */
export function useAppFonts(): [boolean, Error | null] {
    const [loaded, error] = useFonts({
        Inter_400Regular,
        Inter_500Medium,
        Inter_600SemiBold,
        Inter_700Bold,
        Inter_800ExtraBold,
        Inter_900Black,
    });
    return [loaded, error ?? null];
}
