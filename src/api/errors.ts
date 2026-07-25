import type { AxiosError } from "axios";

import type { ApiErrorBody, ApiErrorCode, ApiFailure } from "./types";

/**
 * A normalized API error. Every rejected request from the client is turned into
 * one of these so screens can branch on a stable `code` and map it to a friendly,
 * localized message via `errorI18nKey`.
 */
export class ApiError extends Error {
    readonly code: ApiErrorCode | string;
    readonly status: number;
    readonly details?: unknown;

    constructor(code: string, message: string, status: number, details?: unknown) {
        super(message);
        this.name = "ApiError";
        this.code = code;
        this.status = status;
        this.details = details;
    }

    static fromAxios(error: AxiosError): ApiError {
        // Server responded with our envelope.
        const body = error.response?.data as Partial<ApiFailure> | undefined;
        if (body && body.success === false && body.error) {
            const e = body.error as ApiErrorBody;
            return new ApiError(
                e.code ?? "UNKNOWN",
                e.message ?? "Something went wrong",
                error.response?.status ?? 0,
                e.details,
            );
        }
        // No response at all → network/offline.
        if (!error.response) {
            return new ApiError(
                "NETWORK",
                "Can't reach the server. Check your connection.",
                0,
            );
        }
        // Some non-enveloped error (proxy, gateway, etc.).
        return new ApiError(
            "UNKNOWN",
            error.message || `Request failed (${error.response.status})`,
            error.response.status,
        );
    }
}

export function isApiError(e: unknown): e is ApiError {
    return e instanceof ApiError;
}

export function errorCode(e: unknown): ApiErrorCode | string {
    return isApiError(e) ? e.code : "UNKNOWN";
}

/** i18n key for an error code; screens do t(errorI18nKey(code), {defaultValue: err.message}). */
export function errorI18nKey(code: string): string {
    return `errors.${code}`;
}
