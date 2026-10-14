import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Check, Crosshair, History, MapPin, Phone, Plus, Store, UserRound, WifiOff, X } from "lucide-react-native";

import { isApiError, type CustomerAddress, type CustomerAddressInput, type OrderTarget } from "@/api";
import { useIsOnline } from "@/offline";
import { useTheme } from "@/theme";
import { AppText, Button, Card, Field, Header, InlineBanner, Screen, Skeleton } from "@/ui";
import { captureGps, type CapturedGps } from "@/utils/capture";
import { prettyPhone } from "@/utils/format";
import type { RootStackScreenProps } from "@/navigation/types";
import { useCustomerLookup, useOrders } from "./hooks";

type AddressChoice = { kind: "saved"; id: string } | { kind: "new" };

function shortDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/**
 * Order by phone number — for ANY Groship customer, not only portfolio kiranas.
 *
 * Three numbered steps on one screen, revealed as the agent goes: the number (with the
 * customers they ordered for recently as one-tap shortcuts), who the order is for, and
 * where it goes. A sticky footer always says what will happen on Continue — or exactly
 * what is still missing — so the agent never stares at a disabled button.
 */
export function CustomerLookupScreen({ navigation }: RootStackScreenProps<"CustomerLookup">) {
    const t = useTheme();
    const { t: tr } = useTranslation();
    const online = useIsOnline();

    const [phone, setPhone] = useState("");
    const digits = phone.replace(/\D/g, "").slice(-10);
    const lookup = useCustomerLookup(phone);
    const data = digits.length === 10 ? lookup.data : undefined;
    const looking = digits.length === 10 && lookup.isLoading;

    // Customers the agent ordered for recently — one tap re-enters their number.
    const recentOrders = useOrders(undefined, 20, "customer");
    const recent = useMemo(() => {
        const seen = new Set<string>();
        const out: { phone: string; name: string | null; placedAt: string }[] = [];
        for (const o of recentOrders.data ?? []) {
            const p = (o.customerPhone ?? "").replace(/\D/g, "").slice(-10);
            if (p.length !== 10 || seen.has(p)) continue;
            seen.add(p);
            out.push({ phone: p, name: o.customerName, placedAt: o.placedAt });
            if (out.length === 5) break;
        }
        return out;
    }, [recentOrders.data]);

    const [customerName, setCustomerName] = useState("");
    const [choice, setChoice] = useState<AddressChoice | null>(null);

    // New-address form
    const [fullAddress, setFullAddress] = useState("");
    const [landmark, setLandmark] = useState("");
    const [pincode, setPincode] = useState("");
    const [city, setCity] = useState("");
    const [state, setState] = useState("Haryana");
    const [gps, setGps] = useState<CapturedGps | null>(null);
    const [gpsState, setGpsState] = useState<"idle" | "locating" | "denied" | "error">("idle");

    // Default the address choice when a lookup lands: default saved address, else "new".
    useEffect(() => {
        if (!data) {
            setChoice(null);
            return;
        }
        const def = data.addresses.find((a) => a.isDefault) ?? data.addresses[0];
        setChoice(def ? { kind: "saved", id: def.id } : { kind: "new" });
        if (data.customer) setCustomerName(data.customer.name);
    }, [data]);

    const locate = async () => {
        setGpsState("locating");
        const r = await captureGps();
        if (r.status === "granted") {
            setGps(r.gps);
            setGpsState("idle");
        } else {
            setGpsState(r.status === "denied" ? "denied" : "error");
        }
    };

    const newAddress = useMemo<CustomerAddressInput | null>(() => {
        if (choice?.kind !== "new") return null;
        if (fullAddress.trim().length < 3 || pincode.trim().length < 4 || !city.trim() || !state.trim()) return null;
        return {
            name: customerName.trim() || undefined,
            label: "Home",
            fullAddress: fullAddress.trim(),
            landmark: landmark.trim() || undefined,
            pincode: pincode.trim(),
            city: city.trim(),
            state: state.trim(),
            latitude: gps?.lat,
            longitude: gps?.lng,
        };
    }, [choice, fullAddress, pincode, city, state, landmark, gps, customerName]);

    const isNewCustomer = Boolean(data) && !data?.customer;
    const nameOk = !isNewCustomer || customerName.trim().length > 0;
    const addressOk = choice?.kind === "saved" || newAddress !== null;
    const chosenSaved: CustomerAddress | undefined = choice?.kind === "saved" ? data?.addresses.find((a) => a.id === choice.id) : undefined;
    const noHub = chosenSaved ? !chosenSaved.warehouseId && !data?.zoneWarehouseId : false;
    const canContinue = online && Boolean(data) && nameOk && addressOk && !noHub;

    // The one thing standing between the agent and Continue, in order of the steps.
    const blocker: string | null = !online
        ? tr("phoneOrder.missing.offline")
        : !data
          ? tr("phoneOrder.missing.phone")
          : !nameOk
            ? tr("phoneOrder.missing.name")
            : noHub
              ? tr("phoneOrder.missing.hub")
              : !addressOk
                ? choice?.kind === "new"
                    ? tr("phoneOrder.missing.addressFields")
                    : tr("phoneOrder.missing.address")
                : null;

    const summaryAddress = chosenSaved
        ? [chosenSaved.label, chosenSaved.fullAddress, chosenSaved.city].filter(Boolean).join(", ")
        : newAddress
          ? [tr("phoneOrder.newAddress"), newAddress.fullAddress, newAddress.city].filter(Boolean).join(", ")
          : "";

    const proceed = () => {
        if (!data || !canContinue) return;
        const target: OrderTarget = {
            kind: "customer",
            phone: data.phone,
            customerName: customerName.trim() || undefined,
            addressId: choice?.kind === "saved" ? choice.id : undefined,
            address: newAddress ?? undefined,
        };
        navigation.navigate("OrderCatalog", { target, title: customerName.trim() || prettyPhone(data.phone) });
    };

    const lookupError = lookup.error ? (isApiError(lookup.error) ? lookup.error.message : tr("errors.NETWORK")) : null;
    const phoneHelper = looking
        ? tr("phoneOrder.lookingUp")
        : data
          ? data.customer
              ? tr("phoneOrder.found", { name: data.customer.name })
              : tr("phoneOrder.notFound")
          : tr("phoneOrder.phoneHelper");

    const stepDone = { number: Boolean(data), who: Boolean(data) && nameOk, where: Boolean(data) && addressOk && !noHub };

    return (
        <Screen padded={false}>
            {/* Inner scroll carries no safe-area edges — the outer frame already applied them. */}
            <Screen scroll padded={false} edges={[]} contentContainerStyle={styles.content}>
                <View style={styles.px}>
                    <Header title={tr("phoneOrder.title")} subtitle={tr("phoneOrder.subtitle")} onBack={() => navigation.goBack()} />
                    {!online ? <InlineBanner tone="offline" icon={<WifiOff size={16} color={t.colors.white} />} text={tr("shopOrder.offline")} style={styles.banner} /> : null}

                    {/* ① Number */}
                    <StepHead n={1} title={tr("phoneOrder.steps.number")} done={stepDone.number} active={!data} />
                    <Field
                        label={tr("phoneOrder.phoneLabel")}
                        prefix="+91"
                        leftIcon={<Phone size={20} color={t.colors.ink500} />}
                        rightAccessory={
                            phone.length > 0 ? (
                                <Pressable onPress={() => setPhone("")} hitSlop={10} accessibilityRole="button" accessibilityLabel={tr("common.clear")} style={[styles.clearBtn, { backgroundColor: t.colors.subtle }]}>
                                    <X size={16} color={t.colors.ink700} />
                                </Pressable>
                            ) : undefined
                        }
                        keyboardType="phone-pad"
                        placeholder="98765 43210"
                        value={phone}
                        onChangeText={(v) => setPhone(v.replace(/[^0-9+ ]/g, "").slice(0, 14))}
                        helper={phoneHelper}
                        error={lookupError ?? undefined}
                        autoFocus={recent.length === 0}
                        containerStyle={styles.field}
                    />

                    {!data && !looking && recent.length > 0 ? (
                        <Card padded={false} style={styles.card}>
                            <View style={styles.recentHead}>
                                <History size={16} color={t.colors.ink500} />
                                <View style={styles.flex}>
                                    <AppText variant="subtitle">{tr("phoneOrder.recent")}</AppText>
                                    <AppText variant="caption" muted>
                                        {tr("phoneOrder.recentHint")}
                                    </AppText>
                                </View>
                            </View>
                            {recent.map((r) => (
                                <Pressable
                                    key={r.phone}
                                    onPress={() => setPhone(r.phone)}
                                    accessibilityRole="button"
                                    style={({ pressed }) => [styles.recentRow, { borderTopColor: t.colors.border, backgroundColor: pressed ? t.colors.subtle : "transparent" }]}
                                >
                                    <View style={[styles.avatar, { backgroundColor: t.colors.tertiary }]}>
                                        <UserRound size={18} color={t.colors.primary} />
                                    </View>
                                    <View style={styles.flex}>
                                        <AppText variant="title">{r.name || prettyPhone(r.phone)}</AppText>
                                        <AppText variant="caption" muted>
                                            {r.name ? `${prettyPhone(r.phone)} · ` : ""}
                                            {tr("phoneOrder.lastOrder", { date: shortDate(r.placedAt) })}
                                        </AppText>
                                    </View>
                                </Pressable>
                            ))}
                        </Card>
                    ) : null}

                    {looking ? <Skeleton height={96} radius={16} style={styles.banner} /> : null}

                    {data?.store ? (
                        <Card style={{ ...styles.card, backgroundColor: t.colors.tertiary, borderColor: t.colors.accentDk }}>
                            <View style={styles.row}>
                                <Store size={22} color={t.colors.primary} />
                                <View style={styles.flex}>
                                    <AppText variant="title">{data.store.shopName}</AppText>
                                    <AppText variant="caption" color="ink700">
                                        {tr("phoneOrder.isYourStore")}
                                    </AppText>
                                </View>
                            </View>
                            <Button
                                title={tr("phoneOrder.openStoreFlow")}
                                variant="dark"
                                size="md"
                                onPress={() =>
                                    navigation.replace("OrderCatalog", {
                                        target: { kind: "store", storeId: data.store!.id, onboardingId: data.store!.onboardingId },
                                        title: data.store!.shopName,
                                    })
                                }
                                style={styles.storeBtn}
                            />
                        </Card>
                    ) : null}

                    {data ? (
                        <>
                            {/* ② Who */}
                            <StepHead n={2} title={tr("phoneOrder.steps.who")} done={stepDone.who} active={!stepDone.who} />
                            <Card style={styles.card}>
                                <View style={styles.row}>
                                    <View style={[styles.avatar, { backgroundColor: data.customer ? t.colors.tertiary : t.colors.subtle }]}>
                                        <UserRound size={20} color={data.customer ? t.colors.primary : t.colors.ink400} />
                                    </View>
                                    <View style={styles.flex}>
                                        <AppText variant="title">{data.customer ? data.customer.name : tr("phoneOrder.newCustomer")}</AppText>
                                        <AppText variant="caption" muted>
                                            {prettyPhone(data.phone)}
                                            {data.customer ? ` · ${tr("phoneOrder.existing")}` : ` · ${tr("phoneOrder.willCreate")}`}
                                        </AppText>
                                    </View>
                                </View>
                                {isNewCustomer ? (
                                    <Field
                                        label={tr("phoneOrder.nameLabel")}
                                        placeholder={tr("phoneOrder.namePlaceholder")}
                                        value={customerName}
                                        onChangeText={setCustomerName}
                                        autoCapitalize="words"
                                        autoFocus
                                        containerStyle={styles.nameField}
                                    />
                                ) : null}
                            </Card>

                            {/* ③ Where */}
                            <StepHead n={3} title={tr("phoneOrder.steps.where")} done={stepDone.where} active={stepDone.who && !stepDone.where} />
                            {data.addresses.map((a) => {
                                const on = choice?.kind === "saved" && choice.id === a.id;
                                const dead = !a.warehouseId && !data.zoneWarehouseId;
                                return (
                                    <Pressable
                                        key={a.id}
                                        onPress={() => setChoice({ kind: "saved", id: a.id })}
                                        accessibilityRole="radio"
                                        accessibilityState={{ selected: on }}
                                        style={[styles.addr, { backgroundColor: on ? t.colors.tertiary : t.colors.surface, borderColor: on ? t.colors.accentDk : t.colors.border }]}
                                    >
                                        <View style={[styles.radio, { borderColor: on ? t.colors.primary : t.colors.ink400, backgroundColor: on ? t.colors.primary : "transparent" }]}>
                                            {on ? <Check size={14} color={t.colors.white} /> : null}
                                        </View>
                                        <View style={styles.flex}>
                                            <View style={styles.addrHead}>
                                                <MapPin size={16} color={on ? t.colors.primary : t.colors.ink500} />
                                                <AppText variant="title">{a.label}</AppText>
                                                {a.isDefault ? (
                                                    <View style={[styles.defaultTag, { backgroundColor: on ? t.colors.surface : t.colors.subtle }]}>
                                                        <AppText variant="caption" color="ink700">
                                                            {tr("phoneOrder.default")}
                                                        </AppText>
                                                    </View>
                                                ) : null}
                                            </View>
                                            <AppText variant="body" color="ink700">
                                                {[a.fullAddress, a.landmark].filter(Boolean).join(", ")}
                                            </AppText>
                                            <AppText variant="caption" muted>
                                                {[a.city, a.state, a.pincode].filter(Boolean).join(", ")}
                                                {a.name ? ` · ${a.name}` : ""}
                                            </AppText>
                                            {dead ? (
                                                <AppText variant="caption" color="warning">
                                                    {tr("phoneOrder.noHubForAddress")}
                                                </AppText>
                                            ) : null}
                                        </View>
                                    </Pressable>
                                );
                            })}
                            <Pressable
                                onPress={() => setChoice({ kind: "new" })}
                                accessibilityRole="radio"
                                accessibilityState={{ selected: choice?.kind === "new" }}
                                style={[styles.addr, { backgroundColor: choice?.kind === "new" ? t.colors.tertiary : t.colors.surface, borderColor: choice?.kind === "new" ? t.colors.accentDk : t.colors.border }]}
                            >
                                <View style={[styles.radio, { borderColor: choice?.kind === "new" ? t.colors.primary : t.colors.ink400, backgroundColor: choice?.kind === "new" ? t.colors.primary : "transparent" }]}>
                                    {choice?.kind === "new" ? <Check size={14} color={t.colors.white} /> : <Plus size={14} color={t.colors.ink500} />}
                                </View>
                                <AppText variant="title" style={styles.flex}>
                                    {tr("phoneOrder.addAddress")}
                                </AppText>
                            </Pressable>

                            {choice?.kind === "new" ? (
                                <Card style={styles.card}>
                                    {/* The pin decides which hub serves the order, so it comes first. */}
                                    <Button
                                        title={gps ? tr("phoneOrder.addr.gpsSet", { acc: Math.round(gps.accuracyM ?? 0) }) : tr("phoneOrder.addr.useGps")}
                                        variant={gps ? "ghost" : "primary"}
                                        size="md"
                                        leftIcon={gps ? <Check size={18} color={t.colors.primary} /> : <Crosshair size={18} color={t.colors.primary} />}
                                        loading={gpsState === "locating"}
                                        onPress={() => void locate()}
                                    />
                                    {gpsState === "denied" || gpsState === "error" ? (
                                        <AppText variant="caption" color="warning" style={styles.gpsNote}>
                                            {tr("phoneOrder.addr.gpsFailed")}
                                        </AppText>
                                    ) : (
                                        <AppText variant="caption" muted style={styles.gpsNote}>
                                            {tr("phoneOrder.addr.gpsHint")}
                                        </AppText>
                                    )}
                                    <Field label={tr("phoneOrder.addr.full")} placeholder={tr("phoneOrder.addr.fullPlaceholder")} value={fullAddress} onChangeText={setFullAddress} autoFocus containerStyle={styles.field} />
                                    <Field label={tr("phoneOrder.addr.landmark")} optional value={landmark} onChangeText={setLandmark} containerStyle={styles.field} />
                                    <View style={styles.two}>
                                        <Field label={tr("phoneOrder.addr.pincode")} keyboardType="number-pad" value={pincode} onChangeText={(v) => setPincode(v.replace(/\D/g, "").slice(0, 6))} containerStyle={styles.fieldHalf} />
                                        <Field label={tr("phoneOrder.addr.city")} value={city} onChangeText={setCity} autoCapitalize="words" containerStyle={styles.fieldHalf} />
                                    </View>
                                    <Field label={tr("phoneOrder.addr.state")} value={state} onChangeText={setState} containerStyle={styles.fieldLast} />
                                </Card>
                            ) : null}
                        </>
                    ) : null}
                </View>
            </Screen>

            {/* Sticky footer: what Continue will do, or what is still missing. */}
            <View style={[styles.footer, { backgroundColor: t.colors.surface, borderTopColor: t.colors.border }]}>
                {canContinue ? (
                    <View style={styles.summary}>
                        <AppText variant="label" color="accentDk">
                            {tr("phoneOrder.summaryTo", { name: customerName.trim() || prettyPhone(data?.phone ?? digits) })}
                        </AppText>
                        <AppText variant="caption" muted>
                            {summaryAddress}
                        </AppText>
                    </View>
                ) : blocker ? (
                    <AppText variant="caption" color={!online || noHub ? "warning" : "ink500"} style={styles.summary}>
                        {blocker}
                    </AppText>
                ) : null}
                <Button title={tr("phoneOrder.continue")} variant="dark" onPress={proceed} disabled={!canContinue} />
            </View>
        </Screen>
    );
}

/** Numbered step heading — the three steps really are a sequence, so the numbers mean something. */
function StepHead({ n, title, done, active }: { n: number; title: string; done: boolean; active: boolean }) {
    const t = useTheme();
    return (
        <View style={styles.stepHead}>
            <View style={[styles.stepDot, { backgroundColor: done ? t.colors.accent : active ? t.colors.primary : t.colors.subtle }]}>
                {done ? (
                    <Check size={14} color={t.colors.primary} />
                ) : (
                    <AppText variant="label" color={active ? "white" : "ink400"}>
                        {n}
                    </AppText>
                )}
            </View>
            <AppText variant="h2" color={done || active ? "ink900" : "ink400"}>
                {title}
            </AppText>
        </View>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    content: { paddingBottom: 140 },
    px: { paddingHorizontal: 16 },
    field: { marginBottom: 14 },
    fieldLast: { marginBottom: 0 },
    fieldHalf: { flex: 1, marginBottom: 14 },
    nameField: { marginTop: 14, marginBottom: 0 },
    banner: { marginBottom: 12 },
    card: { marginBottom: 14 },
    row: { flexDirection: "row", alignItems: "center", gap: 12 },
    avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    clearBtn: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    recentHead: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, paddingBottom: 10 },
    recentRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
    storeBtn: { marginTop: 14 },
    stepHead: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6, marginBottom: 10 },
    stepDot: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    addr: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1.5, marginBottom: 10 },
    addrHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" },
    radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: "center", justifyContent: "center", marginTop: 1 },
    defaultTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
    two: { flexDirection: "row", gap: 12 },
    gpsNote: { marginTop: 6, marginBottom: 14 },
    footer: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 24,
        borderTopWidth: StyleSheet.hairlineWidth,
        gap: 8,
    },
    summary: { gap: 1 },
});
