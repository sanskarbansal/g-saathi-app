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
    CatalogPage,
    CatalogQuery,
    OrderCartItem,
    OrderPreview,
    PlaceOrderInput,
    PlaceOrderResult,
    FieldOrder,
    ListOrdersQuery,
    CustomerLookup,
    OrderTarget,
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
     * POST /field/onboardings/:id/photo — upload the storefront photo captured
     * during onboarding (multipart/form-data, field name "file"). Called right
     * after the create succeeds, and again when an offline create later syncs.
     * The backend stores the image and persists its URL on the onboarding, which
     * is what the admin / field-force console then displays.
     */
    uploadStorefrontPhoto(id: string, photoUri: string): Promise<UpdateOnboardingResult> {
        const name = photoUri.split("/").pop() || "storefront.jpg";
        const lower = name.toLowerCase();
        const type = lower.endsWith(".png")
            ? "image/png"
            : lower.endsWith(".webp")
              ? "image/webp"
              : "image/jpeg";

        const form = new FormData();
        // React Native's FormData accepts a { uri, name, type } file part; the DOM
        // FormData typings don't, so cast for the multipart upload.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        form.append("file", { uri: photoUri, name, type } as any);

        return unwrap<UpdateOnboardingResult>(
            apiClient.post(`/field/onboardings/${id}/photo`, form, {
                headers: { "Content-Type": "multipart/form-data" },
                timeout: 60000,
            }),
        );
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

    // ── Ordering on behalf of a kirana ──

    /** GET /field/stores/:storeId/catalog — the hub catalog that serves this store. */
    getStoreCatalog(storeId: string, query: CatalogQuery = {}): Promise<CatalogPage> {
        return unwrap<CatalogPage>(apiClient.get(`/field/stores/${storeId}/catalog`, { params: query }));
    },

    /** POST /field/stores/:storeId/orders/preview — read-only pricing for the cart. */
    previewOrder(storeId: string, items: OrderCartItem[], couponCode?: string): Promise<OrderPreview> {
        return unwrap<OrderPreview>(
            apiClient.post(`/field/stores/${storeId}/orders/preview`, { items, couponCode: couponCode || undefined }),
        );
    },

    /**
     * POST /field/stores/:storeId/orders — place a COD order for the shop. Idempotent on
     * `clientId`: 201 on create, 200 on replay (both carry `idempotentReplay`).
     */
    placeOrder(storeId: string, body: PlaceOrderInput): Promise<PlaceOrderResult> {
        return unwrap<PlaceOrderResult>(apiClient.post(`/field/stores/${storeId}/orders`, body));
    },

    // ── Ordering for ANY customer by phone number ──

    /** GET /field/customers/lookup?phone= */
    lookupCustomer(phone: string): Promise<CustomerLookup> {
        return unwrap<CustomerLookup>(apiClient.get("/field/customers/lookup", { params: { phone } }));
    },

    /** Catalog for either kind of target (store → /stores/:id/catalog, customer → /customers/catalog). */
    getCatalog(target: OrderTarget, query: CatalogQuery = {}): Promise<CatalogPage> {
        if (target.kind === "store") return this.getStoreCatalog(target.storeId, query);
        return unwrap<CatalogPage>(
            apiClient.get("/field/customers/catalog", { params: { ...query, phone: target.phone, addressId: target.addressId } }),
        );
    },

    /** Preview for either kind of target. */
    previewFor(target: OrderTarget, items: OrderCartItem[], couponCode?: string): Promise<OrderPreview> {
        if (target.kind === "store") return this.previewOrder(target.storeId, items, couponCode);
        return unwrap<OrderPreview>(
            apiClient.post("/field/customers/orders/preview", {
                phone: target.phone,
                customerName: target.customerName,
                addressId: target.addressId,
                address: target.address,
                items,
                couponCode: couponCode || undefined,
            }),
        );
    },

    /** Place for either kind of target (same idempotency on clientId). */
    placeFor(target: OrderTarget, body: PlaceOrderInput): Promise<PlaceOrderResult> {
        if (target.kind === "store") return this.placeOrder(target.storeId, body);
        return unwrap<PlaceOrderResult>(
            apiClient.post("/field/customers/orders", {
                ...body,
                phone: target.phone,
                customerName: target.customerName,
                addressId: target.addressId,
                address: target.address,
            }),
        );
    },

    /** GET /field/orders?storeId= — orders this agent placed, newest first. */
    listOrders(query: ListOrdersQuery = {}): Promise<FieldOrder[]> {
        return unwrap<FieldOrder[]>(apiClient.get("/field/orders", { params: query }));
    },

    /** GET /field/orders/:orderId — one order with lines + payment-link state. */
    getOrder(orderId: string): Promise<FieldOrder> {
        return unwrap<FieldOrder>(apiClient.get(`/field/orders/${orderId}`));
    },

    /** POST /field/orders/:orderId/payment-link — SMS the owner a prepay link. */
    sendOrderPaymentLink(orderId: string): Promise<{ status: string; shortUrl: string | null; reused?: boolean }> {
        return unwrap(apiClient.post(`/field/orders/${orderId}/payment-link`));
    },
};
