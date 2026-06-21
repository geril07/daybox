## Context

DayBox is a local-first SPA. The Google Drive feature currently uses Google Identity Services (GIS) token client in the browser, persists the short-lived access token and expiry in `daybox-google-drive`, and performs manual backup/restore to a visible `daybox.json` file in the user's Drive root.

The store already has an `ensureFreshToken` path that reuses a fresh access token or calls `requestAccessToken({ prompt: '' })` when the token is expired. However, the panel's `useIsConnected` query treats token freshness as connection state, so the UI moves back to the disconnected Connect button as soon as the access token expires. That hides the backup/restore controls even though the app may be able to silently obtain another access token at action time.

The browser SPA should not store Google refresh tokens in localStorage. This change keeps the GIS token-client model and clarifies the app's state model instead.

## Goals / Non-Goals

**Goals:**

- Treat Google Drive connection as remembered local authorization/account metadata, not only as a currently fresh bearer token.
- Continue using short-lived GIS access tokens and reacquire them on explicit Drive actions.
- Ensure backup and restore can load GIS before attempting token reacquisition.
- Preserve Disconnect as the explicit way to clear remembered Google Drive state.
- Keep the implementation local-first with no backend or new dependency.

**Non-Goals:**

- Do not introduce Google refresh tokens, offline access, or an auth-code exchange.
- Do not add automatic scheduled/background backups.
- Do not change Drive file placement, snapshot format, or data-portability behavior.
- Do not migrate existing persisted data beyond preserving compatible localStorage fields.

## Decisions

### Separate Connection From Token Freshness

The Google Drive module will expose a connection query based on remembered Drive state, such as account email, an existing access token, or Drive backup metadata. Token freshness remains an internal action-time concern.

Alternative considered: keep `useIsConnected` tied to `expiresAt`. This is simple but produces poor UX because access-token expiry is expected and does not necessarily mean the user has disconnected or revoked Drive authorization.

### Reacquire Tokens On Explicit Actions

Backup and restore will ensure GIS is loaded, then call the existing fresh-token path. If a token is still fresh, the action uses it. If not, the action requests a new access token with `prompt: ''` first.

Alternative considered: request a new token proactively when the panel renders. That would make the UI appear ready more often, but it performs auth work before user intent and can create unnecessary prompts/failures.

### Keep Refresh Tokens Out Of Browser Storage

The implementation will not store a Google refresh token. Durable browser storage keeps only local DayBox connection metadata and short-lived access-token data.

Alternative considered: implement auth-code/offline access and store a refresh token locally. That would support true refresh-token exchange, but it creates a long-lived credential in browser storage and is not a good fit for this local-first SPA.

### Preserve Explicit Disconnect Semantics

Disconnect remains the path that clears access token, expiry, email, Drive file id, backup space, and last backup timestamp. Token expiry alone does not clear these fields.

Alternative considered: automatically clear remembered connection metadata when silent token reacquisition fails. That would be surprising because failure can be caused by temporary browser/session conditions; the user should choose whether to disconnect.

## Risks / Trade-offs

- Silent token reacquisition can fail even for a previously connected account -> surface an inline reconnect/authorization message and leave remembered metadata intact.
- The word "Connected" can imply guaranteed API access -> UI copy and tests should reflect that Drive is remembered/connected, while actions may still require Google authorization.
- Existing persisted states may contain only a token and expiry with no email -> connection detection should tolerate partial state so existing users are not unnecessarily disconnected.
- `requestAccessToken({ prompt: '' })` may require GIS script availability -> backup and restore should load GIS before requesting a token.
