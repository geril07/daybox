# DayBox — AGENTS.md

**DayBox** is a local-first Pomodoro timer + task planner SPA. All state lives in localStorage.

## Stack

- **Vite + React 19 + TypeScript 6** — `src/main.tsx` → `src/app/App.tsx`
- **Tailwind CSS v4** — configured via `@tailwindcss/vite` plugin; tokens in `src/index.css` `@theme`
- **Zustand** — two stores: `src/app/store.ts` (persisted, app state) and `src/app/timerStore.ts` (non-persisted, timer ticks)
- **@base-ui/react v1.5** — headless UI: Popover, Drawer, AlertDialog, NumberField, Switch, Select, Slider
- **@dnd-kit/react** — drag-to-reorder in `src/features/tasks/TaskList.tsx`

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | `tsc -b && vite build` (order matters) |
| `npm run lint` | ESLint flat config on `src/` |
| `npm run preview` | Preview production build |

Testing runs via `vitest` (config in `vite.config.ts`, environment: `jsdom`). Run with `npx vitest` or `npx vitest run`. Test files sit next to source: `dates.ts` → `dates.test.ts`, `TaskRow.tsx` → `TaskRow.test.tsx`.

## Workflow

Project uses OpenSpec with `spec-driven` schema. Changes live in `openspec/changes/<name>/`:

- `/opsx-apply <change>` — implement tasks from a change
- `/opsx-sync <change>` — sync delta specs to main `openspec/specs/<capability>/spec.md`
- `/opsx-archive <change>` — archive completed change
- `/opsx-propose` — propose a new change
- `/opsx-explore` — explore/think before or during a change

Main specs at `openspec/specs/`, delta specs at `openspec/changes/<name>/specs/`.

## Architecture

```
src/
  app/        — Shell, stores, localStorage export/import
  features/   — tasks/, timer/, groups/, settings/, views/
  shared/     — types, dates, keyboard, notifications, EmptyState
```

- **Two Zustand stores**: `app/store.ts` (persisted) and `app/timerStore.ts` (isolated — 1Hz tick doesn't re-render task list)
- **Dark mode**: class strategy via `document.documentElement.classList.toggle('dark', ...)` in `App.tsx`
- **TypeScript**: `verbatimModuleSyntax` — use `import type` for type-only imports; `noUnusedLocals` / `noUnusedParameters` enabled
- **Design tokens**: Tailwind v4 `@theme` in `src/index.css`; CSS custom properties for runtime (dark mode overrides)
- **Export/import**: `downloadExport(exportData(state))` and file input → `parseImport()` → `setState()`
