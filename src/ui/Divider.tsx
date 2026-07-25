import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

import { useTheme } from "@/theme";

/** A hairline separator. */
export function Divider({ style }: { style?: ViewStyle }) {
    const t = useTheme();
    return <View style={[styles.line, { backgroundColor: t.colors.border }, style]} />;
}

const styles = StyleSheet.create({
    line: { height: StyleSheet.hairlineWidth, width: "100%" },
});
