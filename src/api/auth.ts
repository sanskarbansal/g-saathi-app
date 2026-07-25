import { apiClient, unwrap } from "./client";
import type { AuthUser, RefreshResult, VerifyOtpResult } from "./types";

/** Auth endpoints (§4.1). Phone format: "+91 9876543210" (with the space). */
export const authApi = {
    /** POST /auth/send-otp → { success, message } */
    async sendOtp(phone: string): Promise<{ message?: string }> {
        const res = await apiClient.post("/auth/send-otp", { phone });
        return { message: (res.data as { message?: string }).message };
    },

    /** POST /auth/verify-otp → { verified, isNewUser, token, refreshToken, user } */
    verifyOtp(phone: string, otp: string): Promise<VerifyOtpResult> {
        return unwrap<VerifyOtpResult>(apiClient.post("/auth/verify-otp", { phone, otp }));
    },

    /** POST /auth/refresh → { token, refreshToken } */
    refresh(refreshToken: string): Promise<RefreshResult> {
        return unwrap<RefreshResult>(apiClient.post("/auth/refresh", { refreshToken }));
    },

    /** GET /auth/me → user */
    me(): Promise<AuthUser> {
        return unwrap<AuthUser>(apiClient.get("/auth/me"));
    },
};
