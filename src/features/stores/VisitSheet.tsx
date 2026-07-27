import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { MapPin, Navigation, X, CheckCircle2, AlertTriangle } from "lucide-react-native";

import { isApiError, type VisitOutcome } from "@/api";
import { useTheme } from "@/theme";
import { AppText, Button, Field, useKeyboardHeight } from "@/ui";
import { captureGps, generateClientId, type CapturedGps } from "@/utils/capture";
import { haversineMeters } from "@/utils/geo";
import { useLogVisit } from "./useLogVisit";

/** Must match the backend VISIT_GEOFENCE_RADIUS_M. */
const RADIUS_M = 150;

const OUTCOMES: { value: VisitOutcome; key: string }[] = [
    { value: "met_owner", key: "visit.outcome.met_owner" },
    { value: "order_taken", key: "visit.outcome.order_taken" },
    { value: "shop_closed", key: "visit.outcome.shop_closed" },
    { value: "owner_absent", key: "visit.outcome.owner_absent" },
    { value: "not_interested", key: "visit.outcome.not_interested" },
    { value: "other", key: "visit.outcome.other" },
];

type GpsState = "locating" | "ready" | "denied" | "error";

interface Props {
    visible: boolean;
    onClose: () => void;
    store: { storeId: string; shopName: string; gps: { lat: number; lng: number } | null } | null;
    onDone?: () => void;
}

/**
 * Store check-in sheet. Captures the agent's GPS, hard-geofences client-side against
 * the store's known location (the server re-checks and is the source of truth), then
 * logs a visit with an outcome + optional note.
 */
export function VisitSheet({ visible, onClose, store, onDone }: Props) {
    const t = useTheme();
    const { t: tr } = useTranslation();
    const logVisit = useLogVisit();
    const [gpsState, setGpsState] = useState<GpsState>("locating");
    const [myGps, setMyGps] = useState<CapturedGps | null>(null);
    const [outcome, setOutcome] = useState<VisitOutcome | null>(null);
    const [note, setNote] = useState("");
    // Lift the sheet above the keyboard when the note field is focused —
    // KeyboardAvoidingView is unreliable inside a Modal on Android.
    const keyboardHeight = useKeyboardHeight();

    const locate = useCallback(async () => {
        setGpsState("locating");
        const r = await captureGps();
        if (r.status === "granted") {
            setMyGps(r.gps);
            setGpsState("ready");
        } else if (r.status === "denied") {
            setGpsState("denied");
        } else {
            setGpsState("error");
        }
    }, []);

    useEffect(() => {
        if (!visible) return;
        setOutcome(null);
        setNote("");
        logVisit.reset();
        void locate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    const distanceM = useMemo(() => {
        if (!myGps || !store?.gps) return null;
        return haversineMeters({ lat: myGps.lat, lng: myGps.lng }, store.gps);
    }, [myGps, store]);

    const withinRange = store?.gps ? distanceM !== null && distanceM <= RADIUS_M : true;
    const canSubmit = gpsState === "ready" && withinRange && outcome !== null && !logVisit.isPending;

    const close = () => {
        logVisit.reset();
        onClose();
    };

    const submit = () => {
        if (!store || !myGps || !outcome) return;
        logVisit.mutate(
            {
                clientId: generateClientId(),
                storeId: store.storeId,
                outcome,
                note: note.trim() || undefined,
                gps: myGps,
            },
            {
                onSuccess: () => {
                    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    onDone?.();
                    close();
                },
            },
        );
    };

    const errorText = logVisit.error
        ? isApiError(logVisit.error)
            ? logVisit.error.message
            : tr("errors.UNKNOWN")
        : null;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
            <View style={[styles.backdrop, { paddingBottom: keyboardHeight }]}>
                <Pressable style={styles.backdropTouch} onPress={close} />
                <View style={[styles.sheet, { backgroundColor: t.colors.surface }]}>
                    <View style={styles.handle} />
                    <View style={styles.header}>
                        <AppText variant="h2">{tr("visit.title")}</AppText>
                        <Pressable onPress={close} hitSlop={10} style={styles.closeBtn}>
                            <X size={20} color={t.colors.ink500} />
                        </Pressable>
                    </View>
                    <AppText variant="caption" muted style={styles.shop}>
                        {store?.shopName}
                    </AppText>

                    <View style={[styles.locBox, { backgroundColor: t.colors.subtle }]}>
                        {gpsState === "locating" ? (
                            <AppText variant="caption" muted>
                                {tr("visit.locating")}
                            </AppText>
                        ) : gpsState === "denied" || gpsState === "error" ? (
                            <View style={styles.locRow}>
                                <AlertTriangle size={16} color={t.colors.error} />
                                <AppText variant="caption" style={styles.locText}>
                                    {tr(gpsState === "denied" ? "visit.denied" : "visit.locError")}
                                </AppText>
                                <Pressable onPress={() => void locate()} hitSlop={8}>
                                    <AppText variant="caption" color="primary">
                                        {tr("visit.retry")}
                                    </AppText>
                                </Pressable>
                            </View>
                        ) : !store?.gps ? (
                            <View style={styles.locRow}>
                                <MapPin size={16} color={t.colors.ink500} />
                                <AppText variant="caption" muted style={styles.locText}>
                                    {tr("visit.noStoreLoc")}
                                </AppText>
                            </View>
                        ) : withinRange ? (
                            <View style={styles.locRow}>
                                <CheckCircle2 size={16} color={t.colors.success} />
                                <AppText variant="caption" style={[styles.locText, { color: t.colors.success }]}>
                                    {tr("visit.within", { m: distanceM })}
                                </AppText>
                            </View>
                        ) : (
                            <View style={styles.locRow}>
                                <Navigation size={16} color={t.colors.error} />
                                <AppText variant="caption" style={[styles.locText, { color: t.colors.error }]}>
                                    {tr("visit.tooFar", { m: distanceM, radius: RADIUS_M })}
                                </AppText>
                            </View>
                        )}
                    </View>

                    <AppText variant="label" color="ink500" style={styles.sectionLabel}>
                        {tr("visit.outcomeLabel")}
                    </AppText>
                    <View style={styles.chips}>
                        {OUTCOMES.map((o) => {
                            const sel = outcome === o.value;
                            return (
                                <Pressable
                                    key={o.value}
                                    onPress={() => setOutcome(o.value)}
                                    style={[
                                        styles.chip,
                                        { backgroundColor: sel ? t.colors.primary : t.colors.subtle },
                                    ]}
                                >
                                    <AppText variant="caption" onDark={sel}>
                                        {tr(o.key)}
                                    </AppText>
                                </Pressable>
                            );
                        })}
                    </View>

                    <Field
                        label={tr("visit.noteLabel")}
                        placeholder={tr("visit.notePlaceholder")}
                        value={note}
                        onChangeText={setNote}
                        containerStyle={styles.note}
                    />

                    {errorText ? (
                        <AppText variant="caption" style={[styles.err, { color: t.colors.error }]}>
                            {errorText}
                        </AppText>
                    ) : null}

                    <Button
                        title={tr("visit.submit")}
                        onPress={submit}
                        loading={logVisit.isPending}
                        disabled={!canSubmit}
                        style={styles.submit}
                    />
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: "rgba(17,24,39,0.45)", justifyContent: "flex-end" },
    backdropTouch: { flex: 1 },
    sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
    handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB", marginBottom: 16 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#F3F4F6" },
    shop: { marginTop: 2, marginBottom: 14 },
    locBox: { borderRadius: 12, padding: 12, marginBottom: 18 },
    locRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    locText: { flex: 1 },
    sectionLabel: { marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 },
    chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
    note: { marginBottom: 8 },
    err: { marginBottom: 10 },
    submit: { marginTop: 8 },
});
