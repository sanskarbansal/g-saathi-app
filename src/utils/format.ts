/** Number/currency formatting with Indian digit grouping (no Intl dependency). */

function groupIndian(intStr: string): string {
    let s = intStr;
    const neg = s.startsWith("-");
    if (neg) s = s.slice(1);
    if (s.length <= 3) return (neg ? "-" : "") + s;
    const last3 = s.slice(-3);
    let rest = s.slice(0, -3);
    const parts: string[] = [];
    while (rest.length > 2) {
        parts.unshift(rest.slice(-2));
        rest = rest.slice(0, -2);
    }
    if (rest.length) parts.unshift(rest);
    return (neg ? "-" : "") + parts.join(",") + "," + last3;
}

export function formatNumber(n: number): string {
    if (!Number.isFinite(n)) return "0";
    return groupIndian(String(Math.round(n)));
}

export function formatINR(n: number): string {
    return "₹" + formatNumber(n);
}

/**
 * A price or order amount, always to the paisa: ₹90.00, ₹1,234.50, ₹1,20,000.00.
 * Two decimals everywhere so columns of prices line up and a ₹0.50 difference is visible.
 */
export function formatPrice(n: number): string {
    if (!Number.isFinite(n)) return "₹0.00";
    const cents = Math.round(Math.abs(n) * 100);
    const whole = Math.floor(cents / 100);
    const frac = String(cents % 100).padStart(2, "0");
    return (n < 0 ? "-" : "") + "₹" + groupIndian(String(whole)) + "." + frac;
}

/** Compact rupees for tight tiles: ₹5.0L, ₹1.2Cr, ₹12k. */
export function compactINR(n: number): string {
    if (!Number.isFinite(n)) return "₹0";
    const abs = Math.abs(n);
    if (abs >= 1e7) return "₹" + trimZero(n / 1e7) + " Cr";
    if (abs >= 1e5) return "₹" + trimZero(n / 1e5) + " L";
    if (abs >= 1e3) return "₹" + Math.round(n / 1e3) + "k";
    return "₹" + Math.round(n);
}

function trimZero(x: number): string {
    const r = Math.round(x * 10) / 10;
    return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

export function initials(name?: string | null): string {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p.charAt(0).toUpperCase()).join("") || "?";
}

/** Format a "+91 98765 43210" style phone for display. */
export function prettyPhone(full?: string | null): string {
    if (!full) return "";
    const digits = full.replace(/\D/g, "").slice(-10);
    if (digits.length !== 10) return full;
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}
