import React from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Store, Zap, IndianRupee, Repeat, type LucideIcon } from "lucide-react-native";

import { useTheme } from "@/theme";
import { AppText, Card, Pill, ProgressBar } from "@/ui";
import { compactINR, formatNumber } from "@/utils/format";
import type { PillarKey, ScorePillar } from "@/api";

const ICONS: Record<PillarKey, LucideIcon> = {
    stores: Store,
    activations: Zap,
    revenue: IndianRupee,
    repeat: Repeat,
};

/** One row of the balanced scorecard: actual-vs-target, weight, and points. */
export function PillarRow({ pillar }: { pillar: ScorePillar }) {
    const t = useTheme();
    const { t: tr } = useTranslation();
    const Icon = ICONS[pillar.key];

    // Narrow the two pillar shapes to a common (actual, target, progress, valueText).
    let actual: number;
    let target: number;
    let valueText: string;
    if (pillar.key === "repeat") {
        actual = pillar.actualPct;
        target = pillar.targetPct;
        valueText = `${Math.round(actual)}% / ${Math.round(target)}%`;
    } else if (pillar.key === "revenue") {
        actual = pillar.actual;
        target = pillar.target;
        valueText = `${compactINR(actual)} / ${compactINR(target)}`;
    } else {
        actual = pillar.actual;
        target = pillar.target;
        valueText = `${formatNumber(actual)} / ${formatNumber(target)}`;
    }
    const progress = target > 0 ? actual / target : 0;

    return (
        <Card style={styles.card}>
            <View style={styles.top}>
                <View style={styles.iconWrap}>
                    <Icon size={18} color={t.colors.primary} />
                </View>
                <View style={styles.flex}>
                    <AppText variant="title">{tr(`pillar.${pillar.key}`)}</AppText>
                    <AppText variant="caption" muted>
                        {tr("score.weightLabel", { weight: pillar.weightPct })}
                    </AppText>
                </View>
                <Pill tone="accent" label={tr("score.points", { points: pillar.points })} />
            </View>

            <View style={styles.valueRow}>
                <AppText variant="caption" muted>
                    {tr("score.actual")} / {tr("score.target")}
                </AppText>
                <AppText variant="bodyStrong">{valueText}</AppText>
            </View>
            <ProgressBar progress={progress} height={8} />

            {pillar.key === "revenue" ? (
                <AppText variant="caption" muted style={styles.note}>
                    {tr("pillar.revenueNote")}
                </AppText>
            ) : null}
        </Card>
    );
}

const styles = StyleSheet.create({
    card: { marginBottom: 12 },
    top: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: "#D9F99D",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    flex: { flex: 1 },
    valueRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    note: { marginTop: 10 },
});
