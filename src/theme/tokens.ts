/**
 * Groship brand design tokens (from the approved Saathi mockups, §3).
 * Dark-green hero + lime/gold accent, rounded 16px cards, big score numbers.
 * Field-use first: high contrast, large tap targets, works in bright sunlight.
 */

export const palette = {
    // Brand greens
    primary: "#1A2E05", // dark green — hero headers, primary text on light
    primary2: "#2D4A0A", // gradient partner
    accent: "#84CC16", // lime — primary actions, progress
    accentDk: "#65A30D",
    accentLt: "#A3E635",
    secondary: "#BEF264",
    tertiary: "#D9F99D", // soft lime tint — chips, callouts

    // Celebration
    gold: "#F59E0B",
    goldLt: "#FBBF24",

    // Surfaces
    bg: "#F9FAFB",
    surface: "#FFFFFF",
    subtle: "#F3F4F6",
    border: "#E5E7EB",

    // Ink
    ink900: "#111827",
    ink700: "#374151",
    ink500: "#6B7280",
    ink400: "#9CA3AF",

    // Status
    success: "#22C55E",
    warning: "#F59E0B",
    error: "#EF4444",
    info: "#3B82F6",

    // Absolutes
    white: "#FFFFFF",
    black: "#000000",
    // Translucent inks for use on dark hero backgrounds
    onDark: "#FFFFFF",
    onDarkMuted: "rgba(255,255,255,0.72)",
    onDarkFaint: "rgba(255,255,255,0.14)",
} as const;

export const gradients = {
    primary: ["#1A2E05", "#2D4A0A"] as const,
    accent: ["#84CC16", "#65A30D"] as const,
    gold: ["#F59E0B", "#FBBF24"] as const,
    hero: ["#1A2E05", "#2D4A0A"] as const,
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
} as const;

export const radius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 28,
    pill: 999,
} as const;

export const fontFamily = {
    regular: "Inter_400Regular",
    medium: "Inter_500Medium",
    semibold: "Inter_600SemiBold",
    bold: "Inter_700Bold",
    extrabold: "Inter_800ExtraBold",
    black: "Inter_900Black",
} as const;

export const fontSize = {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    display: 44,
    hero: 56,
} as const;

/** Cross-platform soft shadow presets. */
export const shadow = {
    none: {},
    card: {
        shadowColor: "#111827",
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
    },
    raised: {
        shadowColor: "#111827",
        shadowOpacity: 0.12,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
        elevation: 6,
    },
    accent: {
        shadowColor: "#65A30D",
        shadowOpacity: 0.35,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 6,
    },
} as const;

/** Minimum interactive size for field use (one-handed, gloves, sunlight). */
export const TOUCH_MIN = 48;

export const theme = {
    colors: palette,
    gradients,
    spacing,
    radius,
    fontFamily,
    fontSize,
    shadow,
    touchMin: TOUCH_MIN,
} as const;

export type Theme = typeof theme;
export type ThemeColor = keyof typeof palette;
