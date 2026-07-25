import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { PartyPopper, CloudOff, Check } from "lucide-react-native";

import { useTheme } from "@/theme";
import { AppText, Button, Pill, Screen } from "@/ui";
import { useOnboardings } from "@/features/queries";
import { useAddKirana } from "./AddKiranaContext";
import type { AddKiranaScreenProps } from "@/navigation/types";

export function SuccessScreen({ navigation }: AddKiranaScreenProps<"Success">) {
    const t = useTheme();
    const { t: tr } = useTranslation();
    const { draft, reset } = useAddKirana();
    const result = draft.result;
    const onboardings = useOnboardings({ limit: 100 });

    const queued = result?.queued ?? false;
    const storeNumber = onboardings.data?.length ?? undefined;
    const points = result?.pointsEarned;

    useEffect(() => {
        void Haptics.notificationAsync(
            queued
                ? Haptics.NotificationFeedbackType.Warning
                : Haptics.NotificationFeedbackType.Success,
        );
    }, [queued]);

    const onAddAnother = () => {
        reset();
        navigation.reset({ index: 0, routes: [{ name: "Details" }] });
    };

    const onBackToBeat = () => {
        navigation.getParent()?.navigate("Tabs", { screen: "Beat" });
    };

    return (
        <Screen padded={false} backgroundColor={queued ? undefined : t.colors.primary}>
            <LinearGradient
                colors={queued ? [t.colors.bg, t.colors.bg] : t.gradients.hero}
                style={styles.fill}
            >
                <View style={styles.center}>
                    <View
                        style={[
                            styles.iconWrap,
                            { backgroundColor: queued ? t.colors.subtle : t.colors.accent },
                        ]}
                    >
                        {queued ? (
                            <CloudOff size={44} color={t.colors.ink500} />
                        ) : (
                            <PartyPopper size={44} color={t.colors.primary} />
                        )}
                    </View>

                    <AppText variant="h1" onDark={!queued} align="center" style={styles.title}>
                        {queued ? tr("onboarding.successOfflineTitle") : tr("onboarding.successTitle")}
                    </AppText>

                    {!queued && storeNumber ? (
                        <Pill tone="gold" label={tr("onboarding.successStore", { count: storeNumber })} />
                    ) : null}

                    <AppText
                        variant="body"
                        onDark={!queued}
                        muted
                        align="center"
                        style={styles.subtitle}
                    >
                        {queued
                            ? tr("onboarding.successOfflineSubtitle", { shop: draft.shopName })
                            : tr("onboarding.successSubtitle", { shop: draft.shopName })}
                    </AppText>

                    {!queued && points && points > 0 ? (
                        <View style={styles.pointsRow}>
                            <Check size={18} color={t.colors.goldLt} />
                            <AppText variant="title" style={{ color: t.colors.goldLt }}>
                                {tr("onboarding.successPoints", { points })}
                            </AppText>
                        </View>
                    ) : null}
                </View>

                <View style={styles.actions}>
                    <Button
                        title={tr("onboarding.addAnother")}
                        variant={queued ? "dark" : "primary"}
                        onPress={onAddAnother}
                    />
                    <Button
                        title={tr("onboarding.backToBeat")}
                        variant="ghost"
                        onPress={onBackToBeat}
                        style={styles.secondary}
                    />
                </View>
            </LinearGradient>
        </Screen>
    );
}

const styles = StyleSheet.create({
    fill: { flex: 1, paddingHorizontal: 24, paddingBottom: 32 },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    iconWrap: {
        width: 96,
        height: 96,
        borderRadius: 48,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 24,
    },
    title: { marginBottom: 12 },
    subtitle: { marginTop: 12, maxWidth: 300 },
    pointsRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 20 },
    actions: { gap: 12 },
    secondary: {},
});
