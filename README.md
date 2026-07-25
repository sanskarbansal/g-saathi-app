# Groship Saathi

The field-sales companion app for Groship field agents — onboard kirana (independent grocery) stores in one visit, track a balanced **Saathi Score**, and manage the store portfolio. Built with Expo + React Native + TypeScript, integrating the `g-backend` **Field Agent** API (`feature/field-agent-saathi`).

Android-first, offline-first, Hindi-default. One agent today; every screen and data flow is per-agent and generic so it scales to many agents (and a future manager view) with no rewrite.

---

## Quick start

```bash
# 1. Install
npm install --legacy-peer-deps

# 2. Configure the API base URL
cp .env.example .env
#   then edit .env — see "Pointing at the backend" below

# 3. Run
npx expo start          # press "a" for Android, or scan the QR in Expo Go
```

Type-check and test:

```bash
npm run typecheck       # tsc --noEmit  (strict)
npm test                # jest
```

---

## Pointing at the backend

The API base URL is read from `EXPO_PUBLIC_API_URL` (via `app.config.ts` → `extra.apiUrl` → `src/config/env.ts`). It is **never** hardcoded.

A phone/emulator can't reach the host's `localhost`, so use one of:

| Target | `EXPO_PUBLIC_API_URL` |
| --- | --- |
| Android emulator (AVD) | `http://10.0.2.2:3000/api/v1` |
| Physical device on same Wi-Fi | `http://<your-LAN-IP>:3000/api/v1` (e.g. `http://192.168.1.7:3000/api/v1`) |
| Tunnel (ngrok / cloudflared) | `https://<subdomain>/api/v1` |

Find your LAN IP with `ipconfig getifaddr en0` (macOS) or `ip addr` (Linux).

### Run the backend (`g-backend`, branch `feature/field-agent-saathi`)

```bash
npm run db:generate && npm run db:migrate   # create the field tables
npx tsx scripts/seed-field-agent.ts         # seed one agent + zone + default score config
npm run dev                                  # API at http://localhost:3000/api/v1
```

The seed prints the agent. **Default login phone: `+91 9990000001`.**

### Getting the OTP in dev

`POST /auth/send-otp` sends via the backend's configured SMS provider. In local/dev mode the OTP is written to the **backend server logs** (look for `[DEV] OTP for +91 9990000001: NNNNNN`). Enter that code on the OTP screen.

---

## What's built (M1–M7)

| Milestone | Screen(s) | Endpoint(s) |
| --- | --- | --- |
| **M1 Auth** | Phone → OTP (6-digit, autofill) → `/field/me` gate | `POST /auth/send-otp`, `POST /auth/verify-otp`, `POST /auth/refresh`, `GET /field/me` |
| **M2 Shell** | Bottom tabs (Home · Beat · ＋ · Score · Profile) + center Add-Kirana FAB | — |
| **M3 Home** | Saathi Score hero, today's counts (derived client-side), start-beat CTA | `GET /field/home`, `GET /field/onboardings` |
| **M4 Add Kirana** | 3-step modal: Details (photo + GPS) → KYC → Activation checklist → Success | `POST /field/onboardings`, `PATCH /field/onboardings/:id` |
| **M5 My Stores** | Beat tab: portfolio, filters, health chips, detail + continue activation | `GET /field/stores`, `GET /field/onboardings/:id` |
| **M6 Score** | Balanced scorecard: ring + 4 pillars, month switcher | `GET /field/score?period=YYYY-MM` |
| **M7 Profile** | Employee code, zone, level, points, base salary, language, logout | `GET /field/me` |

Auth gate: after verify-otp the app calls `GET /field/me`. A **403** ("not a field agent") signs the user out with a clear message.

## Key behaviors

- **Offline-first onboarding.** A `clientId` (UUID v4) is generated when the Add-Kirana flow opens. Creating a shop offline enqueues a durable mutation (persisted to AsyncStorage) and the shop shows immediately as **"saved · syncing"**. On reconnect it POSTs exactly once — the endpoint is idempotent on `clientId`, so a retry returns the same record (200) and never double-creates. Duplicate-phone (409) is surfaced for the agent to resolve.
- **Stale-while-revalidate reads.** Home / Beat / Score are served from a persisted React Query cache (AsyncStorage), so the app is usable with no signal. `onlineManager` is wired to NetInfo.
- **Auth & security.** Tokens live **only** in `expo-secure-store` (never AsyncStorage). Every field request attaches `Bearer`; a 401 triggers a single refresh-and-retry, and if that fails the session is cleared → Login.
- **Forward-only funnel.** Activation steps advance `profile_created → app_installed → khata_imported → first_order`; backward transitions are hidden and the 400 is handled defensively.
- **Verified order attribution (no self-reported money).** Adding an order (activation "first order" step, and Store Detail "Add order") calls `POST /field/onboardings/:id/order` with the **order number** — never an amount. The backend looks the order up in the `orders` table and only credits it if it's real, **paid/delivered** (not cancelled/returned/failed), its **delivery phone matches the onboarded shop**, and it **hasn't already been attributed** (deduped per order id, globally). It then emits `revenue` with the order's **real `total`** plus `first_order`/`repeat_order`, dated to the order. Agents can't inflate GMV — the amount comes from the system of record, and to "fake" one you'd need a real paid order to the shop's own phone to exist. Events carry the order number/id (`source: "verified_order"`) for audit. (Kirana orders live in the consumer `orders` table — the shops are the consumers — matched to the onboarded shop by phone. `REPEAT_RATE_MIN_BASE` still smooths the repeat pillar.)
- **i18n.** Hindi (default) + English, device-locale detected; switch in Profile. Every string goes through the i18n layer.

---

## Project structure

```
src/
  api/          client (axios + Bearer + 401 refresh), typed endpoints, zod schemas, errors
  auth/         SecureStore token store, AuthContext (session gate)
  offline/      QueryClient + AsyncStorage persister, NetInfo online-manager, durable mutation queue
  theme/        brand tokens (§3), Inter fonts, ThemeProvider
  ui/           Screen, Card, Button, Pill, StatTile, ProgressBar, Ring, Field, ListRow, Header, HeroHeader, Skeleton, EmptyState, Segmented …
  navigation/   RootNavigator (session-gated), AppTabs + custom TabBar, Add-Kirana modal stack, Auth stack
  features/
    auth/         PhoneScreen, OtpScreen, ForbiddenScreen
    home/         HomeScreen
    onboarding/   Add-Kirana wizard (Details/KYC/Activation/Success) + hooks + ActivationChecklist
    stores/       BeatScreen, StoreDetailScreen, StoreRow, StageBadge
    score/        ScoreScreen, PillarRow
    profile/      ProfileScreen
    queries.ts    shared React Query hooks + merged "beat" list
  config/       env.ts (API_URL), hubs.ts (stub hub list)
  i18n/         en.json, hi.json, index.ts
__tests__/      api client (envelope + error mapping), offline queue, Score screen
```

---

## Deferred / TODO (need backend that doesn't exist yet — flagged per §10)

These are intentionally **not** built (no endpoint in the field contract). Navigation leaves room for them:

- **Leaderboard, rewards/redeem, badges, streaks, earnings/incentive slabs** — no backend. Profile shows a disabled "Rewards — Coming soon" slot; a Rewards tab can drop into `TabBar`/`AppTabs` later.
- **Storefront photo upload** — there's no upload endpoint. We capture the photo, compute `storefrontPhotoHash`, keep a local URI, and send the **hash only**. Wire the real file upload + `storefrontPhotoUrl` when the endpoint exists (`src/utils/capture.ts`).
- **Nearest-hub list** — no hubs/warehouses endpoint in the field contract, so `src/config/hubs.ts` is a **stub** (Bhiwani hubs with `warehouseId: null`). The picker is display-only; a real `warehouseId` is only sent once hubs carry real ids.
- **Per-day stats** — no per-day endpoint, so Home's "today" counts are derived client-side from `/field/onboardings` (`createdAt` / `appInstalledAt` = today).
- **Send install link** — a device WhatsApp deep-link (`Linking`), no backend call; the owner is marked installed via `PATCH stage=app_installed`.

---

## Notes

- Package versions are pinned to **Expo SDK 54 / RN 0.81 / React 19** to match the existing `g-mobile-app`. `npm install` uses `--legacy-peer-deps` for the React 19 peer graph.
- `npm test` runs with `--forceExit` (RN/React-Query background timers keep the Node process alive otherwise).
- Tests cover the API client (envelope + error-code mapping), the offline onboarding queue (queue-offline → flush-once, 409 handling, transient retry), and the Score screen rendering its four pillars.
