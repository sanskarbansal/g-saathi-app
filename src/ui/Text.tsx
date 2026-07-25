import React from "react";
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from "react-native";

import { useTheme } from "@/theme";
import { palette, type ThemeColor } from "@/theme/tokens";

export type TextVariant =
    | "hero"
    | "display"
    | "h1"
    | "h2"
    | "title"
    | "subtitle"
    | "body"
    | "bodyStrong"
    | "label"
    | "caption"
    | "overline";

export interface AppTextProps extends RNTextProps {
    variant?: TextVariant;
    color?: ThemeColor | string;
    align?: TextStyle["textAlign"];
    /** Shortcut for white text on the dark hero. */
    onDark?: boolean;
    muted?: boolean;
}

/**
 * The single typographic primitive. Every piece of text in the app renders
 * through here so weights, sizes, and colors stay consistent with the tokens.
 */
export function AppText({
    variant = "body",
    color,
    align,
    onDark,
    muted,
    style,
    children,
    ...rest
}: AppTextProps) {
    const t = useTheme();

    const resolvedColor =
        color && color in palette
            ? palette[color as ThemeColor]
            : color
              ? color
              : onDark
                ? muted
                    ? palette.onDarkMuted
                    : palette.onDark
                : muted
                  ? palette.ink500
                  : palette.ink900;

    return (
        <RNText
            style={[VARIANTS[variant], { color: resolvedColor, textAlign: align }, style]}
            allowFontScaling
            {...rest}
        >
            {children}
        </RNText>
    );
}

const F = {
    regular: "Inter_400Regular",
    medium: "Inter_500Medium",
    semibold: "Inter_600SemiBold",
    bold: "Inter_700Bold",
    extrabold: "Inter_800ExtraBold",
    black: "Inter_900Black",
} as const;

const VARIANTS: Record<TextVariant, TextStyle> = {
    hero: { fontFamily: F.black, fontSize: 56, lineHeight: 60, letterSpacing: -1.5 },
    display: { fontFamily: F.extrabold, fontSize: 44, lineHeight: 48, letterSpacing: -1 },
    h1: { fontFamily: F.extrabold, fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
    h2: { fontFamily: F.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
    title: { fontFamily: F.bold, fontSize: 17, lineHeight: 22 },
    subtitle: { fontFamily: F.semibold, fontSize: 15, lineHeight: 20 },
    body: { fontFamily: F.regular, fontSize: 15, lineHeight: 21 },
    bodyStrong: { fontFamily: F.semibold, fontSize: 15, lineHeight: 21 },
    label: { fontFamily: F.semibold, fontSize: 13, lineHeight: 17 },
    caption: { fontFamily: F.medium, fontSize: 12, lineHeight: 16 },
    overline: {
        fontFamily: F.bold,
        fontSize: 11,
        lineHeight: 14,
        letterSpacing: 1,
        textTransform: "uppercase",
    },
};
