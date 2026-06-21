## ADDED Requirements

### Requirement: App shell hydrates Google Drive connection state on boot

The app shell SHALL call `/api/auth/status` on mount and populate the Google Drive store's runtime `connected` and `email` state from the response. The call SHALL be non-blocking — the app SHALL render before the status response arrives and SHALL update the Google Drive panel when the response resolves. If the call fails (network error, non-200), the store SHALL default to `{ connected: false, email: null }` so the panel shows the Connect button.

#### Scenario: Status populates the store on boot

- **WHEN** the app shell mounts
- **THEN** it calls `GET /api/auth/status`
- **AND** on a 200 response with `{ connected: true, email: "u@x" }`, the Google Drive store's runtime `connected` is set to `true` and `email` is set to `"u@x"`
- **AND** the Google Drive panel renders in the connected state without further user action

#### Scenario: Status failure defaults to disconnected

- **WHEN** the app shell mounts and the `/api/auth/status` call fails (network error or non-200)
- **THEN** the Google Drive store's runtime `connected` is set to `false` and `email` is set to `null`
- **AND** the Google Drive panel renders in the disconnected state
- **AND** no error message is shown (the failure is treated as "not connected")

### Requirement: App shell handles the OAuth callback redirect query

The app shell SHALL detect the `?connected=1` query parameter left by the `/api/auth/callback` redirect and SHALL, in response, clear the query parameter from the URL (via `history.replaceState` or equivalent) and trigger a fresh `/api/auth/status` fetch so the panel reflects the just-completed connection. The `?connected=0` query parameter SHALL likewise be cleared and the panel SHALL remain in the disconnected state (no error message — the user either denied consent or the exchange failed).

#### Scenario: Successful callback redirect hydrates the panel

- **WHEN** the app shell mounts with the URL `/?connected=1`
- **THEN** the app shell clears the `connected` query parameter from the URL
- **AND** the app shell fetches `/api/auth/status` and populates the store from the response
- **AND** the panel renders in the connected state

#### Scenario: Failed callback redirect keeps the panel disconnected

- **WHEN** the app shell mounts with the URL `/?connected=0`
- **THEN** the app shell clears the `connected` query parameter from the URL
- **AND** the panel renders in the disconnected state
- **AND** no error message is shown
