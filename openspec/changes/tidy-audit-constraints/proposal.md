## Why

The codebase accumulated nine constraints and two bonus issues that the architecture review flagged as "fix in a follow-up". The follow-up is this change. It also addresses the rot in `AGENTS.md`: the Architecture and Constraints sections name specific files (e.g. `app/localStorage.ts:181`, which was renamed to `app/bootstrap.ts` months ago) and list primitives that have since drifted (`Sheet` is used, `Card` is not). The file is read on every agent turn, and every drift is a tax.

This is a single change covering all the items, because they share a review and a single touch of the test suite. The four-corners of the work:

- **Data integrity** — `focusedTaskId` cascades when the focused task is deleted/reassigned; `addTask` returns `Task | null` instead of a placeholder; the default-group id has one canonical declaration; the legacy `daybox-app-store` migration validates every record before writing.
- **Persistence performance** — the timer store persists a ~200-byte blob at 1 Hz because every `tick` triggers a synchronous `JSON.stringify` + `setItem`. Wrap the localStorage with a 1-second debounce; flush on `beforeunload` / `visibilitychange` so closing the tab does not lose the last in-flight second. The runtime state is still persisted (the timer's resume-on-reload behaviour is preserved) and the existing rehydrate wall-clock-correction callback is unchanged.
- **Module shape** — the four feature barrels re-export their `types` and `schema`; intra-feature imports use relative paths (the planner views already do); deep imports into `@/features/<x>/types` are gone; dead `shared/ui` primitives (`Input`, `Label`, `Separator`, `Badge`, `Card`) are pruned.
- **Unwired UI** — the `<GroupLens />` in the header has `onSelect={() => {}}` (no-op). Delete the JSX and its import. The component file stays for future use.

`AGENTS.md` becomes Option A (roles only, ~10 lines) — no file-by-file tree, no specific primitives, no stale path references. The invariants move to a new `architecture` capability spec, so an agent that needs the rules reads the spec, not the doc.

## What Changes

- **AGENTS.md**: rewrite the Architecture and Constraints sections as a single 10-line role pointer + invariants list, and link to the `architecture` spec for details. Drop the per-file tree, the per-store list, the per-primitive inventory, and the stale `localStorage.ts` path references.
- **`architecture` capability (new)**: encodes the feature-shape invariants — one folder per domain, intra-feature relative paths, barrel shape, cross-cutting exceptions, single declaration of `DEFAULT_GROUP_ID`. Behaviour changes that are feature-specific (cascade, return type) go in their owning capability, not here.
- **`data-persistence` capability (delta)**: the runtime-state "SHALL NOT be persisted" line was wrong (the code does persist runtime state to support resume-on-reload). The requirement is MODIFIED to allow runtime persistence; the migration requirement gains a per-record validation step.
- **`pomodoro-timer` capability (delta)**: the timer store's persistence layer MUST be debounced at 1 second, with a `beforeunload` / `visibilitychange` flush. Runtime state continues to be persisted; the rehydrate wall-clock-correction callback is unchanged.
- **`task-management` capability (delta)**: `addTask` returns `Task | null` (null on validation failure). When a task is deleted, reordered across the focused set, or has its `groupId` reassigned (via `deleteTask` / `reorderTasks` / `reassignTasks` / `deleteTasksByGroupId`), `useTimerStore.focusedTaskId` is cleared if the affected task is the focused one. The cascade lives in the store action, not in the component.
- **`group-management` capability (delta)**: `DEFAULT_GROUP_ID` is exported from `@/features/groups` and is the only declaration. `<GroupLens />` is no longer rendered in the header. The component file remains.
- **Prune `shared/ui`**: delete `input.tsx`, `label.tsx`, `separator.tsx`, `badge.tsx`, `card.tsx` and their barrel exports. `Sheet`, `EmptyState`, and the rest are kept.

## Capabilities

### New Capabilities

- `architecture`: encodes the feature-shape invariants and the data-integrity rules that span features (one canonical `DEFAULT_GROUP_ID`, the cross-cutting exception list, the barrel shape, the intra-feature path rule).

### Modified Capabilities

- `data-persistence`: tighten the legacy-migration requirement to per-record validation.
- `pomodoro-timer`: add the partialize requirement; current code violates the existing data-persistence "timer runtime state SHALL NOT be persisted" rule, so this aligns code with the spec.
- `task-management`: add the `addTask` return-type and focused-task-cascade requirements.
- `group-management`: add the `DEFAULT_GROUP_ID` canonicalization; remove the header lens.

## Impact

- **AGENTS.md**: shrinks by ~70 lines. The Architecture and Constraints sections are replaced by a single block that points at the `architecture` spec. The Stack, Commands, Workflow, and Conventions sections are untouched.
- **New files**:
  - `openspec/specs/architecture/spec.md` (capability)
  - delta specs under the change's `specs/`
- **Deleted files**: `src/shared/ui/{input,label,separator,badge,card}.tsx`
- **Modified files**: all four store files, the four task-store actions, the three feature barrels, the `app/bootstrap.ts` migration, the `app/App.tsx` header, the `createValidatedPersist` helper, and nine intra-feature import sites (mostly mechanical).
- **Behaviour changes**:
  - Empty-or-overlong task titles no longer insert a placeholder task. The single consumer (`AddTaskRow`) already short-circuits on empty, and a 280+ char title logs a warning and is rejected (no UI error toast in this change — out of scope).
  - Deleting/reassigning the focused task now clears the timer's `focusedTaskId` immediately. The UI shows "No task focused" instead of leaving the title rendered against a missing record.
  - The header no longer shows the group-lens dropdown.
- **No new dependencies**.
- **Risk**: a single change touching persistence, all four stores, the migration path, and the AGENTS doc is broad. Mitigation: tasks are grouped by file with `tsc -b` between groups; the test suite covers the timer (`bootstrap.test.ts`, `TaskRow.test.tsx`, `store.test.ts` for tasks/groups).
