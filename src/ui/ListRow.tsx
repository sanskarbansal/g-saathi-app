import React from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { ChevronRight } from "lucide-react-native";

import { useTheme } from "@/theme";
import { AppText } from "./Text";

interface ListRowProps {
    title: string;
    subtitle?: string;
    left?: React.ReactNode;
    right?: React.ReactNode;
    onPress?: () => void;
    showChevron?: boolean;
    style?: ViewStyle;
}

/** A tappable row: optional left media, title/subtitle, right content/chevron. */
export function ListRow({
    title,
    subtitle,
    left,
    right,
    onPress,
    showChevron = true,
    style,
}: ListRowProps) {
    const t = useTheme();

    const content = (
        <>
            {left ? <View style={styles.left}>{left}</View> : null}
            <View style={styles.body}>
                <AppText variant="title" numberOfLines={1}>
                    {title}
                </AppText>
                {subtitle ? (
                    <AppText variant="caption" muted numberOfLines={1} style={styles.sub}>
                        {subtitle}
                    </AppText>
                ) : null}
            </View>
            {right ? <View style={styles.right}>{right}</View> : null}
            {onPress && showChevron ? (
                <ChevronRight size={20} color={t.colors.ink400} style={styles.chevron} />
            ) : null}
        </>
    );

    const base: ViewStyle = {
        flexDirection: "row",
        alignItems: "center",
        minHeight: 60,
        paddingVertical: t.spacing.md,
    };

    if (onPress) {
        return (
            <Pressable
                onPress={onPress}
                accessibilityRole="button"
                style={({ pressed }) => [base, style, pressed && styles.pressed]}
            >
                {content}
            </Pressable>
        );
    }
    return <View style={[base, style]}>{content}</View>;
}

const styles = StyleSheet.create({
    left: { marginRight: 12 },
    body: { flex: 1 },
    sub: { marginTop: 2 },
    right: { marginLeft: 8 },
    chevron: { marginLeft: 4 },
    pressed: { opacity: 0.6 },
});
