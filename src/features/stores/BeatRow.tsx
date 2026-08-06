import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Store, CheckCircle2, Clock } from "lucide-react-native";

import { useTheme } from "@/theme";
import { AppText, Card, IconCircle, Pill } from "@/ui";
import { prettyPhone } from "@/utils/format";
import type { BeatStoreItem } from "@/api";
import { CallButton } from "./CallButton";
import { DirectionsButton } from "./DirectionsButton";

/** A store on today's beat: name, phone, last-visit, call + a check-in / visited state. */
export function BeatRow({
    item,
    onCheckIn,
    onPress,
}: {
    item: BeatStoreItem;
    onCheckIn: () => void;
    onPress?: () => void;
}) {
    const t = useTheme();
    const { t: tr } = useTranslation();

    const days = item.lastVisitedAt
        ? Math.max(0, Math.floor((Date.now() - new Date(item.lastVisitedAt).getTime()) / 86400000))
        : null;
    const lastVisit =
        days === null ? tr("beat.neverVisited") : days === 0 ? tr("beat.visitedToday") : tr("beat.lastVisit", { days });

    return (
        <Card onPress={onPress} style={styles.card}>
            {/* Identity: who + how to reach them */}
            <View style={styles.top}>
                <IconCircle size={42} color={item.visited ? t.colors.success : t.colors.tertiary}>
                    {item.visited ? (
                        <CheckCircle2 size={20} color={t.colors.white} />
                    ) : (
                        <Store size={20} color={t.colors.primary} />
                    )}
                </IconCircle>
                <View style={styles.body}>
                    <AppText variant="title" numberOfLines={1}>
                        {item.shopName}
                    </AppText>
                    {item.phone ? (
                        <AppText variant="caption" muted numberOfLines={1}>
                            {prettyPhone(item.phone)}
                        </AppText>
                    ) : null}
                </View>
                <View style={styles.actions}>
                    {item.gps ? (
                        <DirectionsButton location={item.gps} label={item.shopName} size={40} />
                    ) : null}
                    {item.phone ? <CallButton phone={item.phone} size={40} /> : null}
                </View>
            </View>

            {/* Status + primary action, separated for breathing room */}
            <View style={[styles.footer, { borderTopColor: t.colors.border }]}>
                <View style={styles.meta}>
                    <Clock size={13} color={t.colors.ink400} />
                    <AppText variant="caption" muted numberOfLines={1} style={styles.metaText}>
                        {lastVisit}
                    </AppText>
                    {item.reason === "planned" ? (
                        <Pill tone="info" size="sm" label={tr("beat.plannedChip")} />
                    ) : null}
                </View>
                {item.visited ? (
                    <Pill
                        tone="success"
                        size="sm"
                        label={tr("beat.visitedChip")}
                        icon={<CheckCircle2 size={12} color="#166534" />}
                    />
                ) : (
                    <Pressable
                        onPress={onCheckIn}
                        hitSlop={6}
                        style={({ pressed }) => [
                            styles.checkBtn,
                            { backgroundColor: t.colors.primary, opacity: pressed ? 0.85 : 1 },
                        ]}
                    >
                        <AppText variant="label" onDark>
                            {tr("beat.checkIn")}
                        </AppText>
                    </Pressable>
                )}
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    card: { marginBottom: 12 },
    top: { flexDirection: "row", alignItems: "center" },
    actions: { flexDirection: "row", alignItems: "center", gap: 8 },
    body: { flex: 1, marginLeft: 12, marginRight: 8 },
    footer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    meta: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1, marginRight: 12 },
    metaText: { flexShrink: 1 },
    checkBtn: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10 },
});
