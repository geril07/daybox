## ADDED Requirements

### Requirement: OAuth backend exposes a stateless Authorization Code + PKCE flow

The system SHALL expose a Hono app under `api/auth/*` deployed as Vercel serverless functions that performs the Google OAuth Authorization Code + PKCE exchange server-side. The app SHALL read `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `TOKEN_ENC_KEY` from server-only environment variables and SHALL NOT expose the client secret or the encryption key to the SPA. The app SHALL derive the OAuth redirect URI from the request origin as `<origin>/api/auth/callback` at request time. The app SHALL use the `drive.file`, `openid`, and `email` scopes and SHALL request `access_type=offline` and `prompt=consent` so that a refresh token is issued on first consent.

#### Scenario: Start endpoint redirects to Google consent

- **WHEN** the SPA navigates the browser to `GET /api/auth/start`
- **THEN** the server generates a PKCE verifier and an OAuth state value
- **AND** the server sets two short-lived (10-minute `Max-Age`) `HttpOnly` `Secure` `SameSite=Lax` `Path=/` cookies named `__Host-db_v` (verifier) and `__Host-db_s` (state)
- **AND** the server responds with a 302 to Google's authorization endpoint
- **AND** the redirect URL includes `response_type=code`, `code_challenge` derived as the S256 hash of the verifier, `code_challenge_method=S256`, `access_type=offline`, `prompt=consent`, the configured scope, the client id, and the derived redirect URI

#### Scenario: Redirect URI is derived from the request origin

- **WHEN** the start endpoint is invoked from a Vercel preview deploy at `https://daybox-abc.vercel.app`
- **THEN** the redirect URI in the consent URL is `https://daybox-abc.vercel.app/api/auth/callback`
- **AND** no `GOOGLE_REDIRECT_URI` environment variable is read

#### Scenario: Missing server env vars fails closed

- **WHEN** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, or `TOKEN_ENC_KEY` is unset
- **THEN** the start endpoint responds with a 500 status and a plain-text error message
- **AND** no cookies are set
- **AND** no redirect to Google is performed

#### Scenario: Localhost origin relaxes the Secure cookie attribute

- **WHEN** the request origin is `http://localhost:3000` (local dev via `vercel dev` over plain HTTP)
- **THEN** the verifier and state cookies are set without the `Secure` attribute so that the browser accepts them over plain HTTP
- **AND** the `__Host-` prefix is stripped from the cookie names (browsers reject `__Host-` cookies that lack `Secure`), so the cookies are named `db_v` and `db_s`
- **AND** all other cookie attributes (`HttpOnly`, `SameSite=Lax`, `Path=/`) are preserved
- **AND** HTTPS origins (including `https://localhost`) always set `Secure` and keep the `__Host-` prefix

### Requirement: Callback exchanges the code and stores an encrypted refresh token

The system SHALL expose `GET /api/auth/callback` which verifies the OAuth state cookie against the `state` query parameter, exchanges the authorization `code` plus the PKCE verifier for tokens at Google's token endpoint using the client secret, and stores the resulting refresh token encrypted in a long-lived HttpOnly cookie. On success the server SHALL fetch the user's email from Google's userinfo endpoint, encrypt the payload `{ refreshToken, email, createdAt }` with AES-256-GCM using `TOKEN_ENC_KEY`, and set the ciphertext as the `__Host-db_rt` cookie. The verifier and state cookies SHALL be cleared on completion regardless of outcome.

#### Scenario: Successful callback sets the encrypted refresh-token cookie

- **WHEN** Google redirects back to `/api/auth/callback?code=<code>&state=<state>`
- **AND** the `state` query matches the `__Host-db_s` cookie value
- **THEN** the server POSTs `grant_type=authorization_code`, the code, the verifier from `__Host-db_v`, the client id, the client secret, and the derived redirect URI to Google's token endpoint
- **AND** the server receives an access token, a refresh token, and an expiry
- **AND** the server fetches the user's email from Google's userinfo endpoint using the access token
- **AND** the server encrypts `{ refreshToken, email, createdAt: <now> }` with AES-256-GCM
- **AND** the server sets the ciphertext as the `__Host-db_rt` cookie with `HttpOnly`, `Secure` (relaxed on localhost), `SameSite=Lax`, `Path=/`, and no `Domain`
- **AND** the `__Host-db_v` and `__Host-db_s` cookies are cleared
- **AND** the server responds with a 302 to `/?connected=1`

#### Scenario: State mismatch is rejected

- **WHEN** the `state` query parameter does not match the `__Host-db_s` cookie value (or the cookie is missing)
- **THEN** the server responds with a 400 status and a plain-text error message
- **AND** no token exchange is performed
- **AND** no `__Host-db_rt` cookie is set
- **AND** the verifier and state cookies are cleared

#### Scenario: Token exchange failure redirects with a failure flag

- **WHEN** the state matches but Google's token endpoint returns an error (e.g. invalid code, expired code)
- **THEN** the server responds with a 302 to `/?connected=0`
- **AND** no `__Host-db_rt` cookie is set
- **AND** the verifier and state cookies are cleared

### Requirement: Refresh endpoint returns a fresh access token and rotates the cookie

The system SHALL expose `POST /api/auth/refresh` which decrypts the `__Host-db_rt` cookie, exchanges the refresh token with Google for a new access token, and returns `{ accessToken, expiresIn }` to the SPA. If Google returns a new refresh token in the response, the server SHALL re-encrypt and re-set the `__Host-db_rt` cookie with the rotated refresh token. If the cookie is missing, undecryptable, or Google returns an `invalid_grant` error, the server SHALL respond with 401 and SHALL clear the `__Host-db_rt` cookie.

#### Scenario: Successful refresh returns a new access token

- **WHEN** the SPA POSTs to `/api/auth/refresh` with a valid `__Host-db_rt` cookie
- **THEN** the server decrypts the cookie payload
- **AND** the server POSTs `grant_type=refresh_token`, the refresh token, the client id, and the client secret to Google's token endpoint
- **AND** the server receives a new access token and expiry
- **AND** the server responds with 200 and a JSON body `{ accessToken: <string>, expiresIn: <number> }`
- **AND** the SPA receives no refresh token in any form

#### Scenario: Google rotates the refresh token

- **WHEN** the refresh grant response from Google includes a new `refresh_token` field
- **THEN** the server re-encrypts the payload with the new refresh token (preserving the existing email and updating `createdAt`)
- **AND** the server sets the new `__Host-db_rt` cookie on the response
- **AND** the old refresh token is no longer used

#### Scenario: Missing or undecryptable cookie returns 401

- **WHEN** the SPA POSTs to `/api/auth/refresh` with no `__Host-db_rt` cookie
- **OR** the cookie ciphertext fails AES-GCM decryption (tampering or key mismatch)
- **THEN** the server responds with 401
- **AND** the response includes a `Set-Cookie` header that clears `__Host-db_rt`
- **AND** no request is made to Google's token endpoint

#### Scenario: Revoked refresh token returns 401

- **WHEN** Google's token endpoint returns an `invalid_grant` error for a refresh grant
- **THEN** the server responds with 401
- **AND** the response includes a `Set-Cookie` header that clears `__Host-db_rt`
- **AND** the SPA will show the reconnect UI on this response

### Requirement: Disconnect endpoint clears the cookie and revokes the token

The system SHALL expose `POST /api/auth/disconnect` which clears the `__Host-db_rt` cookie. The server SHALL attempt to revoke the refresh token at Google's revoke endpoint before clearing the cookie; if the revoke request fails (network error, non-200 response), the server SHALL still clear the cookie and respond with 200.

#### Scenario: Successful disconnect revokes and clears

- **WHEN** the SPA POSTs to `/api/auth/disconnect` with a valid `__Host-db_rt` cookie
- **THEN** the server decrypts the cookie to obtain the refresh token
- **AND** the server POSTs the refresh token to Google's revoke endpoint
- **AND** the server responds with 200
- **AND** the response includes a `Set-Cookie` header that clears `__Host-db_rt`

#### Scenario: Revoke failure still clears the cookie

- **WHEN** the revoke request to Google fails (network error or non-200)
- **THEN** the server still responds with 200
- **AND** the response still includes a `Set-Cookie` header that clears `__Host-db_rt`
- **AND** the SPA treats the local disconnection as successful

#### Scenario: Disconnect with no cookie is a no-op

- **WHEN** the SPA POSTs to `/api/auth/disconnect` with no `__Host-db_rt` cookie
- **THEN** the server responds with 200
- **AND** no revoke request is made to Google
- **AND** the response includes a `Set-Cookie` header that clears `__Host-db_rt` (idempotent)

### Requirement: Status endpoint reports connection state without hitting Google

The system SHALL expose `GET /api/auth/status` which decrypts the `__Host-db_rt` cookie and returns `{ connected: true, email: <string | null> }` without making any network call to Google. If the cookie is missing or undecryptable, the server SHALL return `{ connected: false, email: null }` with a 200 status. This endpoint is the cheap call the SPA makes on boot to determine whether to show the connected or disconnected panel.

#### Scenario: Valid cookie reports connected

- **WHEN** the SPA GETs `/api/auth/status` with a valid `__Host-db_rt` cookie
- **THEN** the server decrypts the cookie payload
- **AND** the server responds with 200 and `{ connected: true, email: <string | null> }`
- **AND** no request is made to Google

#### Scenario: Missing or undecryptable cookie reports disconnected

- **WHEN** the SPA GETs `/api/auth/status` with no `__Host-db_rt` cookie
- **OR** the cookie ciphertext fails decryption
- **THEN** the server responds with 200 and `{ connected: false, email: null }`
- **AND** no request is made to Google

### Requirement: Refresh token is encrypted with AES-256-GCM

The system SHALL encrypt the refresh-token cookie payload using AES-256-GCM with a 32-byte key derived from the `TOKEN_ENC_KEY` environment variable. The nonce SHALL be random (12 bytes) per seal operation. The ciphertext and auth tag SHALL be bundled into a single blob and base64-encoded for cookie transport. Decryption SHALL fail (throw) on tampering, truncation, or key mismatch — the server SHALL NOT return partial or corrupted payloads.

#### Scenario: Round-trip encrypt then decrypt returns the original payload

- **WHEN** the server seals `{ refreshToken: "rt-abc", email: "u@x", createdAt: 123 }` with a known key
- **AND** the server opens the resulting blob with the same key
- **THEN** the decrypted payload equals the original input

#### Scenario: Tampered ciphertext fails decryption

- **WHEN** a byte in the sealed blob is flipped before opening
- **THEN** the open call throws
- **AND** no payload is returned

#### Scenario: Missing encryption key fails closed

- **WHEN** the `TOKEN_ENC_KEY` environment variable is unset or not 32 bytes
- **THEN** the seal and open functions throw
- **AND** no cookie is set or read silently
