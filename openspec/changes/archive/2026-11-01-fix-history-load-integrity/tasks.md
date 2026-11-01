# Tasks

## 1. Record order

- [x] 1.1 Store a `seq` on each record with a unique index; assign the next value on append and array positions on bulk writes; verify that ids sorting differently from the record order still load in record order
- [x] 1.2 Preserve the legacy array order during migration; verify with a migration test
- [x] 1.3 Verify at the store level that the order survives a reload

## 2. Failure visibility

- [x] 2.1 Make the load resolve to `ready` or `failed`; verify both
- [x] 2.2 Refuse the settings export and the Google Drive backup on `failed`, reporting the cause
- [x] 2.3 Warn once when a write fails after a successful load; verify

## 3. Storage hardening

- [x] 3.1 Validate the stored tracking start and replace an unreadable one in one transaction; verify the raw meta record has only its three fields
- [x] 3.2 Release the connection on `versionchange` and drop the cached promise on `terminated`
- [x] 3.3 Abort the transaction when a write helper fails, keeping the legacy blob when a migration write fails; verify

## 4. Integration checks

- [x] 4.1 Run `npm run format`, `npm run typecheck`, `npm run lint`, and `npm run test`; all pass
- [x] 4.2 Verify in a browser that events keep their order across a reload and that the export still contains the history slice

## Workflow follow-up

- Sync delta specs to main specs.
- Archive the change.
- Push to the open pull request.
