import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { authApi, errorI18nKey, isApiError } from "@/api";
import { otpSchema } from "@/api/schemas";
import { useSession } from "@/auth";
import { useTheme } from "@/theme";
import { AppText, Button, Header, InlineBanner, Screen, useKeyboardHeight } from "@/ui";
import { prettyPhone } from "@/utils/format";
import type { AuthStackScreenProps } from "@/navigation/types";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

export function OtpScreen({ route, navigation }: AuthStackScreenProps<"Otp">) {
    const { phone } = route.params;
    const t = useTheme();
    const { t: tr } = useTranslation();
    const { signInWithOtp } = useSession();
    const insets = useSafeAreaInsets();
    // Lift the CTA above the keyboard ourselves — under Android edge-to-edge the
    // window doesn't resize, and KeyboardAvoidingView is unreliable there.
    const keyboardHeight = useKeyboardHeight();
    const keyboardPad = keyboardHeight > 0 ? Math.max(0, keyboardHeight - insets.bottom) : 0;

    const [code, setCode] = useState("");
    const [seconds, setSeconds] = useState(RESEND_SECONDS);
    const inputRef = useRef<TextInput>(null);
    const valid = otpSchema.safeParse(code).success;

    // Resend cooldown.
    useEffect(() => {
        if (seconds <= 0) return;
        const id = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
        return () => clearInterval(id);
    }, [seconds]);

    const verify = useMutation({
        mutationFn: (otp: string) => authApi.verifyOtp(phone, otp),
        onSuccess: async (result) => {
            // Session gating (agent vs forbidden) happens in AuthProvider; the
            // RootNavigator swaps trees, so no manual navigation here.
            await signInWithOtp(result);
        },
        onError: () => setCode(""),
    });

    const resend = useMutation({
        mutationFn: () => authApi.sendOtp(phone),
        onSuccess: () => setSeconds(RESEND_SECONDS),
    });

    // Auto-submit when 6 digits are entered.
    useEffect(() => {
        if (valid && !verify.isPending) verify.mutate(code);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [code]);

    const errorText = verify.error
        ? tr(errorI18nKey(isApiError(verify.error) ? verify.error.code : "UNKNOWN"), {
              defaultValue: tr("errors.UNKNOWN"),
          })
        : null;

    return (
        <Screen padded edges={["top", "left", "right", "bottom"]}>
            <View style={[styles.flex, { paddingBottom: keyboardPad }]}>
                <Header onBack={() => navigation.goBack()} />

                <View style={styles.body}>
                    <AppText variant="h1">{tr("auth.otpTitle")}</AppText>
                    <AppText variant="body" muted style={styles.subtitle}>
                        {tr("auth.otpSubtitle", { phone: prettyPhone(phone) })}
                    </AppText>
                    <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
                        <AppText variant="label" color="accentDk" style={styles.change}>
                            {tr("auth.otpChangeNumber")}
                        </AppText>
                    </Pressable>

                    <Pressable style={styles.cells} onPress={() => inputRef.current?.focus()}>
                        {Array.from({ length: OTP_LENGTH }).map((_, i) => {
                            const active = i === code.length;
                            const filled = i < code.length;
                            return (
                                <View
                                    key={i}
                                    style={[
                                        styles.cell,
                                        {
                                            borderColor: verify.error
                                                ? t.colors.error
                                                : active || filled
                                                  ? t.colors.accentDk
                                                  : t.colors.border,
                                            backgroundColor: t.colors.surface,
                                        },
                                    ]}
                                >
                                    <AppText variant="h1">{code[i] ?? ""}</AppText>
                                </View>
                            );
                        })}
                        <TextInput
                            ref={inputRef}
                            value={code}
                            onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, OTP_LENGTH))}
                            style={styles.hiddenInput}
                            keyboardType="number-pad"
                            maxLength={OTP_LENGTH}
                            autoFocus
                            caretHidden
                            textContentType="oneTimeCode"
                            autoComplete="sms-otp"
                            importantForAutofill="yes"
                        />
                    </Pressable>

                    {errorText ? (
                        <InlineBanner tone="warning" text={errorText} style={styles.error} />
                    ) : null}

                    <View style={styles.resendRow}>
                        {seconds > 0 ? (
                            <AppText variant="caption" muted>
                                {tr("auth.otpResendIn", { seconds })}
                            </AppText>
                        ) : (
                            <Pressable onPress={() => resend.mutate()} disabled={resend.isPending}>
                                <AppText variant="label" color="accentDk">
                                    {tr("auth.otpResend")}
                                </AppText>
                            </Pressable>
                        )}
                    </View>

                    <View style={styles.spacer} />

                    <Button
                        title={tr("auth.otpCta")}
                        onPress={() => valid && verify.mutate(code)}
                        loading={verify.isPending}
                        disabled={!valid}
                    />
                </View>
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    body: { flex: 1, paddingTop: 8 },
    subtitle: { marginTop: 8 },
    change: { marginTop: 6, marginBottom: 8 },
    cells: { flexDirection: "row", justifyContent: "space-between", marginTop: 28 },
    cell: {
        width: 48,
        height: 58,
        borderRadius: 12,
        borderWidth: 1.5,
        alignItems: "center",
        justifyContent: "center",
    },
    hiddenInput: {
        position: "absolute",
        width: "100%",
        height: "100%",
        opacity: 0,
    },
    error: { marginTop: 20 },
    resendRow: { marginTop: 20, alignItems: "center" },
    spacer: { flex: 1, minHeight: 24 },
});
