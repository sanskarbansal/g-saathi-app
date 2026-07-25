import React from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react-native";

import { useTheme } from "@/theme";
import { AppText } from "@/ui";

const STEP_KEYS = ["onboarding.stepDetails", "onboarding.stepKyc", "onboarding.stepActivate"];

/** Three-step progress indicator for the Add-Kirana wizard. `current` is 1-based. */
export function Stepper({ current }: { current: 1 | 2 | 3 }) {
    const t = useTheme();
    const { t: tr } = useTranslation();

    return (
        <View style={styles.wrap}>
            {STEP_KEYS.map((key, i) => {
                const index = i + 1;
                const done = index < current;
                const active = index === current;
                return (
                    <View key={key} style={styles.stepWrap}>
                        <View style={styles.dotRow}>
                            {i > 0 ? (
                                <View
                                    style={[
                                        styles.line,
                                        { backgroundColor: done || active ? t.colors.accent : t.colors.border },
                                    ]}
                                />
                            ) : (
                                <View style={styles.lineSpacer} />
                            )}
                            <View
                                style={[
                                    styles.dot,
                                    {
                                        backgroundColor: done
                                            ? t.colors.accent
                                            : active
                                              ? t.colors.primary
                                              : t.colors.subtle,
                                    },
                                ]}
                            >
                                {done ? (
                                    <Check size={14} color={t.colors.primary} />
                                ) : (
                                    <AppText
                                        variant="label"
                                        style={{ color: active ? t.colors.white : t.colors.ink400 }}
                                    >
                                        {index}
                                    </AppText>
                                )}
                            </View>
                            {i < STEP_KEYS.length - 1 ? (
                                <View
                                    style={[
                                        styles.line,
                                        { backgroundColor: done ? t.colors.accent : t.colors.border },
                                    ]}
                                />
                            ) : (
                                <View style={styles.lineSpacer} />
                            )}
                        </View>
                        <AppText
                            variant="caption"
                            color={active ? "primary" : "ink400"}
                            align="center"
                            style={styles.label}
                        >
                            {tr(key)}
                        </AppText>
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { flexDirection: "row", marginBottom: 8 },
    stepWrap: { flex: 1, alignItems: "center" },
    dotRow: { flexDirection: "row", alignItems: "center", width: "100%" },
    dot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    line: { flex: 1, height: 2 },
    lineSpacer: { flex: 1 },
    label: { marginTop: 6 },
});
