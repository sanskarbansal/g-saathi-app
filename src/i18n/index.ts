import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";

import en from "./en.json";
import hi from "./hi.json";

/** Languages with full UI translations. Hindi is the default (Haryana-local). */
export const SUPPORTED_LANGUAGES = [
    { code: "hi", label: "हिन्दी" },
    { code: "en", label: "English" },
] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];

function detectLanguage(): AppLanguage {
    try {
        const code = getLocales()?.[0]?.languageCode;
        return code === "en" ? "en" : "hi";
    } catch {
        return "hi";
    }
}

if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init({
        resources: {
            en: { translation: en },
            hi: { translation: hi },
        },
        lng: detectLanguage(),
        fallbackLng: "hi",
        defaultNS: "translation",
        returnNull: false,
        interpolation: { escapeValue: false },
    });
}

export function changeLanguage(lng: AppLanguage): Promise<unknown> {
    return i18n.changeLanguage(lng);
}

export default i18n;
