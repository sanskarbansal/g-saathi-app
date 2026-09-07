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

// ── Ordering on behalf of a kirana ("order for this shop") ───────────────────

/** A variant as returned by GET /field/stores/:storeId/catalog (subset the app uses). */
export interface CatalogVariant {
    id: string;
    name: string;
    sku: string;
    sellingPrice: number;
    mrp: number;
    images: string[] | null;
    unit: string | null;
    weight?: string | null;
    inStock: boolean;
    isDefault: boolean;
    maxQuantityPerOrder?: number | null;
    /** Segment/tier-resolved price for this store's owner (rupees); falls back to sellingPrice. */
    effectivePrice?: number;
    tiers?: { minQuantity: number; unitPrice: number }[];
    /**
     * Sellable pack hierarchy (Base / Inner / Outer …) when the hub has it configured.
     * `factorToBase` = base units per pack; `available` = whole packs in stock.
     */
    units?: CatalogUnit[];
}

export interface CatalogUnit {
    id: string;
    name: string;
    factorToBase: number;
    isBase: boolean;
    isSealed: boolean;
    sellable: boolean;
    sellingPrice: number | null;
    mrp: number | null;
    sortOrder: number;
    available?: number;
}

export interface CatalogProduct {
    id: string;
    name: string;
    slug: string;
    category: { id: string; name: string } | null;
    brand: { id: string; name: string } | null;
    variants: CatalogVariant[];
}

export interface CatalogQuery {
    search?: string;
    categoryId?: string;
    page?: number;
    limit?: number;
}

export interface CatalogPage {
    store: { id: string; shopName: string; warehouseId: string };
    products: CatalogProduct[];
    totalProducts: number;
    totalPages: number;
    currentPage: number;
    limit: number;
}

export interface OrderCartItem {
    productId: string;
    variantId: string;
    /** BASE units — packs are multiplied out before sending (2 cases × 12 = 24). */
    quantity: number;
    /** Informational: the pack the agent picked and how many of it. */
    unitId?: string;
    packQuantity?: number;
}

/** Buyer GST details for a B2B tax invoice (server validates checksum + state). */
export interface GstDetailsInput {
    gstin: string;
    legalName: string;
    tradeName?: string;
    address?: string;
}

export interface OrderPreviewLine {
    productId: string;
    variantId: string;
    quantity: number;
    mrp: number;
    basePrice: number;
    unitPrice: number;
    lineTotal: number;
    hasTierDiscount: boolean;
    /** Quantity-break ladder visible to this store (ascending by minQuantity). */
    tiers?: { minQuantity: number; unitPrice: number }[];
}

/** POST /field/stores/:storeId/orders/preview */
export interface OrderPreview {
    customerExists: boolean;
    items: OrderPreviewLine[];
    itemsTotal: number;
    itemsTotalAtBase: number;
    itemsMrpTotal: number;
    tierSavings: number;
    deliveryFee: number;
    freeDeliveryApplied: boolean;
    coupon: { code: string; applied: boolean; discount: number; message?: string } | null;
    discount: number;
    grandTotal: number;
    minOrderAmount: number;
    meetsMinimum: boolean;
}

export interface PlaceOrderInput {
    clientId: string;
    items: OrderCartItem[];
    couponCode?: string;
    sendPaymentLink?: boolean;
    notes?: string;
    invoiceType?: "b2b" | "b2c";
    gstDetails?: GstDetailsInput;
}

export type FieldOrderStatus =
    | "pending"
    | "confirmed"
    | "preparing"
    | "ready"
    | "picked_up"
    | "out_for_delivery"
    | "delivered"
    | "cancelled"
    | "returned";

export interface FieldOrderItem {
    productId: string;
    variantId: string;
    productName: string;
    variantName: string | null;
    productImage: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
}

export interface FieldOrder {
    id: string;
    orderNumber: string;
    clientId: string | null;
    storeId: string | null;
    status: FieldOrderStatus;
    paymentMethod: "cod" | "online";
    paymentStatus: "pending" | "completed" | "failed" | "refunded";
    subtotal: number;
    deliveryFee: number;
    discount: number;
    total: number;
    itemCount: number;
    placedAt: string;
    deliveredAt: string | null;
    estimatedDeliveryTime: string | null;
    invoiceType: "b2b" | "b2c";
    gstin: string | null;
    /** Who the order was for (from the delivery address). */
    customerName: string | null;
    customerPhone: string | null;
    /** Present on detail / place responses. */
    items?: FieldOrderItem[];
    paymentLink?: { url: string | null; status: string } | null;
}

export interface PlaceOrderResult {
    order: FieldOrder;
    idempotentReplay: boolean;
    paymentLink: { url: string | null; status: string } | null;
    skippedItems?: { productName: string; reason: string; requestedQuantity: number; availableQuantity: number }[];
    adjustedItems?: { productName: string; originalQuantity: number; adjustedQuantity: number }[];
}

export interface ListOrdersQuery {
    storeId?: string;
    /** "store" = portfolio kirana orders; "customer" = by-phone orders. */
    kind?: "store" | "customer";
    limit?: number;
    offset?: number;
}

// ── Ordering for ANY Groship customer by phone number ────────────────────────

/** A new delivery address the agent captures for a customer. */
export interface CustomerAddressInput {
    name?: string;
    label?: string;
    fullAddress: string;
    landmark?: string;
    pincode: string;
    city: string;
    state: string;
    mobileNumber?: string;
    latitude?: number;
    longitude?: number;
}

export interface CustomerAddress extends Required<Pick<CustomerAddressInput, "fullAddress" | "pincode" | "city" | "state">> {
    id: string;
    label: string;
    name: string;
    landmark: string | null;
    mobileNumber: string;
    isDefault: boolean;
    /** Hub serving this pin — null when outside every delivery radius. */
    warehouseId: string | null;
}

/** GET /field/customers/lookup?phone= */
export interface CustomerLookup {
    phone: string;
    customer: { id: string; name: string; phone: string; codAllowed: boolean } | null;
    addresses: CustomerAddress[];
    /** Set when the number is a kirana in THIS agent's portfolio — use the store flow instead. */
    store: { id: string; onboardingId: string; shopName: string } | null;
    zoneWarehouseId: string | null;
}

/**
 * Who an order is being built for. Drives which endpoints the catalog / preview / place
 * hooks call and what the checkout prefills.
 */
export type OrderTarget =
    | { kind: "store"; storeId: string; onboardingId: string }
    | {
          kind: "customer";
          phone: string;
          /** Required when the number has no Groship account yet. */
          customerName?: string;
          addressId?: string;
          address?: CustomerAddressInput;
      };

/** Stable key for a target — the cart is scoped to it. */
export function orderTargetKey(t: OrderTarget): string {
    return t.kind === "store" ? `store:${t.storeId}` : `phone:${t.phone.replace(/\D/g, "").slice(-10)}`;
}
