import React, { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import {
    Camera,
    Image as ImageIcon,
    MapPin,
    RefreshCw,
    Smartphone,
    Store,
} from "lucide-react-native";

import { detailsFormSchema, type DetailsForm } from "@/api/schemas";
import { useTheme } from "@/theme";
import { AppText, Button, Field, Header, InlineBanner, Screen } from "@/ui";
import { captureGps, pickStorefrontPhoto, recoverPendingPhoto } from "@/utils/capture";
import { useAddKirana } from "./AddKiranaContext";
import { Stepper } from "./Stepper";
import type { AddKiranaScreenProps } from "@/navigation/types";

export function DetailsScreen({ navigation }: AddKiranaScreenProps<"Details">) {
    const t = useTheme();
    const { t: tr } = useTranslation();
    const { draft, update, hydrated, restored } = useAddKirana();
    const [photoNotice, setPhotoNotice] = useState<"recovered" | "failed" | null>(null);

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<DetailsForm>({
        resolver: zodResolver(detailsFormSchema),
        defaultValues: {
            shopName: draft.shopName,
            ownerName: draft.ownerName,
            phoneDigits: draft.phoneDigits,
        },
        mode: "onTouched",
    });

    // Auto-capture GPS once the draft has settled, and again any time the status
    // returns to "idle" (e.g. after a restored draft drops its stale fix).
    useEffect(() => {
        if (!hydrated) return;
        if (draft.gpsStatus === "idle") void runGps();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hydrated, draft.gpsStatus]);

    // Android can destroy this activity while the system camera is in front —
    // on a 2–3 GB handset that is routine, and the agent experiences it as the
    // app closing mid-capture. When we come back, claim the shot the OS held
    // for us instead of making them photograph the storefront twice.
    useEffect(() => {
        if (!hydrated) return;
        let cancelled = false;
        void (async () => {
            const photo = await recoverPendingPhoto();
            if (cancelled || !photo) return;
            update({ photo });
            setPhotoNotice("recovered");
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hydrated]);

    const runGps = async () => {
        update({ gpsStatus: "capturing" });
        const res = await captureGps();
        if (res.status === "granted") update({ gps: res.gps, gpsStatus: "granted" });
        else update({ gps: null, gpsStatus: res.status });
    };

    const onPickPhoto = async (source: "camera" | "gallery") => {
        setPhotoNotice(null);
        const photo = await pickStorefrontPhoto(source);
        if (photo) update({ photo });
        else setPhotoNotice("failed");
    };

    const onNext = handleSubmit((values) => {
        update({
            shopName: values.shopName,
            ownerName: values.ownerName ?? "",
            phoneDigits: values.phoneDigits,
        });
        navigation.navigate("Kyc");
    });

    const dismiss = () => navigation.getParent()?.goBack();

    return (
        <Screen scroll padded={false} edges={["top", "left", "right"]}>
            <View style={styles.headerWrap}>
                <Header
                    title={tr("onboarding.title")}
                    backVariant="close"
                    onBack={dismiss}
                />
                <Stepper current={1} />
            </View>

            <View style={styles.body}>
                <AppText variant="h2">{tr("onboarding.detailsTitle")}</AppText>
                {restored ? (
                    <InlineBanner
                        tone="info"
                        text={tr("onboarding.draftRestored")}
                        style={styles.notice}
                    />
                ) : null}
                <AppText variant="body" muted style={styles.subtitle}>
                    {tr("onboarding.detailsSubtitle")}
                </AppText>

                <Controller
                    control={control}
                    name="shopName"
                    render={({ field: { value, onChange, onBlur } }) => (
                        <Field
                            label={tr("onboarding.shopName")}
                            leftIcon={<Store size={20} color={t.colors.ink500} />}
                            placeholder={tr("onboarding.shopNamePlaceholder")}
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            error={errors.shopName ? tr(errors.shopName.message ?? "") : undefined}
                            containerStyle={styles.field}
                            autoCapitalize="words"
                        />
                    )}
                />

                <Controller
                    control={control}
                    name="ownerName"
                    render={({ field: { value, onChange, onBlur } }) => (
                        <Field
                            label={tr("onboarding.ownerName")}
                            optional
                            placeholder={tr("onboarding.ownerNamePlaceholder")}
                            value={value ?? ""}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            error={errors.ownerName ? tr(errors.ownerName.message ?? "") : undefined}
                            containerStyle={styles.field}
                            autoCapitalize="words"
                        />
                    )}
                />

                <Controller
                    control={control}
                    name="phoneDigits"
                    render={({ field: { value, onChange, onBlur } }) => (
                        <Field
                            label={tr("onboarding.phone")}
                            prefix="+91"
                            leftIcon={<Smartphone size={20} color={t.colors.ink500} />}
                            placeholder={tr("onboarding.phonePlaceholder")}
                            keyboardType="number-pad"
                            value={value}
                            onChangeText={(v) => onChange(v.replace(/\D/g, "").slice(0, 10))}
                            onBlur={onBlur}
                            maxLength={10}
                            error={errors.phoneDigits ? tr(errors.phoneDigits.message ?? "") : undefined}
                            containerStyle={styles.field}
                        />
                    )}
                />

                {/* Storefront photo */}
                <AppText variant="label" color="ink700" style={styles.blockLabel}>
                    {tr("onboarding.photo")}
                </AppText>
                {photoNotice ? (
                    <InlineBanner
                        tone={photoNotice === "recovered" ? "success" : "warning"}
                        text={tr(
                            photoNotice === "recovered"
                                ? "onboarding.photoRecovered"
                                : "onboarding.photoFailed",
                        )}
                        style={styles.notice}
                    />
                ) : null}
                {draft.photo ? (
                    <View style={styles.photoWrap}>
                        <Image source={{ uri: draft.photo.uri }} style={styles.photo} />
                        <Pressable style={styles.retake} onPress={() => onPickPhoto("camera")}>
                            <RefreshCw size={16} color={t.colors.white} />
                            <AppText variant="label" onDark style={styles.retakeText}>
                                {tr("onboarding.photoRetake")}
                            </AppText>
                        </Pressable>
                    </View>
                ) : (
                    <View style={styles.photoButtons}>
                        <Button
                            title={tr("onboarding.photoCamera")}
                            variant="ghost"
                            size="md"
                            leftIcon={<Camera size={18} color={t.colors.primary} />}
                            onPress={() => onPickPhoto("camera")}
                            style={styles.flex1}
                        />
                        <Button
                            title={tr("onboarding.photoGallery")}
                            variant="ghost"
                            size="md"
                            leftIcon={<ImageIcon size={18} color={t.colors.primary} />}
                            onPress={() => onPickPhoto("gallery")}
                            style={styles.flex1}
                        />
                    </View>
                )}

                {/* GPS */}
                <AppText variant="label" color="ink700" style={styles.blockLabel}>
                    {tr("onboarding.location")}
                </AppText>
                {draft.gpsStatus === "granted" && draft.gps ? (
                    <InlineBanner
                        tone="success"
                        icon={<MapPin size={16} color="#166534" />}
                        text={tr("onboarding.locationCaptured", {
                            accuracy: draft.gps.accuracyM ?? "—",
                        })}
                    />
                ) : draft.gpsStatus === "capturing" ? (
                    <InlineBanner tone="info" text={tr("onboarding.locationCapturing")} />
                ) : (
                    <View>
                        <InlineBanner tone="warning" text={tr("onboarding.locationDenied")} />
                        <Button
                            title={tr("onboarding.locationRetry")}
                            variant="ghost"
                            size="md"
                            leftIcon={<MapPin size={18} color={t.colors.primary} />}
                            onPress={runGps}
                            style={styles.retryGps}
                        />
                    </View>
                )}

                <Button title={tr("common.next")} onPress={onNext} style={styles.next} />
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
    photoWrap: { borderRadius: 16, overflow: "hidden", marginBottom: 20 },
    photo: { width: "100%", height: 180, backgroundColor: "#F3F4F6" },
    retake: {
        position: "absolute",
        right: 12,
        bottom: 12,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(17,24,39,0.7)",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
    },
    retakeText: { marginLeft: 6 },
    photoButtons: { flexDirection: "row", gap: 12, marginBottom: 20 },
    notice: { marginBottom: 12 },
    flex1: { flex: 1 },
    retryGps: { marginTop: 10 },
    next: { marginTop: 28 },
    bottomPad: { height: 40 },
});
