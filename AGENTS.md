# DayBox — AGENTS.md

**DayBox** is a local-first Pomodoro timer + task planner SPA. All state lives in localStorage.

## Stack

- **Vite + React 19 + TypeScript 6** — entry: `src/main.tsx` → `src/app/App.tsx`. (`src/App.tsx` does not exist; ignore the Vite scaffold reference.)
- **Tailwind CSS v4** — `@tailwindcss/vite` plugin; tokens in `src/index.css` `@theme`; dark mode via `.dark` class on `<html>`
- **Zustand v5** — four stores, each co-located with the feature that owns it and persisted under its own `daybox-*` localStorage key:
  - `src/features/tasks/store.ts` — persisted (`daybox-tasks`); `Task[]` + CRUD (`addTask`, `updateTask`, `deleteTask`, `toggleTask`, `reorderTasks`, `reassignTasks`, `deleteTasksByGroupId`).
  - `src/features/groups/store.ts` — persisted (`daybox-groups`); `Group[]` + `stickyGroupId`. `DEFAULT_GROUP_ID = 'default'` is declared here and is the only canonical source for that constant.
  - `src/features/timer/store.ts` — persisted (`daybox-timer`); `phase`, `startedAt`, `elapsed`, `sessionPomoCount`, `isRunning`, `focusedTaskId`, and `settings: TimerSettings` (timer settings now live here, not in a separate settings store), plus `start` / `pause` / `reset` / `togglePlayPause` / `advancePhase` / `skip` / `setPhase` / `tick` / `setFocusedTaskId` / `focusTask` / `setTimerSettings`. Timer `tick` is fired by a `setInterval` in `TimerBar` so the 1Hz `elapsed` update does not re-render the task list.
  - `src/features/planner/store.ts` — persisted (`daybox-planner`); `weekStartDay: 0..6` (default `1` = Monday) and `browseDate: 'YYYY-MM-DD' | null`. `browseDate` is persisted so the date browser reopens where the user left it.
- **Theme** is **not** a Zustand store. `src/app/theme.ts` is a hand-rolled `useSyncExternalStore` hook persisted under `daybox-theme`. It exports `useTheme()` returning `[theme, setTheme]`, plus non-hook `getTheme()` / `setTheme()` helpers. The `<html>` element's `.dark` class is toggled as a side effect of `setTheme`.
- **Current view** (`'today' | 'tomorrow' | 'week' | 'backlog' | 'date'`) is **not** a store either. It is `useState<View>('today')` local to `App.tsx:28`.
- **@base-ui/react v1.5** — headless UI primitives used via `src/shared/ui/` wrappers only.
- **Shared UI (`src/shared/ui/`)** — shadcn-style wrappers isolating base-ui. Current primitives: `Button` (cva variants), `Input`, `Label`, `Separator`, `Badge`, `Card` (compound: `.Header`/`.Title`/`.Description`/`.Content`/`.Footer`), `Select` (compound: `.Trigger`/`.Content`/`.Item`/`.Value`/`.Group`/`.Label`/`.Separator`), `Sheet` (compound: `.Trigger`/`.Close`/`.Content`/`.Header`/`.Footer`/`.Title`/`.Description`), `Switch`, `Slider`, `AlertDialog` (compound: `.Trigger`/`.Portal`/`.Overlay`/`.Content`/`.Header`/`.Footer`/`.Title`/`.Description`/`.Action`/`.Cancel`/`.Media`), `Popover` (compound: `.Trigger`/`.Content`/`.Header`/`.Title`/`.Description`), `Tabs` (compound: `.List`/`.Trigger`/`.Content`), `NumberInput`. Consumer code never imports base-ui directly. Several of these (`Card`, `Badge`, `Label`, `Separator`, `Input` in most cases) are exported but currently have no consumer in `src/app/` or `src/features/`; treat the canonical "used" list as the union of files under `src/shared/ui/` and grep references.
- **Shadcn utilities** — `cn()` in `src/shared/lib/utils.ts` (clsx + tailwind-merge); `cva` via `class-variance-authority` for variant components.
- **@dnd-kit/react** — drag-to-reorder in `src/features/tasks/components/TaskList.tsx`.

## Commands

| Command             | What it does                          |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Start Vite dev server                 |
| `npm run build`     | `prebuild` (typecheck) → `vite build` |
| `npm run typecheck` | `tsc -b` (standalone)                 |
| `npm run lint`      | ESLint flat config on `.`             |
| `npm run format`    | Prettier on `.`                       |
| `npm run test`      | `vitest` (watch mode)                 |
| `npm run preview`   | Preview production build              |

Testing: `vitest` config in `vite.config.ts`, environment `jsdom`. Test files sit next to source: `dates.ts` → `dates.test.ts`, `TaskRow.tsx` → `TaskRow.test.tsx`. Run a single file with `npx vitest run src/path/to/file.test.ts`.

## Workflow

After touching codebase make sure to run:

- `npm run format`
- `npm run typecheck`
- `npm run lint`
- `npm run test`

Project uses OpenSpec with `spec-driven` schema. Changes live in `openspec/changes/<name>/`:

- `/opsx-apply <change>` — implement tasks
- `/opsx-sync <change>` — sync delta specs to `openspec/specs/<capability>/spec.md`
- `/opsx-archive <change>` — archive completed change
- `/opsx-propose` — propose a new change
- `/opsx-explore` — explore/think before or during a change

Main specs at `openspec/specs/`, delta specs at `openspec/changes/<name>/specs/`.

## Architecture

```
src/
  app/                — App shell, legacy migration, theme (non-Zustand)
    App.tsx           — view state (useState), mount-time migrations, keyboard shortcuts
    localStorage.ts   — export/import, safeParseAndRoute, migrateLegacyAppStore, migrateLegacySettings
    theme.ts          — useTheme() custom hook, persisted under daybox-theme
    shell/
      SettingsDrawer  — Sheet hosting TimerSettingsPanel, GroupSettingsPanel, Display, Data sections
  features/
    tasks/            — store, schema, types, queries (selectOverdue/selectForDate/selectTodayTasks/selectBacklog), AddTaskRow, TaskList, TaskRow
    timer/            — store, schema, types, alarm (WebAudio synth), TimerBar, TimerSettingsPanel
    groups/           — store, schema, types, constants (GROUP_COLORS), GroupLens, GroupSettingsPanel, GroupTag
    planner/          — store, schema, view components: Today, Tomorrow, Week, Backlog, DateBrowser
  shared/
    lib/              — cn() (utils), createValidatedPersist (persistence), safeParseAndRoute (import-validation)
    ui/               — shadcn-style base-ui wrappers (see Stack)
    dates, id, keyboard, motion, notifications/   — cross-feature primitives
```

### Per-domain state

- Each feature owns its store and its `daybox-*` localStorage key. The theme is a custom hook with its own key. The current view is `useState` in `App.tsx`.
- `src/shared/lib/persistence.ts` exports `createValidatedPersist(name, schema, init, options?)`. It returns a `PersistOptions`-shaped object that zustand's `persist` middleware accepts. On rehydrate, it validates the persisted blob against `schema`; on failure it logs once and resets to `init`. Stores that need to fix up fields after a successful rehydrate pass an `onRehydrateStorage` callback (used by the timer store to advance `elapsed` for wall-clock delta when `isRunning` was `true` at last save).
- `TimerBar` is the only place the 1Hz interval lives. `useTimerStore.tick` only mutates `elapsed` and `startedAt`; no consumer in `features/tasks` or `features/planner` subscribes to either, so the task list does not re-render every second.

### Feature boundaries

- **`features/planner` is a leaf.** It only reads `useTaskStore` and `usePlannerStore`; no other feature imports from it.
- **`features/tasks` is the universal dependency.** All four planner views and the date browser read from it. It is written by:
  - `features/groups` via the public actions `reassignTasks(fromGroupId, toGroupId)` and `deleteTasksByGroupId(groupId)` for group-delete cascade.
  - `features/timer` via `updateTask` from `TimerBar` when a pomo completes / is skipped (currently writes the `pomoCompleted` field directly — see Constraints).
  - `app/localStorage.ts` for export/import.
- **`features/groups` reads `useTaskStore` only via the cascade actions above.** It does not subscribe to task state.
- **`features/timer` reads `useTaskStore` to resolve the focused task** in `TimerBar`. It does not subscribe to the full task list.
- **`useTimerStore.focusedTaskId` is a foreign key** into `useTaskStore.tasks`. There is no referential-integrity enforcement; if the focused task is deleted/reassigned, the id can dangle in the timer store. The UI in `TimerBar` defends at the call site via `tasks.find(...)`. See Constraints.
- **Cross-cutting code is the exception, not the rule.** Only `app/localStorage.ts` (export/import/migration) and `App.tsx` (keyboard shortcuts, migration mount) are allowed to reach across feature boundaries.

### Conventions

- **TypeScript**: `verbatimModuleSyntax` — use `import type` for type-only imports; `erasableSyntaxOnly` — no `enum`, no legacy decorators; `noUnusedLocals` / `noUnusedParameters` enabled. Shared types (`Task`, `Group`, `TimerPhase`, `TimerSettings`) are exported from each feature's `types.ts` and re-exported via the feature barrel.
- **Barrels**: every feature folder has an `index.ts` that re-exports its `store`, `types`, `schema`, and its public components. The rules are:
  1. Components inside a feature import siblings with **relative paths** (`./TaskRow`, `../../store`), never via the feature's own barrel.
  2. The feature barrel re-exports `types` and `schema` so cross-feature code never deep-imports `@/features/<x>/types` or `@/features/<x>/schema`.
  3. Internal helpers (e.g. `createPlaceholderTask`) stay un-exported.
  4. **Exception today**: `features/tasks/index.ts` and `features/groups/index.ts` do not yet re-export `./types` or `./schema`, and several intra-feature components still import from their own barrel. See Constraints.
- **Design tokens**: Tailwind v4 `@theme` in `src/index.css`; CSS custom properties for runtime (dark mode overrides).
- **Dark mode**: class strategy via `document.documentElement.classList.toggle('dark', theme === 'dark')` in `src/app/theme.ts:18` (not `App.tsx`).
- **Export/import**: `downloadExport(exportData(tasks, groups, settings))` and file input → `parseImport()` → per-store `setState()` calls. Schemas per record are validated via `safeParseAndRoute` from `src/shared/lib/import-validation.ts`.
- **Prettier**: run `npm run format` before committing to match CI.

### Constraints & known gotchas

These are current limitations. The architecture review (audit) flagged them; they are listed here so the next agent knows the contracts they have to preserve.

- **1Hz `daybox-timer` write to localStorage.** `useTimerStore.tick` calls `set({ elapsed, startedAt })` once a second. Zustand's `persist` middleware has no `partialize` on the timer store, so the full timer state is serialized and written to `localStorage` on every tick. The persisted shape is small (~200 bytes) but the synchronous `JSON.stringify` + `setItem` at 1Hz is unnecessary work. The timer rehydrate callback already handles wall-clock correction, so `elapsed` / `startedAt` do not need to be persisted. Fix in a follow-up change by adding `partialize` to the timer persist config.
- **`focusedTaskId` can dangle.** `useTaskStore.deleteTask`, `reorderTasks`, `reassignTasks`, and `deleteTasksByGroupId` do **not** clear `useTimerStore.focusedTaskId` if the affected task is the focused one. `TimerBar` reads `s.tasks.find(focusedTaskId)` and falls through to `undefined` if missing, so the UI does not crash, but the id lingers in storage. If you change the tasks-store actions to cascade-clear the timer field, do it inside the store action (not the component) so the invariant holds regardless of caller.
- **`DEFAULT_GROUP_ID` duplication.** `features/groups/store.ts:11` is the only canonical declaration. `app/localStorage.ts:181` and any consumer that needs the literal `'default'` should import it from `@/features/groups`. `features/tasks/store.ts:10` currently has a **second** `const DEFAULT_GROUP_ID = 'default'`; this is a pre-consolidation duplicate. Replace it with an import from `@/features/groups` in a follow-up.
- **`migrateLegacyAppStore` writes unvalidated records.** `localStorage.ts:303-308` reads `state.tasks` / `state.groups` from the legacy v1 blob, casts them to `Task[]` / `Group[]` with no per-record zod validation, and writes them to the live stores. The import path (`parseImport`) does per-record validation via `safeParseAndRoute`; the migration does not. A malformed v1 blob can install broken data that then persists normally. Match the import path's per-record pattern in a follow-up.
- **Barrel re-exports are incomplete.** `features/tasks/index.ts` does not re-export `./types` or `./schema`; `features/groups/index.ts` does not re-export `./types` or `./schema`; `features/planner/index.ts` does not re-export `./schema`. Consumers currently deep-import from these paths. Add the missing re-exports and switch callers to the barrel.
- **Intra-feature barrel imports.** `features/tasks/components/{TaskList,TaskRow,AddTaskRow}.tsx`, `features/groups/components/{GroupLens,GroupSettingsPanel,GroupTag}.tsx`, and `features/timer/components/{TimerBar,TimerSettingsPanel}.tsx` import from `@/features/<self>` for the store and (in some files) sibling components. `features/planner/components/{WeekView,DateBrowser}.tsx` already use relative paths. Sweep to relative paths to comply with the rule.
- **`GroupLens` is rendered but unwired.** `App.tsx:125` passes `selectedGroupId={null} onSelect={() => {}}`. The dropdown renders but selection is a no-op. Either wire it to a real store slice + filter logic in the planner views, or remove it from the header.
- **`useTaskStore.addTask` returns a placeholder on validation failure.** The `Task` it returns has `id: ''`, `title: ''`, etc. The only consumer (`AddTaskRow`) discards the return. Change the signature to `Task | null` or surface the error.
- **Shared UI primitives with no consumer.** `Card`, `Badge`, `Label`, `Separator`, and `Input` (for the bordered case) are exported from `src/shared/ui/` but currently have no consumer in `app/` or `features/`. Each is a decision: apply it to a real site, or delete it from the barrel.
