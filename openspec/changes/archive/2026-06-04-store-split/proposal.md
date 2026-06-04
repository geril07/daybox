## Why

The single `app/store.ts` monolith holds four distinct concerns (tasks, groups, settings, UI state) in one file. Every feature edits the same store, making it a bottleneck for reasoning, testing, and future extraction. The timer store is already isolated — the rest should follow the same pattern.

## What Changes

- Split `app/store.ts` into five independent Zustand stores, one per domain:
  - `features/tasks/store.ts` — task CRUD, reorder
  - `features/groups/store.ts` — group CRUD + `stickyGroupId`
  - `features/settings/store.ts` — AppSettings (theme, timer prefs, week start)
  - `features/timer/store.ts` — gains `focusedTaskId` from app store (timer already imports `useTimerStore`)
  - `app/uiStore.ts` — view, browseDate (ephemeral shell state)
- Delete `app/store.ts` — each consumer imports the store it needs
- Move existing `app/timerStore.ts` → `features/timer/store.ts` (already logically separate, just not co-located)
- Persistence: each persisted store (`tasks`, `groups`, `settings`) gets its own `persist` middleware and localStorage key
- **BREAKING**: All existing localStorage state under `daybox-app-store` key is orphaned after migration. A one-shot migration reads old key and writes to new keys.

## Capabilities

### New Capabilities

_(none — pure structural refactor, no new product behavior)_

### Modified Capabilities

- `data-persistence`: persist config changes from single store (key `daybox-app-store`) to three independent persisted stores (keys `daybox-tasks`, `daybox-groups`, `daybox-settings`). A one-shot migration in `App.tsx` handles existing data before new stores mount.

## Impact

- ~22 files touch imports (every `useAppStore(...)` call)
- `app/store.ts` deleted, `app/timerStore.ts` moved
- Three new store files created; one new `app/uiStore.ts`
- Store consumers now import from their feature's store, not from `@/app/store`
- Existing localStorage data migrated once on first load after deploy
- `TaskRow.test.tsx` and `store.test.ts` need per-store rewrites
