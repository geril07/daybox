# DayBox — AGENTS.md

**DayBox** is a local-first Pomodoro timer + task planner SPA. All state lives in localStorage.

## Stack

- **Vite + React 19 + TypeScript 6** — entry: `src/main.tsx` → `src/app/App.tsx`. (`src/App.tsx` does not exist; ignore the Vite scaffold reference.)
- **Tailwind CSS v4** — `@tailwindcss/vite` plugin; tokens in `src/index.css` `@theme`; dark mode via `.dark` class on `<html>`
- **Zustand v5** — five stores, all co-located with the feature that owns them:
  - `src/app/uiStore.ts` — non-persisted; current view (`today`/`tomorrow`/`week`/`backlog`/`date`) and `browseDate`
  - `src/app/settingsStore.ts` — persisted (`daybox-settings`); `AppSettings` (theme, weekStartDay, `TimerSettings`)
  - `src/features/tasks/store.ts` — persisted (`daybox-tasks`); `Task[]` + CRUD actions
  - `src/features/groups/store.ts` — persisted (`daybox-groups`); `Group[]` + `stickyGroupId`
  - `src/features/timer/store.ts` — persisted (`daybox-timer`); `phase`, `startedAt`, `elapsed`, `sessionPomoCount`, `isRunning`, `focusedTaskId`, plus `start`/`pause`/`reset`/`togglePlayPause`/`advancePhase`/`skip`/`focusTask`. Timer `tick` is fired by a `setInterval` in `TimerBar` so the 1Hz update doesn't re-render the task list.
- **@base-ui/react v1.5** — headless UI primitives used via `src/shared/ui/` wrappers only
- **Shared UI (`src/shared/ui/`)** — shadcn-style wrappers isolating base-ui. Current primitives: `Button` (cva variants), `Input`, `Label`, `Separator`, `Badge`, `Card` (compound: `.Header`/`.Title`/`.Description`/`.Content`/`.Footer`), `Select` (compound: `.Trigger`/`.Content`/`.Item`/`.Value`/`.Group`/`.Label`/`.Separator`), `Sheet` (compound: `.Trigger`/`.Close`/`.Content`/`.Header`/`.Footer`/`.Title`/`.Description`), `Switch`, `Slider`, `AlertDialog` (compound: `.Trigger`/`.Portal`/`.Overlay`/`.Content`/`.Header`/`.Footer`/`.Title`/`.Description`/`.Action`/`.Cancel`/`.Media`), `Popover` (compound: `.Trigger`/`.Content`/`.Header`/`.Title`/`.Description`), `Tabs` (compound: `.List`/`.Trigger`/`.Content`), `NumberInput`. Consumer code never imports base-ui directly.
- **Shadcn utilities** — `cn()` in `src/shared/lib/utils.ts` (clsx + tailwind-merge); `cva` via `class-variance-authority` for variant components.
- **@dnd-kit/react** — drag-to-reorder in `src/features/tasks/components/TaskList.tsx`

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

- npm run format
- npm run typecheck
- npm run lint
- npm run test

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
  app/        — Shell, settings/ui stores, localStorage export/import, legacy migration
    shell/    — SettingsDrawer
  features/
    tasks/    — store, queries (selectOverdue/selectForDate/selectTodayTasks/selectBacklog), AddTaskRow, TaskList, TaskRow
    timer/    — store, alarm (WebAudio synth), TimerBar, TimerSettingsPanel
    groups/   — store, GroupLens, GroupSettingsPanel, GroupTag
    planner/  — view components: Today, Tomorrow, Week, Backlog, DateBrowser
  shared/
    lib/      — cn() utility (clsx + tailwind-merge)
    ui/       — shadcn-style base-ui wrappers (see Stack)
    types, id, dates, keyboard, notifications, EmptyState
```

- **Per-domain Zustand stores** with their own localStorage keys (see Stack). The legacy single-store key `daybox-app-store` is migrated on first read by `App.tsx` into the new stores; the key is then removed.
- **Dark mode**: class strategy via `document.documentElement.classList.toggle('dark', theme === 'dark')` in `App.tsx`
- **TypeScript**: `verbatimModuleSyntax` — use `import type` for type-only imports; `erasableSyntaxOnly` — no `enum`, no legacy decorators; `noUnusedLocals` / `noUnusedParameters` enabled
- **Design tokens**: Tailwind v4 `@theme` in `src/index.css`; CSS custom properties for runtime (dark mode overrides)
- **Export/import**: `downloadExport(exportData(tasks, groups, settings))` and file input → `parseImport()` → `useTaskStore.setState()` etc.
- **Intra-feature imports**: components inside a feature import siblings with relative paths (`./TaskRow`), not via the feature's own barrel; barrels exist only for cross-feature consumption.
- **Prettier**: run `npm run format` before committing to match CI
