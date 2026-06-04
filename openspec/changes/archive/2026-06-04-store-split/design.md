## Context

The app currently has two Zustand stores:

- `app/store.ts` (persisted) — holds tasks, groups, settings, view, browseDate, focusedTaskId, stickyGroupId
- `app/timerStore.ts` (non-persisted) — holds timer runtime state (phase, elapsed, isRunning)

The app store is a monolith combining four unrelated domains. Every feature imports from `@/app/store`, creating a flat dependency graph where nothing can be reasoned about independently. The timer store already demonstrates the preferred pattern: isolated, co-located with its consumer, no unnecessary re-renders.

## Goals / Non-Goals

**Goals:**

- Each domain owns its own Zustand store file, co-located in its feature folder
- Consumers import only the stores they need (no blanket `useAppStore`)
- Persistence is scoped per-domain (three localStorage keys instead of one)
- `focusedTaskId` moves to timer store (it's "what task the current pomodoro is focused on")
- `stickyGroupId` moves to groups store (it's "the currently selected default group for tasks")
- A one-shot migration reads the old `daybox-app-store` key and writes to new keys
- Full backward compatibility for exported JSON data

**Non-Goals:**

- No behavior changes in any view or component
- No changes to the `@/shared/types.ts` data types
- No changes to the timer store's internal phase/skip logic
- No extraction of store tests into per-feature test files (stays in `app/store.test.ts` for this pass, but rewritten)

## Decisions

### 1. Separate stores over Zustand slices

**Decision**: Each domain gets its own `create()` call (independent stores), not slices composed into one.

Slices share `set`/`get`, which makes cross-domain actions too easy — and the whole point is enforcing boundaries. With separate stores, if `addTask` needs `stickyGroupId`, the consumer (AddTaskRow) explicitly passes it. No hidden coupling.

Trade-off: `deleteGroup` with task reassignment is no longer atomic. The consumer orchestrates two store calls. Acceptable for a client-only app — no concurrent writers.

### 2. Each persisted store has its own persist middleware + key

**Decision**: Three separate `persist()` wrappers with keys `daybox-tasks`, `daybox-groups`, `daybox-settings`.

Alternative (single persist wrapping a composite store-within-a-store) was considered but rejected: it leaks the persist concern into every feature and makes partial migrations harder.

### 3. Migration: one-shot read + write in App.tsx useEffect

**Decision**: On first load, if old key `daybox-app-store` exists, read it, write to new keys, delete old key. Runs before any store subscriber reads stale defaults. Uses `useEffect` in `App.tsx` with a `migrationDone` flag to set into each store.

Alternative (migration in each store's `persist.migrate` callback) would require each store to understand the full old shape — duplication without benefit.

### 4. Export/import reads from all stores via a thin API

**Decision**: Export serialization becomes a function that collects state from `useTaskStore.getState()`, `useGroupStore.getState()`, `useSettingsStore.getState()`. The exported JSON schema stays the same (flat `tasks`, `groups`, `settings` keys). Import writes back to each store. No breaking change to export files.

## Risks / Trade-offs

- [Import churn] ~22 files touch imports. All mechanical, but must be careful with each `useAppStore(s => s.xxx)` → correct new store.
- [Migration timing] If App.tsx renders before migration runs, stores read empty defaults. Mitigation: migration fires in a layout effect before the first paint, and `App.tsx` conditionally renders `<Loading />` until done.
- [Export/import coupling with UIStore] The `view` and `browseDate` fields from the old monolithic store are ephemeral and should NOT be exported/imported. The export function must explicitly exclude them.
