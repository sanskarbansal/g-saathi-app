import React, { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import {
    AlertCircle,
    Clock,
    CreditCard,
    FileText,
    MapPin,
    Navigation,
    Phone,
    Repeat,
    ShoppingCart,
} from "lucide-react-native";

import { useTheme } from "@/theme";
import {
    AppText,
    Button,
    Card,
    Divider,
    EmptyState,
    Header,
    Screen,
    Skeleton,
} from "@/ui";
import { prettyPhone } from "@/utils/format";
import { openDirections } from "@/utils/maps";
import { useOnboardingDetail } from "@/features/queries";
import { ActivationChecklist, OrderNumberSheet } from "@/features/onboarding";
import { StoreOrdersSection } from "@/features/orders";
import { StageBadge } from "./StageBadge";
import { VisitSheet } from "./VisitSheet";
import { CallButton } from "./CallButton";
import type { RootStackScreenProps } from "@/navigation/types";

export function StoreDetailScreen({ route, navigation }: RootStackScreenProps<"StoreDetail">) {
    const { onboardingId, shopName } = route.params;
    const t = useTheme();
    const { t: tr } = useTranslation();
    const detail = useOnboardingDetail(onboardingId);
    const [refreshing, setRefreshing] = useState(false);
    const [showOrder, setShowOrder] = useState(false);
    const [visitOpen, setVisitOpen] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await detail.refetch();
        setRefreshing(false);
    }, [detail]);

    const data = detail.data;
    const store = data?.store;
    const onboarding = data?.onboarding;

    // The store's saved GPS pin (captured at onboarding), if any.
    const gps =
        onboarding?.gpsLat && onboarding?.gpsLng
            ? { lat: Number(onboarding.gpsLat), lng: Number(onboarding.gpsLng) }
            : null;

    const lastVisitDays = onboarding?.lastVisitedAt
        ? Math.max(0, Math.floor((Date.now() - new Date(onboarding.lastVisitedAt).getTime()) / 86400000))
        : null;
    const lastVisitValue =
        lastVisitDays === null
            ? tr("beat.neverVisited")
            : lastVisitDays === 0
              ? tr("beat.visitedToday")
              : tr("beat.lastVisit", { days: lastVisitDays });

    return (
        <Screen scroll padded={false} refreshing={refreshing} onRefresh={onRefresh}>
            <View style={styles.headerWrap}>
                <Header
                    title={shopName ?? store?.shopName ?? tr("onboarding.title")}
                    onBack={() => navigation.goBack()}
                />
            </View>

            <View style={styles.body}>
                {detail.isLoading && !data ? (
                    <>
                        <Skeleton height={140} radius={16} style={styles.skeleton} />
                        <Skeleton height={90} radius={16} style={styles.skeleton} />
                        <Skeleton height={90} radius={16} style={styles.skeleton} />
                    </>
                ) : detail.isError || !data ? (
                    <EmptyState
                        icon={<AlertCircle size={30} color={t.colors.error} />}
                        tone="error"
                        title={tr("errors.title")}
                        message={tr("errors.NETWORK")}
                        actionLabel={tr("common.retry")}
                        onAction={() => detail.refetch()}
                    />
                ) : (
                    <>
                        <Card style={styles.card}>
                            <View style={styles.storeTop}>
                                <AppText variant="h2" numberOfLines={2} style={styles.flex}>
                                    {store?.shopName ?? shopName ?? "—"}
                                </AppText>
                                {onboarding ? <StageBadge stage={onboarding.stage} size="md" /> : null}
                            </View>

                            {store?.ownerName ? (
                                <AppText variant="body" muted style={styles.owner}>
                                    {store.ownerName}
                                </AppText>
                            ) : null}

                            <Divider style={styles.divider} />

                            {store?.phone ? (
                                <View style={styles.phoneRow}>
                                    <Row icon={<Phone size={16} color={t.colors.ink500} />} value={prettyPhone(store.phone)} />
                                    <CallButton phone={store.phone} size={38} />
                                </View>
                            ) : null}
                            {store?.upiVpa ? (
                                <Row icon={<CreditCard size={16} color={t.colors.ink500} />} value={store.upiVpa} />
                            ) : null}
                            {store?.gstin ? (
                                <Row icon={<FileText size={16} color={t.colors.ink500} />} value={store.gstin} />
                            ) : null}
                            {gps ? (
                                <Row
                                    icon={<MapPin size={16} color={t.colors.ink500} />}
                                    value={`${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}`}
                                />
                            ) : null}
                            <Row icon={<Clock size={16} color={t.colors.ink500} />} value={lastVisitValue} />
                        </Card>

                        {gps ? (
                            <Button
                                title={tr("store.directions")}
                                variant="ghost"
                                leftIcon={<MapPin size={18} color={t.colors.primary} />}
                                onPress={() => void openDirections(gps, store?.shopName ?? shopName)}
                                style={styles.directions}
                            />
                        ) : null}

                        <Button
                            title={tr("visit.logVisit")}
                            variant="dark"
                            leftIcon={<Navigation size={18} color={t.colors.white} />}
                            onPress={() => setVisitOpen(true)}
                            style={styles.checkIn}
                        />

                        {store?.id ? (
                            <>
                                <Button
                                    title={tr("shopOrder.orderForShop")}
                                    variant="primary"
                                    leftIcon={<ShoppingCart size={20} color={t.colors.primary} />}
                                    onPress={() =>
                                        navigation.navigate("OrderCatalog", {
                                            target: { kind: "store", storeId: store.id, onboardingId },
                                            title: store.shopName ?? shopName ?? "",
                                        })
                                    }
                                    style={styles.orderBtn}
                                />
                                <AppText variant="h2" style={styles.sectionTitle}>
                                    {tr("shopOrder.recentOrders")}
                                </AppText>
                                <StoreOrdersSection storeId={store.id} />
                                <View style={styles.sectionGap} />
                            </>
                        ) : null}

                        <AppText variant="h2" style={styles.sectionTitle}>
                            {tr("onboarding.activateTitle")}
                        </AppText>
                        <ActivationChecklist
                            onboardingId={onboardingId}
                            checklist={data.checklist}
                            phone={store?.phone ?? null}
                            shopName={store?.shopName ?? shopName ?? ""}
                        />

                        {onboarding?.firstOrderAt ? (
                            <Button
                                title={tr("order.addButton")}
                                variant="primary"
                                leftIcon={<Repeat size={20} color={t.colors.primary} />}
                                onPress={() => setShowOrder(true)}
                                style={styles.addOrder}
                            />
                        ) : null}

                        <OrderNumberSheet
                            visible={showOrder}
                            onClose={() => setShowOrder(false)}
                            onboardingId={onboardingId}
                            mode="repeat"
                        />

                        <VisitSheet
                            visible={visitOpen}
                            onClose={() => setVisitOpen(false)}
                            store={
                                store?.id
                                    ? {
                                          storeId: store.id,
                                          shopName: store.shopName ?? shopName ?? "",
                                          gps:
                                              onboarding?.gpsLat && onboarding?.gpsLng
                                                  ? { lat: Number(onboarding.gpsLat), lng: Number(onboarding.gpsLng) }
                                                  : null,
                                      }
                                    : null
                            }
                            onDone={() => detail.refetch()}
                        />
                    </>
                )}
                <View style={styles.bottomPad} />
            </View>
        </Screen>
    );
}

function Row({ icon, value }: { icon: React.ReactNode; value: string }) {
    return (
        <View style={styles.row}>
            <View style={styles.rowIcon}>{icon}</View>
            <AppText variant="subtitle" color="ink700">
                {value}
            </AppText>
        </View>
    );
}

const styles = StyleSheet.create({
    headerWrap: { paddingHorizontal: 16 },
    body: { paddingHorizontal: 16, paddingTop: 4 },
    flex: { flex: 1 },
    skeleton: { marginBottom: 12 },
    card: { marginBottom: 20 },
    storeTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    owner: { marginTop: 4 },
    divider: { marginVertical: 14 },
    row: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
    phoneRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    rowIcon: { width: 26 },
    sectionTitle: { marginBottom: 14 },
    addOrder: { marginTop: 20 },
    directions: { marginTop: 4, marginBottom: 8 },
    checkIn: { marginTop: 4, marginBottom: 12 },
    orderBtn: { marginBottom: 24 },
    sectionGap: { height: 16 },
    bottomPad: { height: 32 },
});
