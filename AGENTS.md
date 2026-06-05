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
- **Shared UI (`src/shared/ui/`)** — shadcn-style wrappers isolating base-ui. Current primitives: `Button` (cva variants), `Select` (compound: `.Trigger`/`.Content`/`.Item`/`.Value`/`.Group`/`.Label`/`.Separator`), `Sheet` (compound: `.Trigger`/`.Close`/`.Content`/`.Header`/`.Footer`/`.Title`/`.Description`), `Switch`, `Slider`, `AlertDialog` (compound: `.Trigger`/`.Portal`/`.Overlay`/`.Content`/`.Header`/`.Footer`/`.Title`/`.Description`/`.Action`/`.Cancel`/`.Media`), `Popover` (compound: `.Trigger`/`.Content`/`.Header`/`.Title`/`.Description`), `Tabs` (compound: `.List`/`.Trigger`/`.Content`), `NumberInput`, `EmptyState`. Consumer code never imports base-ui directly.
- **Shadcn utilities** — `cn()` in `src/shared/lib/utils.ts` (clsx + tailwind-merge); `cva` via `class-variance-authority` for variant components.
- **@dnd-kit/react** — drag-to-reorder in `src/features/tasks/components/TaskList.tsx`.
- **Persistence** — every persisted zustand store uses `createValidatedPersist(name, schema, init, options?)` from `src/shared/utils/persistence.ts`. The timer store additionally passes a `storage` option wrapping `localStorage` with `createDebouncedStringStorage` (1s debounce, `beforeunload` + `visibilitychange` flush) to coalesce the 1Hz `tick` write — see the `pomodoro-timer` capability spec for the policy.

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
  app/        — shell, view state, theme, export/import/migration (only files allowed to reach across features)
  features/   — one folder per domain; owns store, schema, types, queries, components, barrel
  shared/     — cross-feature primitives: ui wrappers, lib utils, dates, id, keyboard, motion, notifications
```

The full rule set (folder shape, barrel re-exports, intra-feature relative paths, cross-cutting allowlist, default-group id canonicalization) lives in the `architecture` OpenSpec capability at `openspec/specs/architecture/spec.md`. Read that spec when adding a feature or refactoring imports — this section does not duplicate it.
