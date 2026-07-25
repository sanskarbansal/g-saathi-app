import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import {
    Smartphone,
    BookText,
    ShoppingCart,
    Check,
    Lock,
    Send,
    type LucideIcon,
} from "lucide-react-native";

import {
    type AdvanceableStage,
    type ChecklistItem,
    type ChecklistStep,
    type UpdateOnboardingResult,
} from "@/api";
import { useTheme } from "@/theme";
import { AppText, Button, Card, InlineBanner } from "@/ui";
import { useIsOnline } from "@/offline";
import { sendWhatsAppInstall } from "@/utils/whatsapp";
import { useAdvanceStage } from "./useAdvanceStage";
import { OrderNumberSheet } from "./OrderNumberSheet";

type StepKind = "auto" | "advance" | "order";

interface StepConfig {
    step: ChecklistStep;
    kind: StepKind;
    stage?: AdvanceableStage; // set only for agent-advanceable steps (khata_imported)
    icon: LucideIcon;
    titleKey: string;
    descKey: string;
    actionKey?: string;
}

const STEPS: StepConfig[] = [
    {
        // Owner-driven: flips automatically when the owner installs the app and
        // registers with the shop's phone (backend claimStoreForUser). The agent can
        // nudge them with the install link but can never mark this done by hand.
        step: "app_installed",
        kind: "auto",
        icon: Smartphone,
        titleKey: "onboarding.stepAppTitle",
        descKey: "onboarding.stepAppDesc",
    },
    {
        step: "khata_imported",
        kind: "advance",
        stage: "khata_imported",
        icon: BookText,
        titleKey: "onboarding.stepKhataTitle",
        descKey: "onboarding.stepKhataDesc",
        actionKey: "onboarding.importKhata",
    },
    {
        step: "first_order",
        kind: "order",
        icon: ShoppingCart,
        titleKey: "onboarding.stepOrderTitle",
        descKey: "onboarding.stepOrderDesc",
        actionKey: "onboarding.placeOrder",
    },
];

interface Props {
    onboardingId: string;
    checklist: ChecklistItem[];
    phone: string | null;
    shopName: string;
    onAdvanced?: (result: UpdateOnboardingResult) => void;
}

/**
 * The three-step activation checklist. Steps unlock in order (forward-only).
 * `app_installed` is owner-driven: it completes automatically when the owner
 * installs the app and registers with the shop's phone — the agent can send the
 * install link but cannot mark it done (removes the manual-activation fraud path).
 */
export function ActivationChecklist({ onboardingId, checklist, phone, onAdvanced }: Props) {
    const t = useTheme();
    const { t: tr } = useTranslation();
    const online = useIsOnline();
    const advance = useAdvanceStage(onboardingId);
    const [pendingStep, setPendingStep] = useState<ChecklistStep | null>(null);
    const [orderSheet, setOrderSheet] = useState(false);

    const doneMap = new Map(checklist.map((c) => [c.step, c.done]));
    const isDone = (s: ChecklistStep) => doneMap.get(s) === true;

    // Only agent-advanceable steps (khata_imported) hit the funnel PATCH.
    const onMark = (cfg: StepConfig) => {
        if (!cfg.stage) return;
        setPendingStep(cfg.step);
        advance.mutate(cfg.stage, {
            onSuccess: (data) => onAdvanced?.(data),
            onSettled: () => setPendingStep(null),
        });
    };

    const onSendLink = () => {
        if (phone) void sendWhatsAppInstall(phone, tr("onboarding.installMessage"));
    };

    return (
        <View>
            {!online ? (
                <InlineBanner tone="warning" text={tr("offline.banner")} style={styles.offline} />
            ) : null}

            {STEPS.map((cfg, index) => {
                const done = isDone(cfg.step);
                const prevDone = index === 0 || isDone(STEPS[index - 1]!.step);
                const actionable = !done && prevDone;
                const locked = !done && !prevDone;
                const Icon = cfg.icon;
                const busy = cfg.kind === "advance" && advance.isPending && pendingStep === cfg.step;

                return (
                    <Card key={cfg.step} style={styles.card}>
                        <View style={styles.row}>
                            <View
                                style={[
                                    styles.badge,
                                    {
                                        backgroundColor: done
                                            ? t.colors.success
                                            : actionable
                                              ? t.colors.tertiary
                                              : t.colors.subtle,
                                    },
                                ]}
                            >
                                {done ? (
                                    <Check size={20} color={t.colors.white} />
                                ) : locked ? (
                                    <Lock size={18} color={t.colors.ink400} />
                                ) : (
                                    <Icon size={20} color={t.colors.primary} />
                                )}
                            </View>
                            <View style={styles.body}>
                                <AppText variant="title" color={locked ? "ink400" : "ink900"}>
                                    {tr(cfg.titleKey)}
                                </AppText>
                                <AppText variant="caption" muted style={styles.desc}>
                                    {tr(cfg.descKey)}
                                </AppText>
                            </View>
                        </View>

                        {actionable && cfg.kind === "auto" ? (
                            // Owner-driven step: no manual "done" button. Offer the install-link
                            // nudge and a waiting hint; it flips on its own when the owner registers.
                            <View style={styles.autoActions}>
                                {phone ? (
                                    <Button
                                        title={tr("onboarding.sendLink")}
                                        variant="ghost"
                                        size="md"
                                        leftIcon={<Send size={18} color={t.colors.primary} />}
                                        onPress={onSendLink}
                                    />
                                ) : null}
                                <AppText variant="caption" muted style={styles.waiting}>
                                    {tr("onboarding.stepAppWaiting")}
                                </AppText>
                            </View>
                        ) : actionable ? (
                            <View style={styles.actions}>
                                <Button
                                    title={tr(cfg.actionKey!)}
                                    variant="dark"
                                    size="md"
                                    onPress={cfg.kind === "order" ? () => setOrderSheet(true) : () => onMark(cfg)}
                                    loading={busy}
                                    disabled={!online || (advance.isPending && !busy)}
                                    style={styles.actionBtn}
                                />
                            </View>
                        ) : null}
                    </Card>
                );
            })}

            <OrderNumberSheet
                visible={orderSheet}
                onClose={() => setOrderSheet(false)}
                onboardingId={onboardingId}
                mode="first"
                onAttributed={(r) => onAdvanced?.({ onboarding: r.onboarding, checklist: r.checklist })}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    offline: { marginBottom: 12 },
    card: { marginBottom: 12 },
    row: { flexDirection: "row", alignItems: "center" },
    badge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    body: { flex: 1, marginLeft: 12 },
    desc: { marginTop: 3 },
    actions: { flexDirection: "row", gap: 10, marginTop: 14 },
    autoActions: { marginTop: 14, gap: 8 },
    waiting: { paddingHorizontal: 2 },
    actionBtn: { flex: 1 },
});
