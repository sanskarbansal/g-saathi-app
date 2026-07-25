import React, { useCallback, useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Search, Store as StoreIcon, WifiOff } from "lucide-react-native";

import { useTheme } from "@/theme";
import {
    AppText,
    EmptyState,
    Field,
    InlineBanner,
    Segmented,
    Skeleton,
    type SegmentOption,
} from "@/ui";
import { useIsOnline } from "@/offline";
import { useBeatStores, type BeatStore } from "@/features/queries";
import { StoreRow } from "./StoreRow";
import { BeatTodayList } from "./BeatTodayList";
import type { AppTabScreenProps } from "@/navigation/types";

type Mode = "today" | "all";
type Filter = "all" | "active" | "notInstalled";

export function BeatScreen({ navigation }: AppTabScreenProps<"Beat">) {
    const t = useTheme();
    const { t: tr } = useTranslation();
    const online = useIsOnline();
    const { stores, isLoading, refetch } = useBeatStores();

    const [mode, setMode] = useState<Mode>("today");
    const [filter, setFilter] = useState<Filter>("all");
    const [query, setQuery] = useState("");
    const [refreshing, setRefreshing] = useState(false);

    const modeOptions: SegmentOption<Mode>[] = [
        { label: tr("beat.modeToday"), value: "today" },
        { label: tr("beat.modeAll"), value: "all" },
    ];
    const filterOptions: SegmentOption<Filter>[] = [
        { label: tr("beat.filterAll"), value: "all" },
        { label: tr("beat.filterActive"), value: "active" },
        { label: tr("beat.filterNotInstalled"), value: "notInstalled" },
    ];

    const syncingCount = stores.filter((s) => s.syncing).length;

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return stores.filter((s) => {
            if (filter === "active" && !s.firstOrder) return false;
            if (filter === "notInstalled" && s.appInstalled) return false;
            if (q) {
                const hay = `${s.shopName} ${s.phone ?? ""}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }, [stores, filter, query]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.resolve(refetch());
        setRefreshing(false);
    }, [refetch]);

    const openDetail = (onboardingId: string, shopName: string) =>
        navigation.navigate("StoreDetail", { onboardingId, shopName });

    const openBeatStore = (s: BeatStore) => {
        if (!s.onboardingId) return;
        openDetail(s.onboardingId, s.shopName);
    };

    const topBar = (
        <View style={styles.topBar}>
            <AppText variant="h1">{tr("beat.title")}</AppText>
            <Segmented options={modeOptions} value={mode} onChange={setMode} style={styles.modeSeg} />
        </View>
    );

    // ── Today's beat ──
    if (mode === "today") {
        return (
            <SafeAreaView edges={["top", "left", "right"]} style={styles.fill}>
                {topBar}
                <BeatTodayList onOpenStore={openDetail} />
            </SafeAreaView>
        );
    }

    // ── All stores (full portfolio + search + filters) ──
    const allHeader = (
        <View style={styles.header}>
            <AppText variant="body" muted style={styles.count}>
                {tr("beat.count", { count: stores.length })}
                {syncingCount > 0 ? ` · ${tr("beat.syncingCount", { count: syncingCount })}` : ""}
            </AppText>
            {!online ? (
                <InlineBanner
                    tone="offline"
                    text={tr("offline.banner")}
                    icon={<WifiOff size={16} color={t.colors.white} />}
                    style={styles.offline}
                />
            ) : null}
            <Field
                leftIcon={<Search size={18} color={t.colors.ink400} />}
                placeholder={tr("beat.searchPlaceholder")}
                value={query}
                onChangeText={setQuery}
                autoCapitalize="none"
                containerStyle={styles.search}
            />
            <Segmented options={filterOptions} value={filter} onChange={setFilter} style={styles.filters} />
        </View>
    );

    if (isLoading && stores.length === 0) {
        return (
            <SafeAreaView edges={["top", "left", "right"]} style={styles.fill}>
                {topBar}
                <View style={styles.pad}>
                    {allHeader}
                    <Skeleton height={84} radius={16} style={styles.skeleton} />
                    <Skeleton height={84} radius={16} style={styles.skeleton} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView edges={["top", "left", "right"]} style={styles.fill}>
            {topBar}
            <FlatList
                style={styles.list}
                data={filtered}
                keyExtractor={(item) => item.key}
                renderItem={({ item }) => <StoreRow store={item} onPress={() => openBeatStore(item)} />}
                ListHeaderComponent={allHeader}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshing={refreshing}
                onRefresh={onRefresh}
                ListEmptyComponent={
                    stores.length === 0 ? (
                        <EmptyState
                            icon={<StoreIcon size={30} color={t.colors.primary} />}
                            title={tr("beat.empty")}
                            message={tr("beat.emptyHint")}
                            actionLabel={tr("tabs.addKirana")}
                            onAction={() => navigation.navigate("AddKirana")}
                        />
                    ) : (
                        <View style={styles.emptyFiltered}>
                            <AppText variant="body" muted align="center">
                                {tr("beat.emptyFiltered")}
                            </AppText>
                        </View>
                    )
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    fill: { flex: 1, backgroundColor: "#F9FAFB" },
    topBar: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
    modeSeg: { marginTop: 12 },
    header: { paddingBottom: 4 },
    count: { marginBottom: 12 },
    offline: { marginBottom: 12 },
    search: { marginBottom: 12 },
    filters: { marginBottom: 16 },
    list: { flex: 1 },
    listContent: { paddingHorizontal: 16, paddingBottom: 96 },
    pad: { paddingHorizontal: 16, paddingTop: 8 },
    skeleton: { marginBottom: 12 },
    emptyFiltered: { paddingVertical: 40 },
});
