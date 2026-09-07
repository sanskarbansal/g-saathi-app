import React from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Receipt } from "lucide-react-native";

import type { FieldOrder, FieldOrderStatus } from "@/api";
import { useTheme } from "@/theme";
import { AppText, Card, Divider, Pill, Skeleton, type PillTone } from "@/ui";
import { formatINR } from "@/utils/format";
import { useOrders } from "./hooks";

const STATUS_TONE: Record<FieldOrderStatus, PillTone> = {
    pending: "warning",
    confirmed: "info",
    preparing: "info",
    ready: "info",
    picked_up: "info",
    out_for_delivery: "info",
    delivered: "success",
    cancelled: "error",
    returned: "error",
};

function shortDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** Recent orders the agent placed for this shop, shown on the store detail. */
export function StoreOrdersSection({ storeId, limit = 5 }: { storeId: string; limit?: number }) {
    const t = useTheme();
    const { t: tr } = useTranslation();
    const orders = useOrders(storeId, limit);

    if (orders.isLoading && !orders.data) {
        return <Skeleton height={72} radius={16} style={styles.skel} />;
    }
    const list = orders.data ?? [];
    if (list.length === 0) {
        return (
            <Card style={styles.card}>
                <View style={styles.empty}>
                    <Receipt size={20} color={t.colors.ink400} />
                    <AppText variant="body" muted>
                        {tr("shopOrder.noOrdersYet")}
                    </AppText>
                </View>
            </Card>
        );
    }
    return (
        <Card padded={false} style={styles.card}>
            {list.map((o, i) => (
                <View key={o.id}>
                    {i > 0 ? <Divider /> : null}
                    <OrderRow order={o} date={shortDate(o.placedAt)} />
                </View>
            ))}
        </Card>
    );
}

function OrderRow({ order, date }: { order: FieldOrder; date: string }) {
    const { t: tr } = useTranslation();
    const paid = order.paymentStatus === "completed";
    return (
        <View style={styles.row}>
            <View style={styles.flex}>
                <AppText variant="title">#{order.orderNumber}</AppText>
                <AppText variant="caption" muted>
                    {date} · {tr("shopOrder.itemsCount", { count: order.itemCount })}
                    {paid ? ` · ${tr("shopOrder.paid")}` : ""}
                    {order.invoiceType === "b2b" ? ` · ${tr("shopOrder.gst.tag")}` : ""}
                </AppText>
            </View>
            <View style={styles.right}>
                <AppText variant="bodyStrong">{formatINR(order.total)}</AppText>
                <Pill size="sm" tone={STATUS_TONE[order.status] ?? "neutral"} label={tr(`shopOrder.status.${order.status}`)} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    skel: { marginBottom: 12 },
    card: { marginBottom: 8 },
    empty: { flexDirection: "row", alignItems: "center", gap: 10 },
    row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
    right: { alignItems: "flex-end", gap: 4 },
});
