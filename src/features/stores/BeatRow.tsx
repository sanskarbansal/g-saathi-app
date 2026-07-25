import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Store, CheckCircle2, Clock } from "lucide-react-native";

import { useTheme } from "@/theme";
import { AppText, Card, IconCircle, Pill } from "@/ui";
import { prettyPhone } from "@/utils/format";
import type { BeatStoreItem } from "@/api";
import { CallButton } from "./CallButton";

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
            <View style={styles.row}>
                <IconCircle color={item.visited ? t.colors.success : t.colors.tertiary}>
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
                    <View style={styles.metaRow}>
                        <Clock size={12} color={t.colors.ink400} />
                        <AppText variant="caption" muted style={styles.meta}>
                            {lastVisit}
                        </AppText>
                        {item.reason === "planned" ? (
                            <Pill tone="info" size="sm" label={tr("beat.plannedChip")} />
                        ) : null}
                    </View>
                </View>
                <View style={styles.actions}>
                    {item.phone ? <CallButton phone={item.phone} size={38} /> : null}
                    {item.visited ? (
                        <Pill tone="success" size="sm" label={tr("beat.visitedChip")} />
                    ) : (
                        <Pressable onPress={onCheckIn} style={[styles.checkBtn, { backgroundColor: t.colors.primary }]}>
                            <AppText variant="caption" onDark>
                                {tr("beat.checkIn")}
                            </AppText>
                        </Pressable>
                    )}
                </View>
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    card: { marginBottom: 12 },
    row: { flexDirection: "row", alignItems: "center" },
    body: { flex: 1, marginLeft: 12 },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
    meta: { marginRight: 2 },
    actions: { flexDirection: "row", alignItems: "center", gap: 8, marginLeft: 8 },
    checkBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10 },
});
