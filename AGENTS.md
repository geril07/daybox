# DayBox — AGENTS.md

**DayBox** is a local-first Pomodoro timer + task planner SPA. All state lives in localStorage.

## Stack

- React 19, ReactDOM 19
- @base-ui/react 1.5, tailwindcss 4, shadcn
- lucide-react
- zustand 5, zod 4
- @dnd-kit/react + @dnd-kit/helpers
- motion
- Vite 8 + @vitejs/plugin-react, TypeScript 6
- vitest, @testing-library/react + jest-dom, jsdom
- eslint, prettier

## Commands

| Command              | What it does                          |
| -------------------- | ------------------------------------- |
| - `npm run dev:full` | Start Vercel dev server (SPA + API)   |
| - `npm run dev`      | Start Vite dev server for UI-only HMR |
| `npm run build`      | `prebuild` (typecheck) → `vite build` |
| `npm run typecheck`  | `tsc -b` (standalone)                 |
| `npm run lint`       | ESLint flat config on `.`             |
| `npm run format`     | Prettier on `.`                       |
| `npm run test`       | `vitest` (watch mode)                 |
| `npm run preview`    | Preview production build              |

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
  modules/    — one folder per domain; owns store, schema, types, queries, components, barrel
  shared/     — cross-feature primitives: ui wrappers, lib utils, dates, id, keyboard, motion, notifications
```

The full rule set (folder shape, barrel re-exports, intra-feature relative paths, cross-cutting allowlist, default-group id canonicalization) lives in the `architecture` OpenSpec capability at `openspec/specs/architecture/spec.md`. Read that spec when adding a feature or refactoring imports — this section does not duplicate it.
