import React, { forwardRef, useState } from "react";
import {
    StyleSheet,
    TextInput,
    View,
    type TextInputProps,
    type ViewStyle,
} from "react-native";

import { useTheme } from "@/theme";
import { AppText } from "./Text";

export interface FieldProps extends Omit<TextInputProps, "style"> {
    label?: string;
    error?: string;
    helper?: string;
    /** Locked, non-editable text shown at the left (e.g. "+91"). */
    prefix?: string;
    leftIcon?: React.ReactNode;
    rightAccessory?: React.ReactNode;
    containerStyle?: ViewStyle;
    optional?: boolean;
}

/**
 * Labeled text input with error + helper states. Field-friendly: 52dp tall,
 * high-contrast border, big text. Works standalone or under a RHF Controller.
 */
export const Field = forwardRef<TextInput, FieldProps>(function Field(
    {
        label,
        error,
        helper,
        prefix,
        leftIcon,
        rightAccessory,
        containerStyle,
        optional,
        onFocus,
        onBlur,
        editable = true,
        ...inputProps
    },
    ref,
) {
    const t = useTheme();
    const [focused, setFocused] = useState(false);

    const borderColor = error
        ? t.colors.error
        : focused
          ? t.colors.accentDk
          : t.colors.border;

    return (
        <View style={[styles.wrap, containerStyle]}>
            {label ? (
                <View style={styles.labelRow}>
                    <AppText variant="label" color="ink700">
                        {label}
                    </AppText>
                    {optional ? (
                        <AppText variant="caption" muted>
                            {"  optional"}
                        </AppText>
                    ) : null}
                </View>
            ) : null}

            <View
                style={[
                    styles.inputRow,
                    {
                        borderColor,
                        backgroundColor: editable ? t.colors.surface : t.colors.subtle,
                        borderRadius: t.radius.md,
                    },
                ]}
            >
                {leftIcon ? <View style={styles.left}>{leftIcon}</View> : null}
                {prefix ? (
                    <View style={styles.prefix}>
                        <AppText variant="title" color="ink700">
                            {prefix}
                        </AppText>
                    </View>
                ) : null}
                <TextInput
                    ref={ref}
                    style={styles.input}
                    placeholderTextColor={t.colors.ink400}
                    editable={editable}
                    onFocus={(e) => {
                        setFocused(true);
                        onFocus?.(e);
                    }}
                    onBlur={(e) => {
                        setFocused(false);
                        onBlur?.(e);
                    }}
                    {...inputProps}
                />
                {rightAccessory ? <View style={styles.right}>{rightAccessory}</View> : null}
            </View>

            {error ? (
                <AppText variant="caption" color="error" style={styles.msg}>
                    {error}
                </AppText>
            ) : helper ? (
                <AppText variant="caption" muted style={styles.msg}>
                    {helper}
                </AppText>
            ) : null}
        </View>
    );
});

const styles = StyleSheet.create({
    wrap: { width: "100%" },
    labelRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
    inputRow: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1.5,
        minHeight: 52,
        paddingHorizontal: 14,
    },
    left: { marginRight: 8 },
    prefix: {
        marginRight: 8,
        paddingRight: 8,
        borderRightWidth: StyleSheet.hairlineWidth,
        borderRightColor: "#E5E7EB",
    },
    input: {
        flex: 1,
        fontFamily: "Inter_500Medium",
        fontSize: 16,
        color: "#111827",
        paddingVertical: 12,
    },
    right: { marginLeft: 8 },
    msg: { marginTop: 6 },
});
