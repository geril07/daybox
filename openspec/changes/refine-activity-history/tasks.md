# Tasks

## 1. History module

- [ ] 1.1 Add `groupName` to the `task.completed`, `task.deleted`, and `focus.ended` schemas and add `trackingStartedAt` / `trackingUtcOffsetMinutes` to the state schema; verify with schema and slice tests
- [ ] 1.2 Add the optional `occurredAt` argument to `recordEvent`, initialize and persist the tracking start on first launch; verify with store tests (offset from `occurredAt`, first-launch write, reload keeps the start)
- [ ] 1.3 Export the tracking start in the `history` slice and make the missing default start at import time; verify with slice and pipeline tests

## 2. Callers

- [ ] 2.1 Snapshot `groupName` in the tasks store events; verify with task store tests including a missing group and group deletion
- [ ] 2.2 Snapshot `groupName` and stamp natural completion with the zero-crossing in `TimerBar`; verify with TimerBar tests for a late-detected completion

## 3. Integration checks

- [ ] 3.1 Run `npm run format`, `npm run typecheck`, `npm run lint`, and `npm run test`; all pass
- [ ] 3.2 Verify in the browser that first launch writes `trackingStartedAt`, events carry `groupName`, and the export contains the tracking start

## Workflow follow-up

- Sync delta specs to main specs.
- Archive the change.
- Push to the open pull request.
