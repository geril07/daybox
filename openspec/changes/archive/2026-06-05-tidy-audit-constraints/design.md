# Design

## 1. AGENTS.md shrinks to role pointers

The current `AGENTS.md` Architecture section is 17 lines of directory tree + 3 lines of stack-list + 60+ lines of feature-file enumeration + 12 lines of constraints. The user is right that the file is volatile. The fix is to split static prose from dynamic detail.

**Replace the current `## Architecture` and `### Constraints & known gotchas` sections with a single block that:**

1. Names the three top-level roles and what each is _for_ (not what is in it).
2. Lists the invariants that the agent must enforce when adding a feature.
3. Notes that the `architecture` OpenSpec spec is the canonical source for the rules, with one sentence pointing at it.

Stack (lines 7–19) and Commands (lines 21–33) and Workflow (lines 35–50) are unchanged — those don't drift.

The 9 constraint items move into the relevant capability spec (see §3 below). The 2 bonus items are folded into the same.

**What AGENTS.md does NOT list**: per-feature files, per-store actions, per-primitive inventory, file:line citations. Anything that drifts on a normal feature commit is out.

## 2. New `architecture` capability

The capability encodes invariants, not files. It has five requirements:

1. **One folder per domain under `features/`.** Each owns `store.ts`, `schema.ts`, `types.ts`, `queries.ts`, `components/`, and a barrel `index.ts` that re-exports `store`, `types`, `schema`, and the public components. Adding a new feature is "create a folder with these six entries"; no doc update is required.
2. **Intra-feature imports use relative paths.** Components inside a feature import siblings via `./TaskRow`, `../../store`, etc. — never via `@/features/<self>`. Tests in `*.test.tsx` follow the same rule.
3. **Cross-feature imports go through the barrel.** Consumers in another feature import from `@/features/<x>`, never from `@/features/<x>/types` or `@/features/<x>/schema`. The barrel re-exports are part of the public surface.
4. **Cross-cutting imports are exceptional.** Only `src/app/bootstrap.ts` (export/import/migration) and `src/app/App.tsx` (keyboard, migration mount, view state) may import from more than one feature. Other features read each other only through public actions. (A consumer that needs to call a foreign store's action imports the _store_ from the barrel, not a deep file.)
5. **`DEFAULT_GROUP_ID` is canonical.** The string `'default'` is declared exactly once, in `src/features/groups/`, and exported. No other file declares it; no other file hard-codes the literal.

The new `task-management` and `group-management` requirements (cascade, return type, group id) are _not_ in this spec — they are feature-specific behaviour.

## 3. Delta specs

| Capability           | Delta                                                               | Spec language                        |
| -------------------- | ------------------------------------------------------------------- | ------------------------------------ |
| `architecture` (new) | 5 requirements above                                                | `### Requirement: …` × 5             |
| `data-persistence`   | per-record validation in legacy migration                           | adds one requirement + two scenarios |
| `pomodoro-timer`     | partialize on persist; runtime state not persisted                  | adds one requirement + two scenarios |
| `task-management`    | `addTask` returns `Task \| null`; focused-task cascade in 4 actions | adds two requirements + 4 scenarios  |
| `group-management`   | `DEFAULT_GROUP_ID` canonical location; no `<GroupLens />` in header | adds two requirements + 2 scenarios  |

## 4. Code change: `createValidatedPersist` learns `storage`

`createValidatedPersist(name, schema, init, options?)` currently returns `{ name, onRehydrateStorage }`. Add an optional `storage?: PersistStorage<S>` to the options. When provided, the returned object also exposes `storage`, which zustand's `persist` middleware picks up in place of the default `createJSONStorage(() => localStorage)`.

```ts
export interface ValidatedPersistOptions<T = unknown> {
  onRehydrateStorage?: () => (state: unknown) => void
  storage?: PersistStorage<T>
}

export function createValidatedPersist<TInit = any>(
  name: string,
  schema: ZodSchemaLike,
  init: TInit,
  options?: ValidatedPersistOptions<TInit>,
) {
  const { onRehydrateStorage: userOnRehydrate, storage } = options ?? {}
  // …existing onRehydrateStorage construction…
  return {
    name,
    storage,
    onRehydrateStorage: …,
  }
}
```

The store-side `as any` cast (e.g. `src/features/timer/store.ts:190`) stays — that's a zustand-type leak, out of scope.

## 5. Code change: debounced storage for the timer

A new helper `createDebouncedStringStorage(base, delayMs)` lives at `src/shared/utils/debounced-storage.ts`. It wraps a `StateStorage` (string-based: `getItem` / `setItem` / `removeItem`):

- `setItem(name, value)` — record `(name, value)` as the pending write and start a `delayMs` timer. Subsequent `setItem` calls before the timer fires replace the pending value (not queue another write).
- `getItem` / `removeItem` — passthrough. `removeItem` also clears any pending write.
- On the first invocation, register two window listeners: `beforeunload` (flush) and `visibilitychange → hidden` (flush). This prevents losing the last in-flight second when the user closes the tab or switches apps.

The timer store then composes:

```ts
import { createDebouncedStringStorage } from '@/shared/utils/debounced-storage'

const debouncedLocalStorage = createDebouncedStringStorage(localStorage, 1000)
const timerPersistStorage = createJSONStorage(() => debouncedLocalStorage)
```

…and passes `storage: timerPersistStorage` to `createValidatedPersist`. The rehydrate wall-clock-correction callback is unchanged: when `isRunning` is `true` on rehydrate, `elapsed` is advanced by `now - startedAt` and `startedAt` is reset to `now`. The runtime state continues to be persisted (the user wants resume-on-reload), and the debounce removes the 1Hz `setItem` cost.

The other three stores (tasks, groups, planner) continue to use the default `createJSONStorage(() => localStorage)` — only the timer is debounced because the tick is the only 1Hz writer in the app.

This aligns the data-persistence spec with the code (the previous spec said "Timer runtime state SHALL NOT be persisted", but the code did persist it; this change MODIFIES the spec to match the desired behaviour and the implementation).

## 6. Code change: focused-task cascade in `useTaskStore`

The four actions in `src/features/tasks/store.ts` that can orphan `focusedTaskId` get a cascade step. The cascade calls `useTimerStore.getState().setFocusedTaskId(null)` if the affected task matches the focused id.

- `deleteTask(id)` — cascade if `id === focusedTaskId`.
- `reorderTasks(tasks)` — no cascade. Reordering preserves identity, so the focused task still exists with the same id.
- `reassignTasks(from, to)` — cascade only if the focused task's group was reassigned (i.e. the focused task is in the source group). Implementation: check the _original_ state for the focused task's group.
- `deleteTasksByGroupId(groupId)` — cascade if the focused task's group is the deleted group.

The cascade lives in the store action, not in the component — the invariant holds regardless of who calls the action (component, migration, import, test).

The timer store is imported at the top of `features/tasks/store.ts`. This is the one cross-feature import in the file. Per the `architecture` spec, intra-feature imports are relative; _inter_-feature imports go through the barrel. The timer store is imported as `import { useTimerStore } from '@/features/timer'`. The cascade itself is a one-line addition in each action.

## 7. Code change: `addTask` returns `Task | null`

`useTaskStore.addTask` currently returns a placeholder `Task` (empty `id`, empty `title`, etc.) on validation failure (`src/features/tasks/store.ts:54–61`). The only consumer is `AddTaskRow`, which already discards the return.

Change the signature: `addTask: (title, groupId?, date?) => Task | null`. On validation failure, return `null` after `console.warn`. Delete the now-unused `createPlaceholderTask` function.

`AddTaskRow.handleSubmit` (`src/features/tasks/components/AddTaskRow.tsx:28–53`) already short-circuits on empty input. For a 280+-char input it calls `addTask` and gets `null`; the existing call site discards the return, so the user-visible behaviour is unchanged (the task isn't created, a warning is logged). Surfacing a UI error for the long-title case is _out of scope_ for this change.

## 8. Code change: `DEFAULT_GROUP_ID`

1. In `src/features/groups/store.ts:11`, change `const DEFAULT_GROUP_ID = 'default'` → `export const DEFAULT_GROUP_ID = 'default'`.
2. In `src/features/tasks/store.ts:10`, delete the local `const DEFAULT_GROUP_ID = 'default'` and add `import { DEFAULT_GROUP_ID } from '@/features/groups'` to the existing `@/features/groups` import (or a new one).
3. In `src/app/bootstrap.ts:181`, delete the local `const DEFAULT_GROUP_ID = 'default'` and add `import { DEFAULT_GROUP_ID } from '@/features/groups'` at the top.
4. **Bonus**: in `src/features/groups/components/GroupSettingsPanel.tsx:37`, replace the bare string `groupId: 'default'` with `groupId: DEFAULT_GROUP_ID` and import it. This is the worst of the four — a literal that doesn't even use the constant.

The schema (`GroupSchema.id` is `z.string().min(1)`) doesn't care which string the constant is, so we can change the literal value in the future without a migration.

## 9. Code change: migration per-record validation

`migrateLegacyAppStore` (`src/app/bootstrap.ts:287–323`) reads `daybox-app-store`, validates the envelope against `LegacyAppStoreSchema`, then writes `state.tasks as Task[]` and `state.groups as Group[]` without per-record validation. A malformed record would install broken data and then be re-persisted.

Mirror `parseImport`'s record-layer loop:

```ts
const migratedTasks: Task[] = []
for (const raw of state.tasks ?? []) {
  const r = safeParseAndRoute({
    value: raw,
    schema: TaskSchema,
    layer: 'record',
  })
  if (r.ok) migratedTasks.push(r.data)
  else console.warn('[daybox] Legacy task dropped:', r.reason)
}
if (migratedTasks.length > 0) useTaskStore.setState({ tasks: migratedTasks })
```

Same shape for groups. The legacy key is still removed in `finally`.

`migrateLegacySettings` doesn't need the same treatment: it calls `setTimerSettings` (which runs its own `safeParse`) and `setWeekStartDay` (which the planner store could defensively validate, but it's a `0..6` int — the legacy schema already constrains it). The `theme` field is `z.enum(['light','dark'])` and the existing code already does a string check.

## 10. Code change: barrels re-export and intra-feature paths

**Barrel updates**:

- `src/features/tasks/index.ts`: add `export * from './types'` and `export * from './schema'`.
- `src/features/groups/index.ts`: add `export * from './types'` and `export * from './schema'`.
- `src/features/planner/index.ts`: add `export * from './schema'`. (`./types` doesn't exist — `View` and `TaskRange` are exported from `queries.ts`, not a `types.ts`. Skip the `types` line for planner; if a `types.ts` is added later, fold it in then.)
- `src/features/timer/index.ts`: already re-exports both. No change.

**Deep-import → barrel**:

- `src/app/bootstrap.ts:6,7,8,10,11` — switch `@/features/groups/schema`, `@/features/groups/types`, `@/features/planner/schema`, `@/features/tasks/schema`, `@/features/tasks/types` to the barrel. (`useTaskStore` is already from the barrel.)
- `src/features/tasks/components/TaskRow.tsx:6` — `@/features/tasks/types` → barrel (or relative; it's an intra-feature import, see below).
- `src/features/tasks/components/TaskList.tsx:10` — same.
- `src/features/tasks/components/AddTaskRow.tsx:5` — `@/features/groups/types` → barrel (cross-feature, so barrel is correct).
- `src/features/groups/components/GroupSettingsPanel.tsx:4` — same.

**Intra-feature relative paths** (the `architecture` invariant):

- `src/features/tasks/components/TaskRow.tsx:5` — `useTaskStore` from `@/features/tasks` → `../../store`. `:6` is a type-only import of `Task` from `@/features/tasks/types` → `../../types` (now also reachable from the barrel; relative is preferred per the rule).
- `src/features/tasks/components/TaskRow.test.tsx:5` — same.
- `src/features/tasks/components/AddTaskRow.tsx:6` — `useTaskStore` from `@/features/tasks` → `../../store`. `:5` is a type-only import of `Group` from `@/features/groups/types` (cross-feature) → `@/features/groups`.
- `src/features/tasks/components/TaskList.tsx:9` — `TaskRow, useTaskStore` from `@/features/tasks` → `./TaskRow` and `../../store`. `:10` is `Task` type from `@/features/tasks/types` → `../../types`.
- `src/features/groups/components/GroupLens.tsx:1` — `useGroupStore` from `@/features/groups` → `../../store`.
- `src/features/groups/components/GroupSettingsPanel.tsx:3` — `useGroupStore` from `@/features/groups` → `../../store`. `:4` is `Group` type from `@/features/groups/types` (cross-feature) → `@/features/groups`. The `useTaskStore` import on `:5` is cross-feature, stays as `@/features/tasks`.
- `src/features/groups/components/GroupTag.tsx:1` — `useGroupStore` from `@/features/groups` → `../../store`.
- `src/features/timer/components/TimerBar.tsx:5` — `playAlarm, useTimerStore` from `@/features/timer` → `../../alarm` and `../../store`. `useTaskStore` on `:4` is cross-feature, stays.
- `src/features/timer/components/TimerSettingsPanel.tsx:1` — `useTimerStore` from `@/features/timer` → `../../store`.

Planner components already use relative paths (`DayView.tsx:4`, `WeekView.tsx:5`, `DateBrowser.tsx:7`).

## 11. Code change: remove `<GroupLens />` from header

`src/app/App.tsx:117` renders `<GroupLens selectedGroupId={null} onSelect={() => {}} />` and `:7` imports it. Both go away. The component file (`src/features/groups/components/GroupLens.tsx`) is kept for future use.

## 12. Code change: prune dead `shared/ui` primitives

Delete `src/shared/ui/{input,label,separator,badge,card}.tsx`. Remove their export lines from `src/shared/ui/index.ts`. Five primitives, no consumers in `app/` or `features/`. `Sheet` is used in `SettingsDrawer`; `EmptyState` is used in three planner views; the rest (`Button`, `NumberInput`, `Switch`, `Select*`, `Popover*`, `Tabs*`, `AlertDialog*`, `Slider`) are used and stay.

## 13. Risk and verification

- `tsc -b` after each group of edits (barrels, then stores, then `shared/ui`, then `App.tsx`).
- `npm run test` covers `bootstrap.test.ts` (migration), `tasks/store.test.ts` and `groups/store.test.ts` (cascade, return type), and `TaskRow.test.tsx` (timer interaction). The new behaviours have new spec scenarios; the user-facing tests stay green.
- The `GroupLens` removal is observable in the header.
