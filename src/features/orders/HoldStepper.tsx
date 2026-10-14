import React, { useCallback, useEffect, useRef } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { Minus, Plus } from "lucide-react-native";

import { useTheme } from "@/theme";
import { AppText } from "@/ui";

interface Props {
    value: number;
    onChange: (next: number) => void;
    min?: number;
    /** Upper bound (null = unbounded). The + button greys out there. */
    max?: number | null;
    /** Small line under the number — "3 Box × 12 = 36 Piece". */
    caption?: string;
    testID?: string;
    style?: ViewStyle;
}

/** Hold-to-accelerate schedule: how big a step and how soon the next one, by ticks held. */
export function holdStep(ticks: number): { step: number; delayMs: number } {
    if (ticks === 0) return { step: 1, delayMs: 380 }; // first repeat waits, so a tap is a tap
    if (ticks < 8) return { step: 1, delayMs: 140 };
    if (ticks < 20) return { step: 5, delayMs: 120 };
    return { step: 10, delayMs: 100 };
}

/** Next value in `dir`, snapping to a multiple of `step` once accelerating so holds land on round numbers. */
export function holdNext(value: number, dir: 1 | -1, step: number, min: number, max: number | null): number {
    let next: number;
    if (step === 1) next = value + dir;
    else next = dir > 0 ? Math.floor(value / step) * step + step : Math.ceil(value / step) * step - step;
    if (next < min) next = min;
    if (max != null && next > max) next = max;
    return next;
}

interface HoldOptions {
    value: number;
    onChange: (next: number) => void;
    min?: number;
    max?: number | null;
    /** Grow the step to 5s and 10s while held (base units). Off for packs, where 1 per tick is plenty. */
    accelerate?: boolean;
}

/**
 * Press-and-hold repeat for any −/+ control. `start(dir)` applies one step at once (the
 * tap) and keeps stepping while held; `stop` on release. Reads the latest value through a
 * ref so a long hold never works from a stale closure.
 */
export function useHoldRepeat({ value, onChange, min = 0, max = null, accelerate = true }: HoldOptions) {
    const valueRef = useRef(value);
    valueRef.current = value;
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const maxRef = useRef(max);
    maxRef.current = max;
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const stop = useCallback(() => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
    }, []);
    useEffect(() => stop, [stop]);

    const applyStep = useCallback(
        (dir: 1 | -1, step: number): boolean => {
            const next = holdNext(valueRef.current, dir, step, min, maxRef.current);
            if (next === valueRef.current) return false;
            valueRef.current = next;
            Haptics.selectionAsync().catch(() => {});
            onChangeRef.current(next);
            return true;
        },
        [min],
    );

    const start = useCallback(
        (dir: 1 | -1) => {
            stop();
            if (!applyStep(dir, 1)) return;
            // Each repeat waits holdStep(ticks).delayMs, then steps by the NEXT tick's size.
            let ticks = 0;
            const schedule = () => {
                timer.current = setTimeout(() => {
                    ticks += 1;
                    if (applyStep(dir, accelerate ? holdStep(ticks).step : 1)) schedule();
                    else stop();
                }, holdStep(ticks).delayMs);
            };
            schedule();
        },
        [accelerate, applyStep, stop],
    );

    return { start, stop, atMin: value <= min, atMax: max != null && value >= max };
}

/**
 * Big −/+ counter for the quantity sheet. Tap to step by one; press and hold to repeat,
 * speeding up from 1s to 5s to 10s so 200 units is a two-second hold, not 200 taps.
 * No keyboard involved, which is the point on a sunny shop floor.
 */
export function HoldStepper({ value, onChange, min = 0, max = null, caption, testID, style }: Props) {
    const t = useTheme();
    const { start, stop, atMin, atMax } = useHoldRepeat({ value, onChange, min, max });


    return (
        <View style={[styles.wrap, { borderColor: t.colors.accentDk, backgroundColor: t.colors.tertiary }, style]}>
            <Pressable
                onPressIn={() => start(-1)}
                onPressOut={stop}
                disabled={atMin}
                accessibilityRole="button"
                accessibilityLabel="−"
                style={[styles.btn, { backgroundColor: t.colors.surface, opacity: atMin ? 0.4 : 1 }]}
            >
                <Minus size={26} color={t.colors.primary} />
            </Pressable>
            <View style={styles.value}>
                <AppText variant="display" color="primary" testID={testID}>
                    {value}
                </AppText>
                {caption ? (
                    <AppText variant="caption" color="ink700" align="center">
                        {caption}
                    </AppText>
                ) : null}
            </View>
            <Pressable
                onPressIn={() => start(1)}
                onPressOut={stop}
                disabled={atMax}
                accessibilityRole="button"
                accessibilityLabel="+"
                style={[styles.btn, { backgroundColor: t.colors.primary, opacity: atMax ? 0.4 : 1 }]}
            >
                <Plus size={26} color={t.colors.white} />
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { flexDirection: "row", alignItems: "center", gap: 10, padding: 8, borderRadius: 18, borderWidth: 1.5 },
    btn: { width: 60, height: 60, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    value: { flex: 1, alignItems: "center", gap: 2 },
});
