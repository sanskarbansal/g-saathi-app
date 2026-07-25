import React, { useCallback, useState } from "react";
import { Alert, StyleSheet, Switch, View } from "react-native";
import Constants from "expo-constants";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
    LogOut,
    Gift,
    BadgeCheck,
    IndianRupee,
    Layers,
    MapPin,
    Navigation,
    Trophy,
} from "lucide-react-native";

import { fieldApi, qk } from "@/api";
import { useSession } from "@/auth";
import { useLocationSharing } from "@/location";
import { useTheme } from "@/theme";
import {
    AppText,
    Button,
    Card,
    Divider,
    HeroHeader,
    IconCircle,
    InlineBanner,
    Pill,
    Screen,
    Segmented,
} from "@/ui";
import { changeLanguage, SUPPORTED_LANGUAGES, type AppLanguage } from "@/i18n";
import { formatINR, formatNumber, initials } from "@/utils/format";
import type { AppTabScreenProps } from "@/navigation/types";

export function ProfileScreen(_props: AppTabScreenProps<"Profile">) {
    const t = useTheme();
    const { t: tr, i18n } = useTranslation();
    const { agent, signOut } = useSession();
    const { sharingEnabled, permission, setSharingEnabled } = useLocationSharing();

    const me = useQuery({
        queryKey: qk.fieldMe,
        queryFn: fieldApi.getMe,
        initialData: agent ?? undefined,
    });
    const profile = me.data ?? agent;
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await me.refetch();
        setRefreshing(false);
    }, [me]);

    const confirmLogout = () => {
        Alert.alert(tr("profile.logoutConfirmTitle"), tr("profile.logoutConfirmMessage"), [
            { text: tr("common.cancel"), style: "cancel" },
            { text: tr("profile.logout"), style: "destructive", onPress: () => void signOut() },
        ]);
    };

    const langOptions = SUPPORTED_LANGUAGES.map((l) => ({ label: l.label, value: l.code }));
    const appVersion = Constants.expoConfig?.version ?? "0.1.0";

    return (
        <Screen scroll padded={false} refreshing={refreshing} onRefresh={onRefresh}>
            <HeroHeader>
                <View style={styles.heroRow}>
                    <IconCircle size={56} color="#A3E635">
                        <AppText variant="h2" color="primary">
                            {initials(profile?.employeeCode)}
                        </AppText>
                    </IconCircle>
                    <View style={styles.heroBody}>
                        <AppText variant="h2" onDark numberOfLines={1}>
                            {profile?.employeeCode ?? "—"}
                        </AppText>
                        <Pill tone="gold" label={tr("home.levelChip", { level: profile?.currentLevel ?? 1 })} />
                    </View>
                </View>
            </HeroHeader>

            <View style={styles.body}>
                <Card style={styles.card}>
                    <InfoRow
                        icon={<BadgeCheck size={18} color={t.colors.ink500} />}
                        label={tr("profile.employeeCode")}
                        value={profile?.employeeCode ?? "—"}
                    />
                    <Divider />
                    <InfoRow
                        icon={<MapPin size={18} color={t.colors.ink500} />}
                        label={tr("profile.zone")}
                        value={profile?.zoneId ? profile.zoneId.slice(0, 8) : "—"}
                    />
                    <Divider />
                    <InfoRow
                        icon={<Layers size={18} color={t.colors.ink500} />}
                        label={tr("profile.level")}
                        value={String(profile?.currentLevel ?? 1)}
                    />
                    <Divider />
                    <InfoRow
                        icon={<Trophy size={18} color={t.colors.ink500} />}
                        label={tr("profile.lifetimePoints")}
                        value={formatNumber(profile?.lifetimePoints ?? 0)}
                    />
                    <Divider />
                    <InfoRow
                        icon={<IndianRupee size={18} color={t.colors.ink500} />}
                        label={tr("profile.baseSalary")}
                        value={formatINR(profile?.baseMonthlySalary ?? 0)}
                    />
                </Card>

                {/* Preferences */}
                <AppText variant="label" color="ink500" style={styles.sectionLabel}>
                    {tr("profile.preferences")}
                </AppText>
                <Card style={styles.card}>
                    <AppText variant="subtitle" style={styles.langLabel}>
                        {tr("profile.language")}
                    </AppText>
                    <Segmented
                        options={langOptions}
                        value={i18n.language.startsWith("en") ? "en" : "hi"}
                        onChange={(v) => void changeLanguage(v as AppLanguage)}
                    />
                </Card>

                {/* Live location sharing */}
                <AppText variant="label" color="ink500" style={styles.sectionLabel}>
                    {tr("profile.locationTitle")}
                </AppText>
                <Card style={styles.card}>
                    <View style={styles.locationRow}>
                        <IconCircle size={40} color={t.colors.subtle}>
                            <Navigation size={18} color={t.colors.primary} />
                        </IconCircle>
                        <View style={styles.locationBody}>
                            <AppText variant="title">{tr("profile.locationShare")}</AppText>
                            <AppText variant="caption" muted style={styles.locationCaption}>
                                {sharingEnabled ? tr("profile.locationOn") : tr("profile.locationOff")}
                            </AppText>
                        </View>
                        <Switch
                            value={sharingEnabled}
                            onValueChange={(v) => void setSharingEnabled(v)}
                            trackColor={{ true: t.colors.primary }}
                        />
                    </View>
                    {sharingEnabled && permission === "denied" ? (
                        <InlineBanner
                            tone="warning"
                            text={tr("profile.locationDenied")}
                            style={styles.locationDeniedBanner}
                        />
                    ) : null}
                </Card>

                {/* Rewards — reserved slot (no backend yet). */}
                <Card style={styles.card}>
                    <View style={styles.rewardsRow}>
                        <IconCircle size={40} color={t.colors.subtle}>
                            <Gift size={18} color={t.colors.ink400} />
                        </IconCircle>
                        <View style={styles.rewardsBody}>
                            <AppText variant="title" color="ink400">
                                {tr("profile.rewards")}
                            </AppText>
                        </View>
                        <Pill tone="neutral" size="sm" label={tr("profile.comingSoon")} />
                    </View>
                </Card>

                <Button
                    title={tr("profile.logout")}
                    variant="ghost"
                    leftIcon={<LogOut size={18} color={t.colors.error} />}
                    onPress={confirmLogout}
                    style={styles.logout}
                />

                <AppText variant="caption" muted align="center" style={styles.version}>
                    {tr("profile.version", { version: appVersion })}
                </AppText>
                <View style={styles.bottomPad} />
            </View>
        </Screen>
    );
}

function InfoRow({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <View style={styles.infoRow}>
            <View style={styles.infoIcon}>{icon}</View>
            <AppText variant="body" muted style={styles.infoLabel}>
                {label}
            </AppText>
            <AppText variant="bodyStrong" numberOfLines={1}>
                {value}
            </AppText>
        </View>
    );
}

const styles = StyleSheet.create({
    heroRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
    heroBody: { marginLeft: 14, flex: 1, gap: 6 },
    body: { padding: 16, marginTop: -8 },
    card: { marginBottom: 16 },
    infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
    infoIcon: { width: 30 },
    infoLabel: { flex: 1 },
    sectionLabel: { marginBottom: 8, marginLeft: 4, textTransform: "uppercase", letterSpacing: 0.5 },
    langLabel: { marginBottom: 12 },
    locationRow: { flexDirection: "row", alignItems: "center" },
    locationBody: { flex: 1, marginLeft: 12 },
    locationCaption: { marginTop: 2 },
    locationDeniedBanner: { marginTop: 12 },
    rewardsRow: { flexDirection: "row", alignItems: "center" },
    rewardsBody: { flex: 1, marginLeft: 12 },
    logout: { marginTop: 4 },
    version: { marginTop: 16 },
    bottomPad: { height: 24 },
});
