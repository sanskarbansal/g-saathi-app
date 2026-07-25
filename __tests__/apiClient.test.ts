import type { AxiosError } from "axios";

import { ApiError, errorI18nKey, isApiError, unwrap } from "@/api";
import en from "@/i18n/en.json";

describe("ApiError.fromAxios — envelope + error mapping", () => {
    it("maps an enveloped 409 CONFLICT to a typed ApiError", () => {
        const axiosErr = {
            response: {
                status: 409,
                data: {
                    success: false,
                    error: { code: "CONFLICT", message: "A store with this phone already exists" },
                },
            },
            message: "Request failed with status code 409",
        } as unknown as AxiosError;

        const err = ApiError.fromAxios(axiosErr);
        expect(isApiError(err)).toBe(true);
        expect(err.code).toBe("CONFLICT");
        expect(err.status).toBe(409);
        expect(err.message).toMatch(/already exists/);
    });

    it("maps a missing response to a NETWORK error", () => {
        const axiosErr = { message: "Network Error" } as AxiosError;
        const err = ApiError.fromAxios(axiosErr);
        expect(err.code).toBe("NETWORK");
        expect(err.status).toBe(0);
    });

    it("maps a non-enveloped 500 to UNKNOWN with the status", () => {
        const axiosErr = {
            response: { status: 500, data: "<html>gateway</html>" },
            message: "Request failed with status code 500",
        } as unknown as AxiosError;
        const err = ApiError.fromAxios(axiosErr);
        expect(err.code).toBe("UNKNOWN");
        expect(err.status).toBe(500);
    });
});

describe("unwrap", () => {
    it("returns the inner data of the success envelope", async () => {
        const res = { data: { success: true, data: { hello: "world" } } };
        await expect(unwrap<{ hello: string }>(Promise.resolve(res as never))).resolves.toEqual({
            hello: "world",
        });
    });
});

describe("errorI18nKey", () => {
    it("produces keys that exist in the translations", () => {
        const codes = [
            "VALIDATION_ERROR",
            "UNAUTHORIZED",
            "FORBIDDEN",
            "NOT_FOUND",
            "CONFLICT",
            "INTERNAL_ERROR",
            "NETWORK",
            "UNKNOWN",
        ] as const;
        for (const code of codes) {
            expect(errorI18nKey(code)).toBe(`errors.${code}`);
            // Every mapped code has a human string.
            expect((en.errors as Record<string, string>)[code]).toBeTruthy();
        }
    });
});
