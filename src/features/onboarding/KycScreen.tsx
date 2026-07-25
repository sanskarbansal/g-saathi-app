import React, { useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CreditCard, FileText, Warehouse, Check } from "lucide-react-native";

import {
    isApiError,
    qk,
    type CreateOnboardingInput,
    type HomeData,
} from "@/api";
import {
    kycFormSchema,
    toFullPhone,
    type KycForm,
    type LanguageValue,
} from "@/api/schemas";
import { useSession } from "@/auth";
import { useTheme } from "@/theme";
import {
    AppText,
    Button,
    Card,
    Field,
    Header,
    InlineBanner,
    Screen,
    Segmented,
} from "@/ui";
import { HUBS, findHub } from "@/config/hubs";
import { useAddKirana } from "./AddKiranaContext";
import { Stepper } from "./Stepper";
import { useCreateOnboarding } from "./useCreateOnboarding";
import type { AddKiranaScreenProps } from "@/navigation/types";

const LANGUAGE_OPTIONS: { label: string; value: LanguageValue }[] = [
    { label: "हिन्दी", value: "hi" },
    { label: "English", value: "en" },
    { label: "हरियाणवी", value: "hry" },
];

export function KycScreen({ navigation }: AddKiranaScreenProps<"Kyc">) {
    const t = useTheme();
    const { t: tr } = useTranslation();
    const { draft, update } = useAddKirana();
    const { refreshAgent } = useSession();
    const qc = useQueryClient();
    const create = useCreateOnboarding();

    const [hubKey, setHubKey] = useState<string | undefined>(draft.hubKey);
    // Baseline points to compute the earned-points delta after the create.
    const baseline = useRef<number | null>(
        qc.getQueryData<HomeData>(qk.home)?.agent.lifetimePoints ?? null,
    );

    const {
        control,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<KycForm>({
        resolver: zodResolver(kycFormSchema),
        defaultValues: {
            upiVpa: draft.upiVpa,
            gstin: draft.gstin,
            language: draft.language,
        },
        mode: "onTouched",
    });

    const language = watch("language");

    const onCreate = handleSubmit((values) => {
        update({
            upiVpa: values.upiVpa ?? "",
            gstin: values.gstin ?? "",
            language: values.language,
            hubKey,
        });

        const input: CreateOnboardingInput = {
            clientId: draft.clientId,
            shopName: draft.shopName,
            phone: toFullPhone(draft.phoneDigits),
            ownerName: draft.ownerName || undefined,
            language: values.language,
            upiVpa: values.upiVpa || undefined,
            gstin: values.gstin || undefined,
            // Stub hubs carry no real id → omit warehouseId (see config/hubs.ts).
            warehouseId: findHub(hubKey)?.warehouseId ?? undefined,
            gps: draft.gps
                ? { lat: draft.gps.lat, lng: draft.gps.lng, accuracyM: draft.gps.accuracyM }
                : undefined,
            // No photo-upload endpoint yet — send the hash only (TODO: upload URL).
            storefrontPhotoHash: draft.photo?.hash,
        };

        create.mutate(
            { input, localPhotoUri: draft.photo?.uri },
            {
                onSuccess: async (outcome) => {
                    if (outcome.queued) {
                        update({
                            result: {
                                queued: true,
                                shopName: draft.shopName,
                                checklist: [
                                    { step: "app_installed", done: false },
                                    { step: "khata_imported", done: false },
                                    { step: "first_order", done: false },
                                ],
                            },
                        });
                        navigation.navigate("Success");
                        return;
                    }

                    const updated = await refreshAgent();
                    const earned =
                        baseline.current != null && updated
                            ? Math.max(0, updated.lifetimePoints - baseline.current)
                            : undefined;

                    update({
                        result: {
                            queued: false,
                            onboardingId: outcome.result.onboarding.id,
                            checklist: outcome.result.checklist,
                            idempotentReplay: outcome.result.idempotentReplay,
                            shopName: draft.shopName,
                            pointsEarned: earned,
                        },
                    });
                    navigation.navigate("Activation");
                },
            },
        );
    });

    const conflict = isApiError(create.error) && create.error.code === "CONFLICT";
    const errorText = create.error
        ? conflict
            ? tr("errors.CONFLICT")
            : tr("errors.UNKNOWN")
        : null;

    return (
        <Screen scroll padded={false} edges={["top", "left", "right"]}>
            <View style={styles.headerWrap}>
                <Header
                    title={tr("onboarding.title")}
                    onBack={() => navigation.goBack()}
                />
                <Stepper current={2} />
            </View>

            <View style={styles.body}>
                <AppText variant="h2">{tr("onboarding.kycTitle")}</AppText>
                <AppText variant="body" muted style={styles.subtitle}>
                    {tr("onboarding.kycSubtitle")}
                </AppText>

                <Controller
                    control={control}
                    name="upiVpa"
                    render={({ field: { value, onChange, onBlur } }) => (
                        <Field
                            label={tr("onboarding.upi")}
                            optional
                            leftIcon={<CreditCard size={20} color={t.colors.ink500} />}
                            placeholder={tr("onboarding.upiPlaceholder")}
                            autoCapitalize="none"
                            value={value ?? ""}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            error={errors.upiVpa ? tr(errors.upiVpa.message ?? "") : undefined}
                            containerStyle={styles.field}
                        />
                    )}
                />

                <Controller
                    control={control}
                    name="gstin"
                    render={({ field: { value, onChange, onBlur } }) => (
                        <Field
                            label={tr("onboarding.gstin")}
                            optional
                            leftIcon={<FileText size={20} color={t.colors.ink500} />}
                            placeholder={tr("onboarding.gstinPlaceholder")}
                            autoCapitalize="characters"
                            value={value ?? ""}
                            onChangeText={(v) => onChange(v.toUpperCase())}
                            onBlur={onBlur}
                            maxLength={15}
                            error={errors.gstin ? tr(errors.gstin.message ?? "") : undefined}
                            containerStyle={styles.field}
                        />
                    )}
                />

                <AppText variant="label" color="ink700" style={styles.blockLabel}>
                    {tr("onboarding.language")}
                </AppText>
                <Segmented
                    options={LANGUAGE_OPTIONS}
                    value={language}
                    onChange={(v) => setValue("language", v)}
                    style={styles.segmented}
                />

                <AppText variant="label" color="ink700" style={styles.blockLabel}>
                    {tr("onboarding.hub")}
                </AppText>
                <Card padded={false} style={styles.hubCard}>
                    {HUBS.map((hub, i) => {
                        const selected = hub.key === hubKey;
                        return (
                            <Pressable
                                key={hub.key}
                                onPress={() => setHubKey(selected ? undefined : hub.key)}
                                style={[
                                    styles.hubRow,
                                    i < HUBS.length - 1 && styles.hubDivider,
                                ]}
                            >
                                <Warehouse
                                    size={18}
                                    color={selected ? t.colors.accentDk : t.colors.ink400}
                                />
                                <View style={styles.hubBody}>
                                    <AppText variant="subtitle">{hub.name}</AppText>
                                    <AppText variant="caption" muted>
                                        {hub.area}
                                    </AppText>
                                </View>
                                <View
                                    style={[
                                        styles.radio,
                                        {
                                            borderColor: selected ? t.colors.accentDk : t.colors.border,
                                            backgroundColor: selected ? t.colors.accent : "transparent",
                                        },
                                    ]}
                                >
                                    {selected ? <Check size={14} color={t.colors.primary} /> : null}
                                </View>
                            </Pressable>
                        );
                    })}
                </Card>

                {errorText ? (
                    <InlineBanner tone="error" text={errorText} style={styles.error} />
                ) : null}

                <Button
                    title={tr("onboarding.create")}
                    onPress={onCreate}
                    loading={create.isPending}
                    style={styles.create}
                />
                <View style={styles.bottomPad} />
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    headerWrap: { paddingHorizontal: 16, paddingBottom: 8 },
    body: { paddingHorizontal: 16 },
    subtitle: { marginTop: 6, marginBottom: 20 },
    field: { marginBottom: 16 },
    blockLabel: { marginBottom: 10, marginTop: 4 },
    segmented: { marginBottom: 20 },
    hubCard: { marginBottom: 4 },
    hubRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 14,
    },
    hubDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E5E7EB" },
    hubBody: { flex: 1, marginLeft: 12 },
    radio: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        alignItems: "center",
        justifyContent: "center",
    },
    error: { marginTop: 16 },
    create: { marginTop: 24 },
    bottomPad: { height: 40 },
});
