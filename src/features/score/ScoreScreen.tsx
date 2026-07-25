import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, AlertCircle } from "lucide-react-native";

import { useTheme } from "@/theme";
import {
    AppText,
    Button,
    EmptyState,
    HeroHeader,
    Ring,
    Screen,
    Skeleton,
} from "@/ui";
import { formatNumber } from "@/utils/format";
import { currentPeriod, isFuturePeriod, monthLabel, shiftPeriod } from "@/utils/date";
import { useScore } from "@/features/queries";
import { PillarRow } from "./PillarRow";
import i18n from "@/i18n";
import type { AppTabScreenProps } from "@/navigation/types";

export function ScoreScreen(_props: AppTabScreenProps<"Score">) {
    const t = useTheme();
    const { t: tr } = useTranslation();
    const [period, setPeriod] = useState<string>(currentPeriod());
    const [refreshing, setRefreshing] = useState(false);
    const score = useScore(period);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await score.refetch();
        setRefreshing(false);
    }, [score]);

    const data = score.data;
    const saathiScore = data?.saathiScore ?? 0;
    const scoreMax = data?.scoreMax ?? 1000;
    const nextDisabled = isFuturePeriod(shiftPeriod(period, 1));

    return (
        <Screen scroll padded={false} refreshing={refreshing} onRefresh={onRefresh}>
            <HeroHeader>
                <AppText variant="subtitle" onDark muted>
                    {tr("score.title")}
                </AppText>

                {/* Month switcher */}
                <View style={styles.monthRow}>
                    <Pressable
                        onPress={() => setPeriod(shiftPeriod(period, -1))}
                        hitSlop={10}
                        style={styles.monthBtn}
                    >
                        <ChevronLeft size={22} color={t.colors.white} />
                    </Pressable>
                    <AppText variant="title" onDark>
                        {monthLabel(period, i18n.language)}
                    </AppText>
                    <Pressable
                        onPress={() => !nextDisabled && setPeriod(shiftPeriod(period, 1))}
                        hitSlop={10}
                        disabled={nextDisabled}
                        style={[styles.monthBtn, nextDisabled && styles.disabled]}
                    >
                        <ChevronRight size={22} color={t.colors.white} />
                    </Pressable>
                </View>

                <View style={styles.ringWrap}>
                    <Ring
                        progress={scoreMax ? saathiScore / scoreMax : 0}
                        size={190}
                        strokeWidth={16}
                        gradient={[t.colors.accentLt, t.colors.accent]}
                        trackColor={t.colors.onDarkFaint}
                    >
                        {score.isLoading && !data ? (
                            <Skeleton width={90} height={40} radius={10} />
                        ) : (
                            <View style={styles.ringCenter}>
                                <AppText variant="display" onDark>
                                    {formatNumber(saathiScore)}
                                </AppText>
                                <AppText variant="label" onDark muted>
                                    {tr("score.outOf", { max: scoreMax })}
                                </AppText>
                            </View>
                        )}
                    </Ring>
                </View>
            </HeroHeader>

            <View style={styles.body}>
                <AppText variant="h2" style={styles.sectionTitle}>
                    {tr("score.pillarsTitle")}
                </AppText>

                {score.isLoading && !data ? (
                    <>
                        <Skeleton height={110} radius={16} style={styles.skeleton} />
                        <Skeleton height={110} radius={16} style={styles.skeleton} />
                        <Skeleton height={110} radius={16} style={styles.skeleton} />
                        <Skeleton height={110} radius={16} style={styles.skeleton} />
                    </>
                ) : score.isError || !data ? (
                    <EmptyState
                        icon={<AlertCircle size={30} color={t.colors.error} />}
                        tone="error"
                        title={tr("errors.title")}
                        message={tr("errors.NETWORK")}
                        actionLabel={tr("common.retry")}
                        onAction={() => score.refetch()}
                    />
                ) : (
                    data.pillars.map((p) => <PillarRow key={p.key} pillar={p} />)
                )}
                <View style={styles.bottomPad} />
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    monthRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 12,
    },
    monthBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.14)",
    },
    disabled: { opacity: 0.4 },
    ringWrap: { alignItems: "center", marginTop: 20, marginBottom: 4 },
    ringCenter: { alignItems: "center" },
    body: { padding: 16, marginTop: -8 },
    sectionTitle: { marginBottom: 14 },
    skeleton: { marginBottom: 12 },
    bottomPad: { height: 24 },
});
