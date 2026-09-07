import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Check, Crosshair, MapPin, Phone, Plus, Store, UserRound, WifiOff } from "lucide-react-native";

import { isApiError, type CustomerAddress, type CustomerAddressInput, type OrderTarget } from "@/api";
import { useIsOnline } from "@/offline";
import { useTheme } from "@/theme";
import { AppText, Button, Card, Field, Header, InlineBanner, Screen, Skeleton } from "@/ui";
import { captureGps, type CapturedGps } from "@/utils/capture";
import { prettyPhone } from "@/utils/format";
import type { RootStackScreenProps } from "@/navigation/types";
import { useCustomerLookup } from "./hooks";

type AddressChoice = { kind: "saved"; id: string } | { kind: "new" };

/**
 * Order by phone number — for ANY Groship customer, not only portfolio kiranas.
 *
 * The agent types a number; we look it up live and show the account + saved addresses.
 * They pick a saved address or capture a new one (with their GPS as the pin), name a
 * brand-new customer if the number is unknown, and continue into the normal catalog →
 * checkout flow with a "customer" target. If the number turns out to be one of their own
 * kiranas we steer them to the store flow instead, because that one earns store credit.
 */
export function CustomerLookupScreen({ navigation }: RootStackScreenProps<"CustomerLookup">) {
    const t = useTheme();
    const { t: tr } = useTranslation();
    const online = useIsOnline();

    const [phone, setPhone] = useState("");
    const digits = phone.replace(/\D/g, "").slice(-10);
    const lookup = useCustomerLookup(phone);
    const data = digits.length === 10 ? lookup.data : undefined;

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

    return (
        <Screen scroll padded={false} contentContainerStyle={styles.content}>
            <View style={styles.px}>
                <Header title={tr("phoneOrder.title")} subtitle={tr("phoneOrder.subtitle")} onBack={() => navigation.goBack()} />
                {!online ? <InlineBanner tone="offline" icon={<WifiOff size={16} color={t.colors.white} />} text={tr("shopOrder.offline")} style={styles.banner} /> : null}

                <Field
                    label={tr("phoneOrder.phoneLabel")}
                    prefix="+91"
                    leftIcon={<Phone size={20} color={t.colors.ink500} />}
                    keyboardType="phone-pad"
                    placeholder="98765 43210"
                    value={phone}
                    onChangeText={(v) => setPhone(v.replace(/[^0-9+ ]/g, "").slice(0, 14))}
                    helper={digits.length < 10 ? tr("phoneOrder.phoneHelper") : undefined}
                    error={lookupError ?? undefined}
                    autoFocus
                    containerStyle={styles.field}
                />

                {digits.length === 10 && lookup.isLoading ? <Skeleton height={96} radius={16} style={styles.banner} /> : null}

                {data?.store ? (
                    <Card style={styles.card}>
                        <View style={styles.row}>
                            <Store size={20} color={t.colors.accentDk} />
                            <View style={styles.flex}>
                                <AppText variant="title">{data.store.shopName}</AppText>
                                <AppText variant="caption" muted>
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
                        <Card style={styles.card}>
                            <View style={styles.row}>
                                <UserRound size={20} color={data.customer ? t.colors.accentDk : t.colors.ink400} />
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
                                    containerStyle={styles.nameField}
                                />
                            ) : null}
                        </Card>

                        <AppText variant="h2" style={styles.sectionTitle}>
                            {tr("phoneOrder.deliverWhere")}
                        </AppText>
                        {data.addresses.map((a) => {
                            const on = choice?.kind === "saved" && choice.id === a.id;
                            return (
                                <Pressable
                                    key={a.id}
                                    onPress={() => setChoice({ kind: "saved", id: a.id })}
                                    style={[styles.addr, { backgroundColor: on ? t.colors.tertiary : t.colors.surface, borderColor: on ? t.colors.accentDk : t.colors.border }]}
                                >
                                    <MapPin size={18} color={on ? t.colors.primary : t.colors.ink500} />
                                    <View style={styles.flex}>
                                        <AppText variant="title" numberOfLines={1}>
                                            {a.label}
                                            {a.isDefault ? ` · ${tr("phoneOrder.default")}` : ""}
                                        </AppText>
                                        <AppText variant="caption" muted numberOfLines={2}>
                                            {[a.fullAddress, a.landmark, a.city, a.pincode].filter(Boolean).join(", ")}
                                        </AppText>
                                        {!a.warehouseId ? (
                                            <AppText variant="caption" color="warning">
                                                {tr("phoneOrder.noHubForAddress")}
                                            </AppText>
                                        ) : null}
                                    </View>
                                    {on ? <Check size={18} color={t.colors.primary} /> : null}
                                </Pressable>
                            );
                        })}
                        <Pressable
                            onPress={() => setChoice({ kind: "new" })}
                            style={[styles.addr, { backgroundColor: choice?.kind === "new" ? t.colors.tertiary : t.colors.surface, borderColor: choice?.kind === "new" ? t.colors.accentDk : t.colors.border }]}
                        >
                            <Plus size={18} color={t.colors.primary} />
                            <AppText variant="title" style={styles.flex}>
                                {tr("phoneOrder.addAddress")}
                            </AppText>
                            {choice?.kind === "new" ? <Check size={18} color={t.colors.primary} /> : null}
                        </Pressable>

                        {choice?.kind === "new" ? (
                            <Card style={styles.card}>
                                <Field label={tr("phoneOrder.addr.full")} placeholder={tr("phoneOrder.addr.fullPlaceholder")} value={fullAddress} onChangeText={setFullAddress} containerStyle={styles.field} />
                                <Field label={tr("phoneOrder.addr.landmark")} optional value={landmark} onChangeText={setLandmark} containerStyle={styles.field} />
                                <View style={styles.two}>
                                    <Field label={tr("phoneOrder.addr.pincode")} keyboardType="number-pad" value={pincode} onChangeText={(v) => setPincode(v.replace(/\D/g, "").slice(0, 6))} containerStyle={styles.fieldHalf} />
                                    <Field label={tr("phoneOrder.addr.city")} value={city} onChangeText={setCity} containerStyle={styles.fieldHalf} />
                                </View>
                                <Field label={tr("phoneOrder.addr.state")} value={state} onChangeText={setState} containerStyle={styles.field} />
                                <Button
                                    title={gps ? tr("phoneOrder.addr.gpsSet", { acc: Math.round(gps.accuracyM ?? 0) }) : tr("phoneOrder.addr.useGps")}
                                    variant="ghost"
                                    size="md"
                                    leftIcon={<Crosshair size={18} color={t.colors.primary} />}
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
                            </Card>
                        ) : null}

                        {noHub ? <InlineBanner tone="warning" text={tr("phoneOrder.noHub")} style={styles.banner} /> : null}

                        <Button title={tr("phoneOrder.continue")} variant="dark" onPress={proceed} disabled={!canContinue} style={styles.cta} />
                    </>
                ) : null}
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    content: { paddingBottom: 40 },
    px: { paddingHorizontal: 16 },
    field: { marginBottom: 14 },
    fieldHalf: { flex: 1, marginBottom: 14 },
    nameField: { marginTop: 14, marginBottom: 0 },
    banner: { marginBottom: 12 },
    card: { marginBottom: 14 },
    row: { flexDirection: "row", alignItems: "center", gap: 12 },
    storeBtn: { marginTop: 14 },
    sectionTitle: { marginBottom: 10 },
    addr: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1.5, marginBottom: 10 },
    two: { flexDirection: "row", gap: 12 },
    gpsNote: { marginTop: 6 },
    cta: { marginTop: 8 },
});
