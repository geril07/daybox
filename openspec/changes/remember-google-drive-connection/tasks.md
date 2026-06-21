## 1. Connection Semantics

- [x] 1.1 Add or update query tests proving remembered Google Drive metadata keeps the panel connected after access-token expiry.
- [x] 1.2 Update `useIsConnected` or introduce a clearer query so connected state is based on remembered Google Drive metadata rather than fresh token expiry alone.
- [x] 1.3 Update Google Drive panel tests for expired-token connected state and disconnected state with no remembered metadata.

## 2. Action-Time Token Reacquisition

- [x] 2.1 Add store tests for backup with an expired token that loads GIS, obtains a new token, and proceeds with upload.
- [x] 2.2 Add store tests for restore with an expired token that loads GIS, obtains a new token, and proceeds with download/import.
- [x] 2.3 Update backup and restore actions to load Google Identity Services before requesting a replacement access token.
- [x] 2.4 Ensure failed silent token reacquisition leaves remembered metadata intact and surfaces an authorization/reconnect error state.

## 3. UI And Error Handling

- [x] 3.1 Update the Google Drive panel to keep Back up, Restore, and Disconnect available for remembered connections even when the stored token is expired.
- [x] 3.2 Add or adjust inline copy for authorization/reconnect failures that are distinct from network and missing-file failures.
- [x] 3.3 Verify Disconnect still clears token, expiry, email, file id, backup space, and last-backup timestamp.

## 4. Verification

- [x] 4.1 Run `npm run format`.
- [x] 4.2 Run `npm run typecheck`.
- [x] 4.3 Run `npm run lint`.
- [x] 4.4 Run `npm run test`.
