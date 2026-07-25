/**
 * API types — mirror the g-backend `feature/field-agent-saathi` contract EXACTLY
 * (see src/routes/fieldAgent.routes.ts, src/services/field*.service.ts). No
 * endpoint or field is invented here.
 */

// ── Envelope ────────────────────────────────────────────────────────────────
export interface ApiSuccess<T> {
    success: true;
    data: T;
    message?: string;
}
export interface ApiErrorBody {
    code: string;
    message: string;
    details?: unknown;
}
export interface ApiFailure {
    success: false;
    error: ApiErrorBody;
}
export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

/** Known server error codes (see error.middleware + auth.service). */
export type ApiErrorCode =
    | "VALIDATION_ERROR" // 400
    | "UNAUTHORIZED" // 401
    | "FORBIDDEN" // 403 — not an active field agent
    | "NOT_FOUND" // 404
    | "CONFLICT" // 409 — duplicate store phone
    | "INTERNAL_ERROR" // 500
    | "INVALID_OTP" // 400
    | "OTP_EXPIRED" // 400
    | "NETWORK" // client-side: no response
    | "UNKNOWN";

// ── Auth ────────────────────────────────────────────────────────────────────
export interface AuthUser {
    id: string;
    name: string | null;
    email: string | null;
    phone: string;
    role: string | null;
    avatarUrl: string | null;
}

export interface VerifyOtpResult {
    verified: boolean;
    isNewUser: boolean;
    token: string;
    refreshToken: string;
    user: AuthUser;
}

export interface RefreshResult {
    token: string;
    refreshToken: string;
}

// ── Field agent ─────────────────────────────────────────────────────────────
export type FieldAgentStatus = "active" | "inactive" | "suspended";

/** GET /field/me and the `agent` in GET /field/home. */
export interface FieldAgentProfile {
    id: string;
    employeeCode: string;
    zoneId: string | null;
    currentLevel: number;
    lifetimePoints: number;
    status: FieldAgentStatus | string;
    baseMonthlySalary: number;
}

export interface HomeData {
    agent: FieldAgentProfile;
    score: { saathiScore: number; scoreMax: number };
}

// ── Onboarding funnel ───────────────────────────────────────────────────────
export const ONBOARDING_STAGES = [
    "draft",
    "profile_created",
    "app_installed",
    "khata_imported",
    "first_order",
    "active",
] as const;
export type OnboardingStage = (typeof ONBOARDING_STAGES)[number];

/** Stages reachable via PATCH (draft is create-only). */
export type AdvanceableStage = Exclude<OnboardingStage, "draft">;

export type OnboardingSource = "field" | "referral";

/** store_onboardings row. Numeric GPS columns arrive as strings from Postgres. */
export interface StoreOnboarding {
    id: string;
    clientId: string;
    storeId: string | null;
    agentId: string;
    zoneId?: string | null;
    stage: OnboardingStage;
    source: OnboardingSource | string;
    storefrontPhotoUrl?: string | null;
    storefrontPhotoHash?: string | null;
    gpsLat?: string | null;
    gpsLng?: string | null;
    gpsAccuracyM?: number | null;
    profileCompletedAt?: string | null;
    appInstalledAt?: string | null;
    khataImportedAt?: string | null;
    firstOrderAt?: string | null;
    activatedAt?: string | null;
    lastVisitedAt?: string | null;
    visitCount?: number;
    createdAt: string;
    updatedAt: string;
}

/** kirana_stores row (subset the app reads). */
export interface KiranaStore {
    id: string;
    shopName: string;
    ownerName?: string | null;
    phone: string;
    upiVpa?: string | null;
    gstin?: string | null;
    language: string;
    warehouseId?: string | null;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
}

export type ChecklistStep = "app_installed" | "khata_imported" | "first_order";
export interface ChecklistItem {
    step: ChecklistStep;
    done: boolean;
}

export interface CreateOnboardingResult {
    onboarding: StoreOnboarding;
    store: KiranaStore | null;
    checklist: ChecklistItem[];
    idempotentReplay: boolean;
}

export interface OnboardingDetail {
    onboarding: StoreOnboarding;
    store: KiranaStore | null;
    checklist: ChecklistItem[];
}

export interface UpdateOnboardingResult {
    onboarding: StoreOnboarding;
    checklist: ChecklistItem[];
}

/** POST /field/onboardings/:id/order result — a verified, attributed order. */
export interface AttributeOrderResult {
    onboarding: StoreOnboarding;
    checklist: ChecklistItem[];
    order: { kind: "first" | "repeat"; orderNumber: string; amount: number };
}

/** GET /field/stores rows. */
export interface StorePortfolioItem {
    storeId: string | null;
    shopName: string | null;
    phone: string | null;
    stage: OnboardingStage;
    appInstalled: boolean;
    firstOrder: boolean;
}

// ── Saathi Score ────────────────────────────────────────────────────────────
export type PillarKey = "stores" | "activations" | "revenue" | "repeat";

/** stores / activations / revenue pillars use actual + target. */
export interface CountPillar {
    key: "stores" | "activations" | "revenue";
    actual: number;
    target: number;
    weightPct: number;
    points: number;
}
/** repeat pillar uses percentages. */
export interface RepeatPillar {
    key: "repeat";
    actualPct: number;
    targetPct: number;
    weightPct: number;
    points: number;
}
export type ScorePillar = CountPillar | RepeatPillar;

export interface ScoreBreakdown {
    period: string; // YYYY-MM
    saathiScore: number;
    scoreMax: number;
    pillars: ScorePillar[];
}

// ── Request payloads ────────────────────────────────────────────────────────
export interface Gps {
    lat: number;
    lng: number;
    accuracyM?: number;
}

export interface CreateOnboardingInput {
    clientId: string; // UUID v4 — offline idempotency key
    shopName: string;
    phone: string; // "+91 9876543210"
    ownerName?: string;
    language?: string;
    upiVpa?: string;
    gstin?: string;
    warehouseId?: string;
    gps?: Gps;
    storefrontPhotoUrl?: string;
    storefrontPhotoHash?: string;
}

export interface UpdateOnboardingInput {
    ownerName?: string;
    upiVpa?: string;
    gstin?: string;
    language?: string;
    warehouseId?: string;
    storefrontPhotoUrl?: string;
    stage?: AdvanceableStage;
}

export interface ListOnboardingsQuery {
    stage?: OnboardingStage;
    limit?: number;
    offset?: number;
}

/** Body for attributing a real order — the order NUMBER, never an amount. */
export interface AttributeOrderInput {
    orderNumber: string;
}

/** A single foreground GPS breadcrumb the app reports to POST /field/location. */
export interface LocationPingInput {
    lat: number;
    lng: number;
    accuracyM?: number;
    recordedAt: string; // ISO 8601 device fix time
}

/** POST /field/location response — how many breadcrumbs were accepted. */
export interface RecordLocationResult {
    accepted: number;
}

export type VisitOutcome =
    | "met_owner"
    | "order_taken"
    | "shop_closed"
    | "owner_absent"
    | "not_interested"
    | "other";

/** POST /field/visits body — a GPS-verified store check-in. */
export interface LogVisitInput {
    clientId: string;
    storeId: string;
    outcome: VisitOutcome;
    note?: string;
    gps: { lat: number; lng: number; accuracyM?: number };
    visitedAt?: string;
}

/** A logged store visit (GET /field/visits row). */
export interface StoreVisit {
    id: string;
    storeId: string;
    shopName?: string | null;
    outcome: VisitOutcome | string;
    note?: string | null;
    distanceM?: number | null;
    visitedAt: string;
}

/** POST /field/visits response. */
export interface LogVisitResult {
    visit: { id: string; storeId: string; outcome: string; visitedAt: string };
    distanceM?: number | null;
    idempotentReplay?: boolean;
}

/** One store on the day's beat (GET /field/beat). */
export interface BeatStoreItem {
    onboardingId: string;
    storeId: string;
    shopName: string;
    phone: string | null;
    address?: unknown;
    stage: OnboardingStage;
    gps: { lat: number; lng: number } | null;
    lastVisitedAt?: string | null;
    source: "auto" | "self" | "manager" | string;
    reason: "due" | "planned" | string;
    visited: boolean;
}

/** GET /field/beat response — the agent's beat for a day. */
export interface BeatDay {
    date: string;
    total: number;
    pending: number;
    visited: number;
    stores: BeatStoreItem[];
}
