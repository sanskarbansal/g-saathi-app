import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";

import type { ChecklistItem } from "@/api";
import { AppText, Button, Header, Screen } from "@/ui";
import { useAddKirana } from "./AddKiranaContext";
import { ActivationChecklist } from "./ActivationChecklist";
import { Stepper } from "./Stepper";
import type { AddKiranaScreenProps } from "@/navigation/types";

export function ActivationScreen({ navigation }: AddKiranaScreenProps<"Activation">) {
    const { t: tr } = useTranslation();
    const { draft, update } = useAddKirana();
    const result = draft.result;

    const [checklist, setChecklist] = useState<ChecklistItem[]>(
        result?.checklist ?? [
            { step: "app_installed", done: false },
            { step: "khata_imported", done: false },
            { step: "first_order", done: false },
        ],
    );

    const onFinish = () => navigation.navigate("Success");

    return (
        <Screen scroll padded={false} edges={["top", "left", "right"]}>
            <View style={styles.headerWrap}>
                <Header title={tr("onboarding.title")} onBack={() => navigation.goBack()} />
                <Stepper current={3} />
            </View>

            <View style={styles.body}>
                <AppText variant="h2">{tr("onboarding.activateTitle")}</AppText>
                <AppText variant="body" muted style={styles.subtitle}>
                    {tr("onboarding.activateSubtitle", { shop: draft.shopName })}
                </AppText>

                {result?.onboardingId ? (
                    <ActivationChecklist
                        onboardingId={result.onboardingId}
                        checklist={checklist}
                        phone={draft.phoneDigits}
                        shopName={draft.shopName}
                        onAdvanced={(r) => {
                            setChecklist(r.checklist);
                            update({ result: { ...result, checklist: r.checklist } });
                        }}
                    />
                ) : null}

                <Button title={tr("onboarding.finish")} onPress={onFinish} style={styles.finish} />
                <View style={styles.bottomPad} />
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    headerWrap: { paddingHorizontal: 16, paddingBottom: 8 },
    body: { paddingHorizontal: 16 },
    subtitle: { marginTop: 6, marginBottom: 20 },
    finish: { marginTop: 20 },
    bottomPad: { height: 40 },
});
