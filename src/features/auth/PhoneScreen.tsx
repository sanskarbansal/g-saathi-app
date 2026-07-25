import React, { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Smartphone, ShoppingBag } from "lucide-react-native";

import { authApi, errorI18nKey, isApiError } from "@/api";
import { phoneDigitsSchema, toFullPhone } from "@/api/schemas";
import { useTheme } from "@/theme";
import { AppText, Button, Field, HeroHeader, InlineBanner, Screen } from "@/ui";
import type { AuthStackScreenProps } from "@/navigation/types";

export function PhoneScreen({ navigation }: AuthStackScreenProps<"Phone">) {
    const t = useTheme();
    const { t: tr } = useTranslation();
    const [digits, setDigits] = useState("");
    const valid = useMemo(() => phoneDigitsSchema.safeParse(digits).success, [digits]);

    const sendOtp = useMutation({
        mutationFn: (full: string) => authApi.sendOtp(full),
        onSuccess: (_data, full) => navigation.navigate("Otp", { phone: full }),
    });

    const onSubmit = () => {
        if (!valid) return;
        sendOtp.mutate(toFullPhone(digits));
    };

    const errorText = sendOtp.error
        ? tr(errorI18nKey(isApiError(sendOtp.error) ? sendOtp.error.code : "UNKNOWN"), {
              defaultValue: tr("errors.UNKNOWN"),
          })
        : null;

    return (
        <Screen padded={false} edges={["left", "right", "bottom"]}>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <HeroHeader style={styles.hero}>
                    <View style={styles.brandRow}>
                        <View style={styles.logo}>
                            <ShoppingBag size={22} color={t.colors.primary} />
                        </View>
                        <AppText variant="subtitle" onDark>
                            {tr("common.appName")}
                        </AppText>
                    </View>
                    <AppText variant="h1" onDark style={styles.title}>
                        {tr("auth.phoneTitle")}
                    </AppText>
                    <AppText variant="body" onDark muted style={styles.subtitle}>
                        {tr("auth.phoneSubtitle")}
                    </AppText>
                </HeroHeader>

                <View style={styles.body}>
                    <Field
                        label={tr("auth.phoneLabel")}
                        prefix="+91"
                        leftIcon={<Smartphone size={20} color={t.colors.ink500} />}
                        keyboardType="number-pad"
                        placeholder={tr("auth.phonePlaceholder")}
                        value={digits}
                        onChangeText={(v) => setDigits(v.replace(/\D/g, "").slice(0, 10))}
                        maxLength={10}
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={onSubmit}
                        textContentType="telephoneNumber"
                        autoComplete="tel"
                    />

                    {errorText ? (
                        <InlineBanner tone="warning" text={errorText} style={styles.error} />
                    ) : null}

                    <View style={styles.spacer} />

                    <Button
                        title={tr("auth.phoneCta")}
                        onPress={onSubmit}
                        loading={sendOtp.isPending}
                        disabled={!valid}
                    />
                </View>
            </KeyboardAvoidingView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    hero: { paddingBottom: 40 },
    brandRow: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
    logo: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: "#A3E635",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    title: { marginBottom: 8 },
    subtitle: { maxWidth: 320 },
    body: { flex: 1, padding: 20 },
    error: { marginTop: 16 },
    spacer: { flex: 1, minHeight: 24 },
});
