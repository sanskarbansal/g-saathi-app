/** Date + period (YYYY-MM) helpers for the score month switcher and "today" counts. */

export function isToday(iso?: string | null): boolean {
    if (!iso) return false;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return false;
    const n = new Date();
    return (
        d.getFullYear() === n.getFullYear() &&
        d.getMonth() === n.getMonth() &&
        d.getDate() === n.getDate()
    );
}

export function currentPeriod(): string {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

/** Shift a YYYY-MM period by whole months (delta may be negative). */
export function shiftPeriod(period: string, delta: number): string {
    const [y, m] = period.split("-").map(Number);
    const d = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1 + delta, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function isFuturePeriod(period: string): boolean {
    return period > currentPeriod();
}

const MONTHS_EN = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];
const MONTHS_HI = [
    "जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून",
    "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर",
];

export function monthLabel(period: string, locale: string = "en"): string {
    const [y, m] = period.split("-").map(Number);
    const idx = (m ?? 1) - 1;
    const arr = locale.startsWith("hi") ? MONTHS_HI : MONTHS_EN;
    return `${arr[idx] ?? ""} ${y ?? ""}`.trim();
}
