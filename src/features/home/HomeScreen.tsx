import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Plus, TrendingUp, Store, Zap, WifiOff } from "lucide-react-native";

import { useTheme } from "@/theme";
import {
    AppText,
    Button,
    Card,
    Divider,
    HeroHeader,
    InlineBanner,
    Pill,
    ProgressBar,
    Screen,
    Skeleton,
    StatTile,
} from "@/ui";
import { useIsOnline } from "@/offline";
import { formatNumber } from "@/utils/format";
import { useBeatStores, useHome, useOnboardings, useTodayCounts } from "@/features/queries";
import { StoreRow } from "@/features/stores/StoreRow";
import type { AppTabScreenProps } from "@/navigation/types";

export function HomeScreen({ navigation }: AppTabScreenProps<"Home">) {
    const t = useTheme();
    const { t: tr } = useTranslation();
    const online = useIsOnline();

    const home = useHome();
    const onboardings = useOnboardings({ limit: 100 });
    const counts = useTodayCounts(onboardings.data);
    const { stores } = useBeatStores();
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([home.refetch(), onboardings.refetch()]);
        setRefreshing(false);
    }, [home, onboardings]);

    const score = home.data?.score.saathiScore ?? 0;
    const scoreMax = home.data?.score.scoreMax ?? 1000;
    const level = home.data?.agent.currentLevel ?? 1;
    const points = home.data?.agent.lifetimePoints ?? 0;
    const loadingFirst = home.isLoading && !home.data;
    const recent = stores.slice(0, 3);

    return (
        <Screen scroll padded={false} refreshing={refreshing} onRefresh={onRefresh}>
            <HeroHeader>
                <View style={styles.heroTop}>
                    <AppText variant="subtitle" onDark muted>
                        {tr("home.greeting")}
                    </AppText>
                    <Pill tone="gold" label={tr("home.levelChip", { level })} />
                </View>

                {loadingFirst ? (
                    <View style={styles.heroLoading}>
                        <Skeleton width={160} height={52} radius={12} />
                        <Skeleton width={120} height={12} style={{ marginTop: 10 }} />
                    </View>
                ) : (
                    <View style={styles.scoreBlock}>
                        <View style={styles.scoreRow}>
                            <AppText variant="hero" onDark>
                                {formatNumber(score)}
                            </AppText>
                            <AppText variant="title" onDark muted style={styles.scoreMax}>
                                {tr("home.scoreOutOf", { max: scoreMax })}
                            </AppText>
                        </View>
                        <AppText variant="label" onDark muted>
                            {tr("home.saathiScore")} · {tr("home.pointsToday", { points: formatNumber(points) })}
                        </AppText>
                        <ProgressBar
                            progress={scoreMax ? score / scoreMax : 0}
                            onDark
                            height={8}
                            style={styles.heroProgress}
                        />
                    </View>
                )}
            </HeroHeader>

            <View style={styles.body}>
                {!online ? (
                    <InlineBanner
                        tone="offline"
                        text={tr("offline.banner")}
                        icon={<WifiOff size={16} color={t.colors.white} />}
                        style={styles.offline}
                    />
                ) : null}

                <Card style={styles.todayCard}>
                    <View style={styles.todayHeader}>
                        <TrendingUp size={18} color={t.colors.accentDk} />
                        <AppText variant="subtitle" style={styles.todayTitle}>
                            {tr("home.todaysTarget")}
                        </AppText>
                    </View>
                    <View style={styles.todayRow}>
                        <StatTile
                            label={tr("home.onboardsToday")}
                            value={counts.onboardsToday}
                            icon={<Store size={18} color={t.colors.primary} />}
                        />
                        <View style={styles.vDivider} />
                        <StatTile
                            label={tr("home.activationsToday")}
                            value={counts.activationsToday}
                            icon={<Zap size={18} color={t.colors.accentDk} />}
                        />
                    </View>
                </Card>

                <Button
                    title={tr("home.startBeat")}
                    onPress={() => navigation.navigate("Beat")}
                    style={styles.cta}
                />
                <Button
                    title={tr("home.addKirana")}
                    variant="ghost"
                    leftIcon={<Plus size={20} color={t.colors.primary} />}
                    onPress={() => navigation.navigate("AddKirana")}
                    style={styles.ctaGhost}
                />

                <View style={styles.sectionHeader}>
                    <AppText variant="h2">{tr("home.recentlyAdded")}</AppText>
                    {stores.length > 0 ? (
                        <Pressable onPress={() => navigation.navigate("Beat")} hitSlop={8}>
                            <Pill tone="neutral" label={tr("common.seeAll")} size="sm" />
                        </Pressable>
                    ) : null}
                </View>

                {loadingFirst ? (
                    <>
                        <Skeleton height={84} radius={16} style={styles.skeletonRow} />
                        <Skeleton height={84} radius={16} style={styles.skeletonRow} />
                    </>
                ) : recent.length === 0 ? (
                    <Card>
                        <AppText variant="title">{tr("home.noneYet")}</AppText>
                        <AppText variant="body" muted style={styles.emptyHint}>
                            {tr("home.noneYetHint")}
                        </AppText>
                    </Card>
                ) : (
                    recent.map((s) => (
                        <StoreRow
                            key={s.key}
                            store={s}
                            onPress={
                                s.onboardingId
                                    ? () =>
                                          navigation.navigate("StoreDetail", {
                                              onboardingId: s.onboardingId as string,
                                              shopName: s.shopName,
                                          })
                                    : undefined
                            }
                        />
                    ))
                )}
                <View style={styles.bottomPad} />
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    heroLoading: { marginTop: 18 },
    scoreBlock: { marginTop: 14 },
    scoreRow: { flexDirection: "row", alignItems: "flex-end" },
    scoreMax: { marginBottom: 10, marginLeft: 8 },
    heroProgress: { marginTop: 14 },
    body: { padding: 16, marginTop: -12 },
    offline: { marginBottom: 12 },
    todayCard: { marginBottom: 16 },
    todayHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
    todayTitle: { marginLeft: 8 },
    todayRow: { flexDirection: "row", alignItems: "center" },
    vDivider: { width: StyleSheet.hairlineWidth, height: 44, backgroundColor: "#E5E7EB", marginHorizontal: 12 },
    cta: { marginBottom: 12 },
    ctaGhost: { marginBottom: 24 },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 14,
    },
    skeletonRow: { marginBottom: 12 },
    emptyHint: { marginTop: 6 },
    bottomPad: { height: 24 },
});
