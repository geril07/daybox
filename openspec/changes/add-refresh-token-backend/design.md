## Context

DayBox is a local-first Pomodoro + task planner SPA. All user data lives in `localStorage`; the only cloud integration is an optional, manual Google Drive backup that writes a visible `daybox.json` to the user's My Drive root. The current OAuth integration uses Google Identity Services' (GIS) **implicit flow**: a token client mints short-lived access tokens (~1 hour) and tries to reacquire them silently via `prompt:''`. There is no refresh token.

That silent reacquisition is increasingly unreliable. Browsers with strict third-party cookie restrictions, Intelligent Tracking Prevention (ITP), or partitioned storage block the GIS session check that `prompt:''` depends on, even when the user is still signed in to Google. Users see a "reconnect" prompt instead of their backup working. The recent `remember-google-drive-connection` change tolerated expired tokens in the UI, but the underlying reacquisition mechanism is still the fragile GIS implicit flow.

Deploy target: Vercel. The repo is a single Vite SPA with no server today.

## Goals / Non-Goals

**Goals:**

- Reliable silent backup/restore across browser sessions, without bouncing the user back through consent when they're still signed in to Google.
- A stateless backend with no database — the server is a pure OAuth bridge.
- The refresh token never reaches the SPA; access tokens are held in memory only.
- One auth path to maintain (hard cutover, no implicit-flow fallback).
- Deploys on Vercel's free serverless tier with no managed add-ons.
- Existing connected users keep their `daybox.json` file pointer after the one-time reconnect.

**Non-Goals:**

- Cross-device / cross-browser session persistence (cookie is scoped to the browser that connected).
- Server-side scheduled backups (would require a database + user data at rest).
- Multi-account / account switcher.
- Token-encryption-key rotation tooling (rotation invalidates sessions; users reconnect).
- Telemetry, logging, or rate-limiting on `/api/auth/*` beyond Vercel platform defaults.

## Decisions

### 1. Authorization Code + PKCE, not implicit flow

**Decision:** Migrate to the Authorization Code + PKCE flow with a server-side exchange.

**Why:** The implicit flow cannot issue refresh tokens — by design, it returns access tokens directly to the browser. Every silent reacquisition therefore depends on a browser-mediated Google session check (`prompt:''`), which is exactly what strict privacy defaults now block. The Auth Code + PKCE flow issues a refresh token that the server can exchange for new access tokens on demand, independent of browser cookie behavior. PKCE protects the code exchange even though we use a client secret (defense in depth; standard practice for web apps).

**Alternatives considered:**

- _Keep implicit flow, improve UX around failures:_ doesn't fix the root cause. Users still bounce to reconnect in hostile browsers. Rejected.
- _GIS `prompt:none` / `select_account` tuning:_ the failure is the session-check mechanism itself, not the prompt value. Rejected.

### 2. Stateless encrypted cookie, no database

**Decision:** Store the refresh token encrypted (AES-256-GCM) in a long-lived `__Host-db_rt` HttpOnly cookie. No Vercel KV, no Postgres.

**Why:** The stated motivation is reliable silent refresh in the same browser, not cross-device or scheduled backups. A cookie-scoped session is the smallest surface that solves that. Zero DB ops, zero managed add-ons, trivially fits Vercel serverless. The server holds no user data outside of request-scoped cookies — preserving DayBox's local-first ethos.

**Alternatives considered:**

- _Vercel KV keyed by session id:_ leaves the door open for cross-device/scheduled features later, but adds a managed dependency and env vars for a feature we explicitly aren't building. YAGNI.
- _Vercel Postgres sessions table:_ heaviest setup, most flexible, maximum YAGNI for a solo local-first app.

### 3. AES-256-GCM with a 32-byte env-var key

**Decision:** Seal the cookie payload with AES-256-GCM using `TOKEN_ENC_KEY` (32-byte hex). Random nonce per seal; auth tag bundled with ciphertext. Tampering fails decryption.

**Why:** GCM is authenticated encryption — the cookie is both confidential and integrity-protected. Node `crypto` has it built-in (no deps). The `__Host-` prefix enforces `Secure` + `Path=/` + no `Domain`, preventing subdomain injection. Key rotation invalidates all sessions, which is acceptable (users reconnect) and keeps the crypto simple.

**Alternatives considered:**

- _HMAC-signed but not encrypted:_ the refresh token would be readable by the user. Weaker for no real gain.
- _Key wrapping / envelope encryption for rotation:_ adds complexity for a solo app. Deferred explicitly (non-goal).

### 4. Single catch-all Hono app under `api/auth/*`

**Decision:** One Hono app at `api/auth/[[...route]].ts` mounting all five endpoints, with shared helpers in `api/lib/` (encrypt, cookies, google). One TypeScript project reference for `api/` (Node types, no DOM lib).

**Why:** One place for env reads, one place for crypto, one `app.request()` test seam. Hono is web-standard, tiny, and works natively on Vercel serverless and in vitest via `app.request()` — no HTTP server, no Vercel emulation in tests. A catch-all avoids per-route file boilerplate and keeps routing declarative.

**Alternatives considered:**

- _Per-route files (`start.ts`, `callback.ts`, …):_ more Vercel-native, but duplicates env reads and crypto wiring across files, and complicates the test seam.
- _Plain `export async function handler` per file:_ zero deps but reinvents routing, JSON parsing, and test ergonomics.
- _Express/Fastify:_ heavier, not web-standard, more boilerplate for five endpoints.

### 5. Hard cutover, no implicit-flow fallback

**Decision:** Remove `loadGoogleIdentityScript`, `createTokenClient`, `VITE_GOOGLE_CLIENT_ID`, and the `prompt:''` reacquisition path entirely. Existing connected users reconnect once.

**Why:** Two auth paths is double the test surface and a constant source of "which flow am I on" bugs. The reconnect is one click; the `dayboxFileId` survives in localStorage so the user's existing `daybox.json` is reused, not duplicated. The persistence migration (v2) clears stale `accessToken`/`expiresAt`/`email` on rehydrate, so old state can't leak into the new flow.

**Alternatives considered:**

- _Keep implicit flow as a fallback when `GOOGLE_CLIENT_SECRET` is unset:_ ships safely without forcing reconnect, but doubles maintenance and test surface for a bridge we're trying to delete.

### 6. Redirect URI derived from request origin

**Decision:** Compute `redirect_uri` as `<request origin>/api/auth/callback` at request time. No `GOOGLE_REDIRECT_URI` env var.

**Why:** Preview deploys get their own origin automatically; no per-env env-var to drift. The one requirement is that each preview origin be added to Google's Authorized redirect URIs (a Google-side constraint, not something the app can work around).

**Alternatives considered:**

- _`GOOGLE_REDIRECT_URI` env var per environment:_ drift-prone, especially across Vercel preview URLs.

### 7. SPA access-token cache is in-memory only

**Decision:** The store keeps `{ accessToken, expiresAt }` in non-persisted runtime state. `ensureActionToken()` calls `/api/auth/refresh` when the cache is empty or within 60s of expiry.

**Why:** Access tokens are short-lived and cheap to refresh; persisting them to localStorage reintroduces the "stale token in storage" class of bugs. The refresh-token cookie is the durable credential; the access token is a memoization of the last refresh.

**Alternatives considered:**

- _Persist access token to localStorage:_ reintroduces stale-token bugs and gains nothing (refresh is one cheap call).

### 8. Local dev: `dev` stays Vite, `dev:full` is `vercel dev`

**Decision:** Keep `npm run dev` as plain Vite for fast UI-only HMR. Add `npm run dev:full` = `vercel dev` for full-stack (SPA + API + cookies + OAuth). `vercel dev` serves on port 3000; Google OAuth redirect URIs must include `http://localhost:3000/api/auth/callback`.

**Why:** Most UI work doesn't touch the OAuth flow; forcing every UI iteration through `vercel dev` would slow HMR. The OAuth flow is exercised via `dev:full` or via the server-side vitest suite.

**Alternatives considered:**

- _Switch `dev` to `vercel dev` entirely:_ regresses HMR speed for all UI work.

## Risks / Trade-offs

- **[Risk] Google refresh tokens expire after 6 months of inactivity or on explicit revocation.** → Mitigation: `/api/auth/refresh` returns 401 on `invalid_grant`; the SPA maps this to the existing `token-expired` reconnect message. Users reconnect in one click. The `dayboxFileId` survives, so no duplicate file.
- **[Risk] `TOKEN_ENC_KEY` rotation invalidates all sessions.** → Mitigation: documented as a known operational consequence. Users reconnect. Accepted trade-off for crypto simplicity.
- **[Risk] Cookie cleared by browser storage wipe → user appears disconnected.** → Mitigation: `/api/auth/status` returns `connected: false`; SPA shows the Connect button. This is the correct UX — no silent corruption.
- **[Risk] Vercel preview deploys fail OAuth unless each preview origin is in Google's Authorized redirect URIs.** → Mitigation: documented in the rollout checklist. This is a Google-side constraint; the app derives the redirect URI correctly, but Google must allow it.
- **[Risk] `__Host-` prefix requires HTTPS (won't work on `http://localhost`).** → Mitigation: `vercel dev` serves HTTPS or Vercel proxies locally; for the cookie attributes, we conditionally relax `Secure` only when the request origin is `http://localhost` so local dev works. (Production always uses HTTPS.)
- **[Trade-off] One-time reconnect for existing users.** → Accepted. The `dayboxFileId` is preserved so the reconnect reuses the existing backup file; no data loss.
- **[Trade-off] No cross-device persistence.** → Accepted per the stated motivation. A future database-backed session store would unlock this; deliberately deferred.
- **[Trade-off] Server is a new operational surface.** → Minimized: five endpoints, one Hono app, no database, no background jobs. Failure modes are all observable from the SPA via the existing error-kind taxonomy.

## Migration Plan

1. **Pre-deploy:**
   - Generate `TOKEN_ENC_KEY`: `openssl rand -hex 32`.
   - In Google Cloud Console, add `http://localhost:3000/api/auth/callback`, preview origins (`https://<project>-<branch>.vercel.app/api/auth/callback`), and the production origin (`https://<domain>/api/auth/callback`) to **Authorized redirect URIs**. (Authorized JavaScript origins is no longer used by this flow but can remain.)
   - Set Vercel env vars for production, preview, and development: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `TOKEN_ENC_KEY`. Unset `VITE_GOOGLE_CLIENT_ID`.
2. **Deploy:** Vercel builds the Vite SPA (static) and the `api/` functions (serverless). `vercel.json` rewrites non-`/api/*` paths to `/index.html`.
3. **Post-deploy for existing users:** On first visit after the deploy, `/api/auth/status` returns `connected: false` (no cookie). The persistence migration (v2) has cleared stale `accessToken`/`expiresAt`/`email` but preserved `dayboxFileId`/`lastBackupAt`. The user clicks Connect, completes the OAuth redirect, and lands back in the app. Their next backup updates the existing `daybox.json` (via the preserved `dayboxFileId`), not a duplicate.
4. **Rollback:** Revert the deploy. The previous (implicit-flow) code returns. Users who reconnected under the new flow will have a `__Host-db_rt` cookie that the old code ignores (and can clear via Disconnect). The `dayboxFileId` is preserved across both flows. No data loss.

## Open Questions

None — all design decisions are resolved. The rollout checklist (env vars, Google Cloud Console redirect URIs) is an operational task, not an open design question.
