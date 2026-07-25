import { apiClient, unwrap } from "./client";
import type {
    CreateOnboardingInput,
    CreateOnboardingResult,
    FieldAgentProfile,
    HomeData,
    ListOnboardingsQuery,
    AttributeOrderInput,
    AttributeOrderResult,
    OnboardingDetail,
    ScoreBreakdown,
    StoreOnboarding,
    StorePortfolioItem,
    UpdateOnboardingInput,
    UpdateOnboardingResult,
    LocationPingInput,
    RecordLocationResult,
    LogVisitInput,
    LogVisitResult,
    StoreVisit,
    BeatDay,
} from "./types";

/**
 * Field-agent endpoints (§4.2). All require a Bearer token for an ACTIVE
 * field agent — a non-agent receives 403 FORBIDDEN.
 */
export const fieldApi = {
    /** GET /field/me */
    getMe(): Promise<FieldAgentProfile> {
        return unwrap<FieldAgentProfile>(apiClient.get("/field/me"));
    },

    /** GET /field/home */
    getHome(): Promise<HomeData> {
        return unwrap<HomeData>(apiClient.get("/field/home"));
    },

    /** GET /field/onboardings?stage=&limit=&offset= (newest first) */
    listOnboardings(query: ListOnboardingsQuery = {}): Promise<StoreOnboarding[]> {
        return unwrap<StoreOnboarding[]>(
            apiClient.get("/field/onboardings", { params: query }),
        );
    },

    /**
     * POST /field/onboardings — idempotent on `clientId`. 201 on create, 200 on
     * idempotent replay (both carry `idempotentReplay`), 409 on duplicate phone.
     */
    createOnboarding(body: CreateOnboardingInput): Promise<CreateOnboardingResult> {
        return unwrap<CreateOnboardingResult>(apiClient.post("/field/onboardings", body));
    },

    /** GET /field/onboardings/:id */
    getOnboarding(id: string): Promise<OnboardingDetail> {
        return unwrap<OnboardingDetail>(apiClient.get(`/field/onboardings/${id}`));
    },

    /** PATCH /field/onboardings/:id — KYC edits and/or a forward-only stage advance. */
    updateOnboarding(
        id: string,
        body: UpdateOnboardingInput,
    ): Promise<UpdateOnboardingResult> {
        return unwrap<UpdateOnboardingResult>(apiClient.patch(`/field/onboardings/${id}`, body));
    },

    /**
     * POST /field/onboardings/:id/order — attribute a real Groship order to the
     * shop by its order NUMBER. No amount: the backend verifies the order and
     * credits its real total. Errors: 404 not found, 400 not-paid, 403 phone
     * mismatch.
     */
    attributeOrder(id: string, body: AttributeOrderInput): Promise<AttributeOrderResult> {
        return unwrap<AttributeOrderResult>(apiClient.post(`/field/onboardings/${id}/order`, body));
    },

    /** GET /field/stores — the agent's portfolio with basic health. */
    listStores(): Promise<StorePortfolioItem[]> {
        return unwrap<StorePortfolioItem[]>(apiClient.get("/field/stores"));
    },

    /** GET /field/score?period=YYYY-MM (defaults to current month). */
    getScore(period?: string): Promise<ScoreBreakdown> {
        return unwrap<ScoreBreakdown>(
            apiClient.get("/field/score", { params: period ? { period } : {} }),
        );
    },

    /**
     * POST /field/location — report a batch of foreground GPS breadcrumbs. Best-effort
     * / fire-and-forget on the client; the backend persists the trail, updates the
     * agent's last-known position, and fans it out to admin dashboards.
     */
    sendLocation(points: LocationPingInput[]): Promise<RecordLocationResult> {
        return unwrap<RecordLocationResult>(apiClient.post("/field/location", { points }));
    },

    /** POST /field/visits — log a GPS-verified store check-in (hard-geofenced server-side). */
    logVisit(body: LogVisitInput): Promise<LogVisitResult> {
        return unwrap<LogVisitResult>(apiClient.post("/field/visits", body));
    },

    /** GET /field/visits — visit history (optionally by store / window). */
    listVisits(
        params: { storeId?: string; from?: string; to?: string; limit?: number } = {},
    ): Promise<StoreVisit[]> {
        return unwrap<StoreVisit[]>(apiClient.get("/field/visits", { params }));
    },

    /** GET /field/beat?date=YYYY-MM-DD — the day's stores to cover (auto-due + planned). */
    getBeat(date?: string): Promise<BeatDay> {
        return unwrap<BeatDay>(apiClient.get("/field/beat", { params: date ? { date } : {} }));
    },

    /** POST /field/beat/stores — add a store to a day's beat. */
    addBeatStore(storeId: string, date?: string): Promise<BeatDay> {
        return unwrap<BeatDay>(apiClient.post("/field/beat/stores", { storeId, date }));
    },

    /** PATCH /field/beat/stores — skip (drop) or re-pend a store for the day. */
    updateBeatStore(storeId: string, status: "pending" | "skipped", date?: string): Promise<BeatDay> {
        return unwrap<BeatDay>(apiClient.patch("/field/beat/stores", { storeId, status, date }));
    },
};
