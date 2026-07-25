import { z } from "zod";

/**
 * Client validation that MIRRORS the backend zod rules
 * (g-backend/src/validators/*.ts). Messages are i18n keys — resolve with
 * `t(message)` when displaying (see forms). Empty optional strings are
 * normalized to `undefined` so we never POST "".
 */

const emptyToUndefined = (v: unknown) =>
    typeof v === "string" && v.trim() === "" ? undefined : v;

// ── Primitives ───────────────────────────────────────────────────────────────

/** UI collects the 10 digits; we prefix "+91 " before sending (backend regex). */
export const phoneDigitsSchema = z
    .string()
    .regex(/^\d{10}$/, "validation.phoneInvalid");

/** Full server phone format: "+91 9876543210" (with the space). */
export const fullPhoneSchema = z
    .string()
    .regex(/^\+91\s\d{10}$/, "validation.phoneInvalid");

export const otpSchema = z.string().regex(/^\d{6}$/, "validation.otpInvalid");

/** period=YYYY-MM (backend scoreQuerySchema). */
export const periodSchema = z
    .string()
    .regex(/^\d{4}-\d{2}$/, "validation.periodInvalid");

const upiSchema = z.preprocess(
    emptyToUndefined,
    z
        .string()
        .max(255, "validation.upiInvalid")
        .regex(/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/, "validation.upiInvalid")
        .optional(),
);

const gstinSchema = z.preprocess(
    emptyToUndefined,
    z
        .string()
        .regex(
            /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
            "validation.gstinInvalid",
        )
        .optional(),
);

export const LANGUAGE_VALUES = ["hi", "en", "hry"] as const;
export type LanguageValue = (typeof LANGUAGE_VALUES)[number];
export const languageSchema = z.enum(LANGUAGE_VALUES);

// ── Add-Kirana forms ─────────────────────────────────────────────────────────

/** Step 1 — shop details. Photo + GPS are captured outside the form. */
export const detailsFormSchema = z.object({
    shopName: z
        .string()
        .trim()
        .min(1, "validation.shopNameRequired")
        .max(255, "validation.shopNameTooLong"),
    ownerName: z.preprocess(
        emptyToUndefined,
        z.string().max(255, "validation.ownerNameTooLong").optional(),
    ),
    phoneDigits: phoneDigitsSchema,
});
export type DetailsForm = z.infer<typeof detailsFormSchema>;

/**
 * Step 2 — KYC & payment. All fields optional/skippable. The nearest-hub select
 * is handled as local screen state (stub ids aren't POSTed) — see config/hubs.ts.
 */
export const kycFormSchema = z.object({
    upiVpa: upiSchema,
    gstin: gstinSchema,
    language: languageSchema,
});
export type KycForm = z.infer<typeof kycFormSchema>;

// ── Helpers ──────────────────────────────────────────────────────────────────

export const toFullPhone = (digits: string): string => `+91 ${digits}`;

export const fromFullPhone = (full: string): string =>
    full.replace(/^\+91\s?/, "").replace(/\D/g, "");
