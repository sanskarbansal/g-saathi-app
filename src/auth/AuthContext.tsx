import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    fieldApi,
    isApiError,
    registerAuthFailureHandler,
    type FieldAgentProfile,
    type VerifyOtpResult,
} from "@/api";
import { queryClient } from "@/offline/queryClient";
import { tokenStore } from "./tokenStore";

export type SessionStatus =
    | "loading" // cold-start: validating a stored token
    | "unauthenticated" // show Login
    | "authenticated" // active field agent
    | "forbidden"; // valid user but NOT a field agent

interface AuthContextValue {
    status: SessionStatus;
    agent: FieldAgentProfile | null;
    error: string | null;
    /** Complete login after a successful verify-otp (stores tokens, gates on /field/me). */
    signInWithOtp: (result: VerifyOtpResult) => Promise<void>;
    signOut: () => Promise<void>;
    /** From the "not a field agent" screen back to the phone screen. */
    resetToLogin: () => void;
    /** Re-fetch /field/me (e.g. to reflect a lifetimePoints delta). */
    refreshAgent: () => Promise<FieldAgentProfile | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [status, setStatus] = useState<SessionStatus>("loading");
    const [agent, setAgent] = useState<FieldAgentProfile | null>(null);
    const [error, setError] = useState<string | null>(null);
    const mounted = useRef(true);

    const clearSession = useCallback(async () => {
        await tokenStore.clear();
        setAgent(null);
        queryClient.clear();
    }, []);

    /** Fetch /field/me and route: authenticated / forbidden / unauthenticated. */
    const gateOnAgent = useCallback(async (): Promise<void> => {
        try {
            const me = await fieldApi.getMe();
            if (!mounted.current) return;
            setAgent(me);
            setError(null);
            setStatus("authenticated");
        } catch (e) {
            if (!mounted.current) return;
            if (isApiError(e) && e.status === 403) {
                await clearSession();
                setStatus("forbidden");
                return;
            }
            // 401 / network / other → back to login (tokens cleared if 401).
            await clearSession();
            setStatus("unauthenticated");
        }
    }, [clearSession]);

    // Cold start: hydrate tokens and validate.
    useEffect(() => {
        mounted.current = true;
        (async () => {
            const { accessToken } = await tokenStore.hydrate();
            if (accessToken) {
                await gateOnAgent();
            } else {
                setStatus("unauthenticated");
            }
        })();
        return () => {
            mounted.current = false;
        };
    }, [gateOnAgent]);

    // When the client's refresh flow gives up (401 → refresh fail), drop to login.
    useEffect(() => {
        registerAuthFailureHandler(() => {
            setAgent(null);
            queryClient.clear();
            setStatus("unauthenticated");
        });
    }, []);

    const signInWithOtp = useCallback(
        async (result: VerifyOtpResult) => {
            await tokenStore.setTokens(result.token, result.refreshToken);
            setStatus("loading");
            await gateOnAgent();
        },
        [gateOnAgent],
    );

    const signOut = useCallback(async () => {
        await clearSession();
        setStatus("unauthenticated");
    }, [clearSession]);

    const resetToLogin = useCallback(() => {
        setError(null);
        setStatus("unauthenticated");
    }, []);

    const refreshAgent = useCallback(async () => {
        try {
            const me = await fieldApi.getMe();
            if (mounted.current) setAgent(me);
            return me;
        } catch {
            return null;
        }
    }, []);

    const value = useMemo(
        () => ({
            status,
            agent,
            error,
            signInWithOtp,
            signOut,
            resetToLogin,
            refreshAgent,
        }),
        [status, agent, error, signInWithOtp, signOut, resetToLogin, refreshAgent],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useSession(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useSession must be used within <AuthProvider>");
    return ctx;
}
