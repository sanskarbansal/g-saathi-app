import React, { useState } from "react";
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { Hash, X, CheckCircle2 } from "lucide-react-native";

import { isApiError, type AttributeOrderResult } from "@/api";
import { useTheme } from "@/theme";
import { AppText, Button, Field, InlineBanner } from "@/ui";
import { formatINR } from "@/utils/format";
import { useAttributeOrder } from "./useAttributeOrder";

interface OrderNumberSheetProps {
    visible: boolean;
    onClose: () => void;
    onboardingId: string;
    mode: "first" | "repeat";
    onAttributed?: (result: AttributeOrderResult) => void;
}

/**
 * Enter a real Groship order NUMBER to attribute it to the shop. The backend
 * verifies the order and returns its real amount — the agent never types money.
 */
export function OrderNumberSheet({
    visible,
    onClose,
    onboardingId,
    mode,
    onAttributed,
}: OrderNumberSheetProps) {
    const t = useTheme();
    const { t: tr } = useTranslation();
    const attribute = useAttributeOrder(onboardingId);
    const [orderNumber, setOrderNumber] = useState("");

    const close = () => {
        setOrderNumber("");
        attribute.reset();
        onClose();
    };

    const submit = () => {
        const on = orderNumber.trim();
        if (!on) return;
        attribute.mutate(
            { orderNumber: on },
            {
                onSuccess: (result) => {
                    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    onAttributed?.(result);
                },
            },
        );
    };

    // Show the server's specific message ("No order found…", "not a paid order",
    // "not linked to this shop's phone") — more actionable than a generic string.
    const errorText = attribute.error
        ? isApiError(attribute.error)
            ? attribute.error.message
            : tr("errors.UNKNOWN")
        : null;

    const success = attribute.isSuccess && attribute.data ? attribute.data : null;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
            <View style={styles.backdrop}>
                <Pressable style={styles.backdropTouch} onPress={close} />
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
                    <View style={[styles.sheet, { backgroundColor: t.colors.surface }]}>
                        <View style={styles.handle} />

                        {success ? (
                            <View style={styles.successWrap}>
                                <View style={styles.successIcon}>
                                    <CheckCircle2 size={40} color={t.colors.success} />
                                </View>
                                <AppText variant="h2" align="center">
                                    {tr("order.verifiedTitle")}
                                </AppText>
                                <AppText variant="display" color="primary" style={styles.amount}>
                                    {formatINR(success.order.amount)}
                                </AppText>
                                <AppText variant="caption" muted align="center">
                                    {tr("order.verifiedSub", { number: success.order.orderNumber })}
                                </AppText>
                                <Button title={tr("common.done")} onPress={close} style={styles.done} />
                            </View>
                        ) : (
                            <>
                                <View style={styles.header}>
                                    <AppText variant="h2">
                                        {mode === "first"
                                            ? tr("order.firstTitle")
                                            : tr("order.addTitle")}
                                    </AppText>
                                    <Pressable onPress={close} hitSlop={10} style={styles.closeBtn}>
                                        <X size={20} color={t.colors.ink500} />
                                    </Pressable>
                                </View>

                                <Field
                                    label={tr("order.numberLabel")}
                                    leftIcon={<Hash size={20} color={t.colors.ink500} />}
                                    placeholder={tr("order.numberPlaceholder")}
                                    autoCapitalize="characters"
                                    autoCorrect={false}
                                    value={orderNumber}
                                    onChangeText={setOrderNumber}
                                    helper={tr("order.numberHelper")}
                                    error={errorText ?? undefined}
                                    containerStyle={styles.field}
                                    returnKeyType="done"
                                    onSubmitEditing={submit}
                                    autoFocus
                                />

                                <Button
                                    title={tr("order.verify")}
                                    onPress={submit}
                                    loading={attribute.isPending}
                                    disabled={orderNumber.trim().length === 0}
                                    style={styles.save}
                                />
                            </>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: "rgba(17,24,39,0.45)", justifyContent: "flex-end" },
    backdropTouch: { flex: 1 },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 32,
    },
    handle: {
        alignSelf: "center",
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: "#E5E7EB",
        marginBottom: 16,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 18,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F3F4F6",
    },
    field: { marginBottom: 20 },
    save: {},
    successWrap: { alignItems: "center", paddingVertical: 8 },
    successIcon: { marginBottom: 12 },
    amount: { marginVertical: 6 },
    done: { marginTop: 20, alignSelf: "stretch" },
});
