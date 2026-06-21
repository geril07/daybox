## Why

DayBox's Google Drive backup uses Google Identity Services' implicit OAuth flow, which mints only short-lived access tokens (~1 hour) and reacquires them silently via a `prompt:''` token client request. In a growing share of browsers — those with strict third-party cookie restrictions, ITP, or partitioned storage — that silent reacquisition fails even when the user is still signed in to Google, so users see a "reconnect" prompt instead of their backup working. The root cause is architectural: the implicit flow has no refresh token, so every reacquisition depends on a browser-mediated Google session check that hostile privacy defaults now block. Introducing a refresh-token-backed flow restores reliable silent backup across browser sessions and makes the app deployable on Vercel as a stateless SPA + serverless functions.

## What Changes

- **BREAKING**: Migrate the Google Drive OAuth flow from GIS implicit tokens to the Authorization Code + PKCE flow, with a stateless Hono backend performing the code exchange and refresh-token rotation.
- Add a `/api/auth/*` server (Hono) deployed as Vercel serverless functions: `start`, `callback`, `refresh`, `disconnect`, `status`.
- Store the refresh token encrypted (AES-256-GCM) in a long-lived `__Host-db_rt` HttpOnly cookie; no database.
- Remove the GIS implicit flow (`loadGoogleIdentityScript`, `createTokenClient`, the `prompt:''` silent reacquisition) and the `VITE_GOOGLE_CLIENT_ID` env var.
- SPA auth client becomes typed `fetch` wrappers against `/api/auth/*`; access tokens are held in memory only (non-persisted runtime state).
- `connect()` performs a full browser redirect to `/api/auth/start`; the callback redirects back to `/?connected=1`.
- App shell hydrates connection state from `getAuthStatus()` on boot.
- Persistence migration: bump `daybox-google-drive` to v2, clearing stale `accessToken`, `expiresAt`, and `email`; preserve `dayboxFileId`, `backupFileSpace`, `lastBackupAt`.
- Add `vercel.json` with a SPA fallback rewrite for deep links.
- New env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `TOKEN_ENC_KEY` (32-byte hex).
- New dev script `npm run dev:full` (`vercel dev`) for full-stack local dev; `npm run dev` stays plain Vite for UI-only HMR.
- Existing connected users reconnect once after deploy; their `daybox.json` file pointer survives via the persisted `dayboxFileId`.

## Capabilities

### New Capabilities

- `oauth-backend`: The stateless Hono server under `api/auth/*` that performs the Authorization Code + PKCE exchange with Google, encrypts and rotates the refresh token in an HttpOnly cookie, and exposes `/start`, `/callback`, `/refresh`, `/disconnect`, `/status` endpoints. Owns cookie names, AES-GCM seal/open, PKCE verifier/state generation, and the Google token-exchange + userinfo calls.

### Modified Capabilities

- `google-drive-backup`: Replace the GIS implicit-flow connect/reconnect behavior with the server-backed Authorization Code + PKCE flow. Connect becomes a redirect to `/api/auth/start`; token reacquisition becomes a call to `/api/auth/refresh`; connection state is hydrated from `/api/auth/status` on boot; persisted auth slice drops access-token/email fields and keeps only Drive-file metadata; persistence migrates to v2. Disconnect calls `/api/auth/disconnect` before clearing local metadata.
- `app-shell`: On mount, hydrate Google Drive connection state from `/api/auth/status` and handle the `?connected=1` query param left by the OAuth callback redirect.
- `data-persistence`: The `daybox-google-drive` persisted slice is reduced to `dayboxFileId`, `backupFileSpace`, `lastBackupAt`; migration version bumped to 2 to clear stale implicit-flow fields on rehydrate.
- `architecture`: A new `api/` folder is introduced for server-only code (Hono, crypto, Google token exchange) with its own TypeScript project reference (Node types, no DOM lib); it sits alongside `src/` and is excluded from the SPA bundle. The cross-cutting allowlist is extended to permit `api/` to read server-only env vars.

## Impact

- **New code**: `api/auth/[[...route]].ts` (Hono app), `api/lib/{encrypt,cookies,google}.ts` helpers, `api/auth.test.ts`, `api/lib/encrypt.test.ts`.
- **Modified SPA code**: `src/shared/google-drive/client.ts` (replaced by `server-auth.ts`), `src/modules/google-drive/{store,queries,types,schema}.ts`, `src/modules/google-drive/components/GoogleDrivePanel.tsx`, and their tests; `src/app/...` boot/hydration; `tsconfig*.json`, `vite.config.ts`, `vercel.json`, `.env.example`, `package.json` (scripts + `hono` dep).
- **Removed code**: `src/shared/google-drive/client.ts` GIS loader and token client; all GIS-related tests.
- **New dependencies**: `hono` (runtime), `@hono/node-server` (dev-only if needed).
- **New env vars**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `TOKEN_ENC_KEY`. Removed: `VITE_GOOGLE_CLIENT_ID`.
- **Deploy target**: Vercel (serverless functions + static SPA). Google Cloud Console must add the callback URL to Authorized redirect URIs (new requirement under Auth Code flow).
- **Breaking for existing users**: one-time reconnect after deploy; no data loss (Drive file pointer preserved).
