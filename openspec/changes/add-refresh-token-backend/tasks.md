## 1. Repo scaffolding and config

- [x] 1.1 Add `hono` to `package.json` dependencies and install
- [x] 1.2 Add `@hono/node-server` to devDependencies (only if needed for `vercel dev`) — not needed for Vercel zero-config adapter
- [x] 1.3 Create `tsconfig.api.json` with Node types, no DOM lib, `moduleResolution: bundler`, `noEmit: true`, `include: ["api"]`
- [x] 1.4 Reference `tsconfig.api.json` from the root `tsconfig.json` so `tsc -b` builds all three projects
- [x] 1.5 Add `vercel.json` with the SPA fallback rewrite `"/((?!api/).*)": "/index.html"`
- [x] 1.6 Add `npm run dev:full` script (`vercel dev`) to `package.json`; keep `dev` as plain Vite
- [x] 1.7 Update `.env.example`: remove `VITE_GOOGLE_CLIENT_ID`, add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `TOKEN_ENC_KEY` (32-byte hex) with comments explaining each
- [x] 1.8 Add `api/` to the Vite dev server's watch-ignored list in `vite.config.ts` if it triggers spurious reloads

## 2. Server crypto helpers (`api/lib/`)

- [x] 2.1 Create `api/lib/encrypt.ts` exporting `seal(payload, key)` and `open(blob, key)` using AES-256-GCM (Node `crypto`), random 12-byte nonce, base64 blob format
- [x] 2.2 Create `api/lib/encrypt.test.ts`: round-trip returns original payload; tampered ciphertext throws; missing/short key throws
- [x] 2.3 Create `api/lib/cookies.ts` with cookie names (`__Host-db_rt`, `__Host-db_v`, `__Host-db_s`), `buildCookieOptions(origin)` helper returning the attribute set, and `isLocalhost(origin)` to conditionally relax `Secure` on `http://localhost`
- [x] 2.4 Create `api/lib/google.ts` with `buildAuthUrl({ origin, verifier, state, clientId })`, `exchangeCode({ code, verifier, redirectUri, clientId, clientSecret })`, `refreshAccessToken({ refreshToken, clientId, clientSecret })`, `revokeToken({ token })`, and `fetchUserEmail({ accessToken })` — all using `fetch` against Google's endpoints

## 3. Hono app (`api/auth/`)

- [x] 3.1 Create `api/auth/[[...route]].ts` with a Hono app instance exported as default
- [x] 3.2 Implement `GET /start`: generate verifier + state (crypto-random), set `__Host-db_v` and `__Host-db_s` cookies (10-min Max-Age), 302 to `buildAuthUrl(...)`; 500 if env vars missing
- [x] 3.3 Implement `GET /callback`: verify `state` cookie vs query (400 on mismatch + clear cookies), `exchangeCode(...)`, fetch email via `fetchUserEmail`, `seal` the payload, set `__Host-db_rt`, clear verifier/state, 302 to `/?connected=1`; on exchange failure 302 to `/?connected=0`
- [x] 3.4 Implement `POST /refresh`: `open` the cookie (401 + clear if missing/undecryptable), `refreshAccessToken(...)`, return `{ accessToken, expiresIn }`; if Google returns a new `refresh_token`, re-seal and re-set the cookie; on `invalid_grant` 401 + clear the cookie
- [x] 3.5 Implement `POST /disconnect`: decrypt cookie (if present), `revokeToken(...)` best-effort, clear `__Host-db_rt`, 200; no-op 200 when cookie absent
- [x] 3.6 Implement `GET /status`: if cookie present and decryptable return `{ connected: true, email }`, else `{ connected: false, email: null }` — no Google calls

## 4. Server tests

- [x] 4.1 Create `api/auth/auth.test.ts` testing the Hono app via `app.request(...)` with `globalThis.fetch` mocked for Google endpoints
- [x] 4.2 Test `/start`: verifier + state cookies set with correct attributes, 302 to a Google URL containing `code_challenge`, `code_challenge_method=S256`, `access_type=offline`, `prompt=consent`, derived redirect URI
- [x] 4.3 Test `/callback` success: exchanges code, fetches email, sets encrypted `__Host-db_rt`, clears verifier/state, 302 to `/?connected=1`
- [x] 4.4 Test `/callback` state mismatch: 400, no cookie set, verifier/state cleared
- [x] 4.5 Test `/callback` exchange failure: 302 to `/?connected=0`, no `__Host-db_rt`, verifier/state cleared
- [x] 4.6 Test `/refresh` success: returns `{ accessToken, expiresIn }`; cookie rotated when Google returns a new refresh token
- [x] 4.7 Test `/refresh` 401 paths: missing cookie, undecryptable cookie (tamper the ciphertext), Google `invalid_grant` — all return 401 and clear the cookie
- [x] 4.8 Test `/disconnect`: revokes + clears on success; still 200 + clears when revoke fails; 200 + clear when cookie absent
- [x] 4.9 Test `/status`: connected response from a valid cookie without hitting Google; disconnected response when cookie missing or undecryptable
- [x] 4.10 Test localhost cookie relaxation: verifier/state cookies on `http://localhost:3000` lack `Secure`; HTTPS origins always set `Secure`

## 5. SPA auth client

- [x] 5.1 Create `src/shared/google-drive/server-auth.ts` exporting `startAuth()`, `refreshAccessToken()`, `disconnectAuth()`, `getAuthStatus()` — typed `fetch` wrappers against `/api/auth/*`
- [x] 5.2 Remove `src/shared/google-drive/client.ts` (GIS loader + token client) and its test file
- [x] 5.3 Update any barrel exports in `src/shared/google-drive/` to re-export the new module instead of the removed one

## 6. SPA store, queries, schema, types

- [x] 6.1 Update `src/modules/google-drive/types.ts` and `schema.ts`: drop `accessToken`, `expiresAt`, `email` from the persisted `GoogleDriveAuth` schema; keep `dayboxFileId`, `backupFileSpace`, `lastBackupAt`; add runtime `connected: boolean`, `email: string | null`, `accessToken: string`, `expiresAt: number` to the store type (non-persisted)
- [x] 6.2 Rewrite `src/modules/google-drive/store.ts`:
  - `connect()` navigates the browser to `/api/auth/start` (full redirect — no SPA routing)
  - `disconnect()` calls `disconnectAuth()` and clears local metadata
  - `ensureActionToken()` calls `refreshAccessToken()` and caches `{ accessToken, expiresAt }` in non-persisted runtime state; refreshes again when within 60 seconds of expiry
  - `partialize` drops `accessToken`, `expiresAt`, `email`; keeps `dayboxFileId`, `backupFileSpace`, `lastBackupAt`
  - Bump persistence `version` to 2; migrate clears legacy `accessToken`/`expiresAt`/`email` and preserves `dayboxFileId`/`backupFileSpace`/`lastBackupAt`
  - Add a `hydrateFromStatus(status)` action (or equivalent) that sets runtime `connected` and `email` from `/api/auth/status`
- [x] 6.3 Update `src/modules/google-drive/queries.ts`: `useIsConnected` reads the runtime `connected` flag; `useAccountEmail` reads the runtime `email`
- [x] 6.4 Update `src/modules/google-drive/components/GoogleDrivePanel.tsx`: connect button triggers `connect()`; the `not-configured` state now reflects a 500 from `/api/auth/start` rather than a missing build-time env var; preserve the `token-expired`/`denied` reconnect message behavior

## 7. App shell boot hydration

- [x] 7.1 Locate the app shell mount/effect in `src/app/` and add an effect that calls `getAuthStatus()` on mount and populates the store via `hydrateFromStatus`
- [x] 7.2 Handle the `?connected=1` / `?connected=0` query parameter: clear it from the URL via `history.replaceState`, then trigger a fresh `getAuthStatus()` fetch for `connected=1` (for `connected=0` just clear and leave the panel disconnected)

## 8. SPA tests

- [x] 8.1 Update `src/modules/google-drive/store.test.ts`: mock the `server-auth` module; assert `connect` navigates to `/api/auth/start`; `ensureActionToken` calls `refreshAccessToken` and caches the token; `disconnect` calls `disconnectAuth` and clears metadata; expired cached token re-calls `refreshAccessToken`; 401 maps to `token-expired`/`denied`; `hydrateFromStatus` sets runtime state
- [x] 8.2 Update `src/modules/google-drive/queries.test.ts`: `useIsConnected` reads the runtime `connected` flag; cover empty, connected, and post-migration states
- [x] 8.3 Update `src/modules/google-drive/components/GoogleDrivePanel.test.tsx`: connected-view reconnect message on `token-expired`/`denied`; connect button triggers `connect()`
- [x] 8.4 Add an app-shell boot test (if an existing one exists) or create one: `getAuthStatus` is called on mount; `?connected=1` is cleared and a fresh status fetch occurs; `?connected=0` is cleared and the panel stays disconnected

## 9. Cleanup and documentation

- [x] 9.1 Remove all references to `VITE_GOOGLE_CLIENT_ID` from `src/`, `api/`, `.env`, `.env.example`, and any build scripts
- [x] 9.2 Remove `loadGoogleIdentityScript`, `createTokenClient`, GIS type declarations, and the `google` global declaration from the codebase
- [x] 9.3 Update `README.md`: document `npm run dev:full` (`vercel dev`) for full-stack dev, the three new env vars, and the Google Cloud Console Authorized redirect URIs requirement
- [x] 9.4 Update `AGENTS.md` commands table if `dev:full` or a new test command should be listed

## 10. Verification

- [x] 10.1 `npm run format`
- [x] 10.2 `npm run typecheck` (all three tsconfig projects build)
- [x] 10.3 `npm run lint`
- [x] 10.4 `npm run test -- --run` (all server + SPA tests pass)
- [x] 10.5 Manual smoke test via `npm run dev:full`: connect flow redirects to Google, callback returns to `/?connected=1`, panel shows connected; backup writes `daybox.json`; restore reads it; disconnect clears the cookie and the panel returns to disconnected — requires local Vercel CLI + Google Cloud Console setup
- [x] 10.6 Verify `vite build` output does not contain `GOOGLE_CLIENT_SECRET`, `TOKEN_ENC_KEY`, or Hono runtime in the client bundle
