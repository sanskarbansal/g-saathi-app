import React from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Store, CheckCircle2, RefreshCw, AlertTriangle, Clock } from "lucide-react-native";

import { useTheme } from "@/theme";
import { AppText, Card, IconCircle, Pill } from "@/ui";
import { prettyPhone, initials } from "@/utils/format";
import type { BeatStore } from "@/features/queries";
import { StageBadge } from "./StageBadge";
import { CallButton } from "./CallButton";
import { DirectionsButton } from "./DirectionsButton";

interface StoreRowProps {
    store: BeatStore;
    onPress?: () => void;
}

/** A kirana card for the beat / home lists: name, phone, last-visit, call + health chips. */
export function StoreRow({ store, onPress }: StoreRowProps) {
    const t = useTheme();
    const { t: tr } = useTranslation();
    const real = !store.syncing && !store.errored;

    const days = store.lastVisitedAt
        ? Math.max(0, Math.floor((Date.now() - new Date(store.lastVisitedAt).getTime()) / 86400000))
        : null;
    const lastVisit =
        days === null ? tr("beat.neverVisited") : days === 0 ? tr("beat.visitedToday") : tr("beat.lastVisit", { days });

    return (
        <Card onPress={real ? onPress : undefined} style={styles.card}>
            <View style={styles.top}>
                <IconCircle color={store.syncing ? t.colors.subtle : t.colors.tertiary}>
                    {store.errored ? (
                        <AlertTriangle size={20} color={t.colors.error} />
                    ) : store.syncing ? (
                        <RefreshCw size={20} color={t.colors.ink500} />
                    ) : (
                        <Store size={20} color={t.colors.primary} />
                    )}
                </IconCircle>
                <View style={styles.body}>
                    <AppText variant="title" numberOfLines={1}>
                        {store.shopName || initials(store.shopName)}
                    </AppText>
                    {store.phone ? (
                        <AppText variant="caption" muted numberOfLines={1}>
                            {prettyPhone(store.phone)}
                        </AppText>
                    ) : null}
                    {real ? (
                        <View style={styles.metaRow}>
                            <Clock size={12} color={t.colors.ink400} />
                            <AppText variant="caption" muted>
                                {lastVisit}
                            </AppText>
                        </View>
                    ) : null}
                </View>
                {real ? (
                    <View style={styles.actions}>
                        {store.gps ? (
                            <DirectionsButton location={store.gps} label={store.shopName} />
                        ) : null}
                        {store.phone ? <CallButton phone={store.phone} /> : null}
                    </View>
                ) : null}
            </View>

            <View style={styles.chips}>
                {store.errored ? (
                    <Pill tone="error" size="sm" label={tr("offline.syncFailed")} dot />
                ) : store.syncing ? (
                    <Pill tone="info" size="sm" label={tr("offline.willSync")} dot />
                ) : (
                    <>
                        <StageBadge stage={store.stage} />
                        {store.appInstalled ? (
                            <Pill
                                tone="success"
                                size="sm"
                                label={tr("health.installed")}
                                icon={<CheckCircle2 size={12} color="#166534" />}
                            />
                        ) : null}
                        {store.firstOrder ? (
                            <Pill tone="gold" size="sm" label={tr("health.firstOrder")} />
                        ) : null}
                    </>
                )}
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    card: { marginBottom: 12 },
    top: { flexDirection: "row", alignItems: "center" },
    actions: { flexDirection: "row", alignItems: "center", gap: 8 },
    body: { flex: 1, marginLeft: 12 },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
});
