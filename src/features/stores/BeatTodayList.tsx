import React, { useCallback, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { CheckCircle2 } from "lucide-react-native";

import { useTheme } from "@/theme";
import { AppText, EmptyState, Skeleton } from "@/ui";
import { useBeat } from "@/features/queries";
import type { BeatStoreItem } from "@/api";
import { BeatRow } from "./BeatRow";
import { VisitSheet } from "./VisitSheet";

/** Today's beat — the stores to cover, with a geofenced check-in per store. */
export function BeatTodayList({ onOpenStore }: { onOpenStore: (onboardingId: string, shopName: string) => void }) {
    const t = useTheme();
    const { t: tr } = useTranslation();
    const beat = useBeat();
    const [visitStore, setVisitStore] = useState<BeatStoreItem | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await beat.refetch();
        setRefreshing(false);
    }, [beat]);

    const data = beat.data;

    if (beat.isLoading && !data) {
        return (
            <View style={styles.pad}>
                <Skeleton height={84} radius={16} style={styles.sk} />
                <Skeleton height={84} radius={16} style={styles.sk} />
                <Skeleton height={84} radius={16} style={styles.sk} />
            </View>
        );
    }

    return (
        <>
            <FlatList
                style={styles.list}
                data={data?.stores ?? []}
                keyExtractor={(s) => s.storeId}
                renderItem={({ item }) => (
                    <BeatRow
                        item={item}
                        onCheckIn={() => setVisitStore(item)}
                        onPress={() => onOpenStore(item.onboardingId, item.shopName)}
                    />
                )}
                ListHeaderComponent={
                    data ? (
                        <AppText variant="body" muted style={styles.header}>
                            {tr("beat.todaySubtitle", { pending: data.pending, visited: data.visited })}
                        </AppText>
                    ) : null
                }
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshing={refreshing}
                onRefresh={onRefresh}
                ListEmptyComponent={
                    <EmptyState
                        icon={<CheckCircle2 size={30} color={t.colors.success} />}
                        title={tr("beat.noneToday")}
                        message={tr("beat.noneTodayHint")}
                    />
                }
            />
            <VisitSheet
                visible={visitStore !== null}
                onClose={() => setVisitStore(null)}
                store={
                    visitStore
                        ? { storeId: visitStore.storeId, shopName: visitStore.shopName, gps: visitStore.gps }
                        : null
                }
                onDone={() => void beat.refetch()}
            />
        </>
    );
}

const styles = StyleSheet.create({
    pad: { paddingHorizontal: 16, paddingTop: 8 },
    sk: { marginBottom: 12 },
    header: { marginBottom: 12 },
    list: { flex: 1 },
    listContent: { paddingHorizontal: 16, paddingBottom: 96, flexGrow: 1 },
});
