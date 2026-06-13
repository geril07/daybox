# DayBox

Local-first Pomodoro timer and task planner for shaping today, tomorrow, and the week.

![DayBox screenshot](docs/assets/daybox-screenshot.png)

DayBox is a focused planning app for turning loose tasks into a concrete day. It combines a lightweight task planner with a Pomodoro timer, task groups, and local-first data storage.

## Features

- Plan tasks for today, tomorrow, the week, or an unscheduled inbox.
- Track Pomodoro estimates and completed focus sessions per task.
- Focus the timer on a specific task so the current interval has a clear target.
- Organize tasks with color-coded groups.
- Tune focus, short break, and long break durations.
- Export and import all app data as JSON.
- Keep data local by default, with optional Google Drive backup.
- Switch between light and dark themes.

## Getting Started

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Scripts

- `npm run dev` starts the Vite development server.
- `npm run build` typechecks and builds the production app.
- `npm run typecheck` runs TypeScript checks.
- `npm run lint` runs ESLint.
- `npm run format` formats the codebase with Prettier.
- `npm run test` runs Vitest.
- `npm run preview` previews the production build.

## Tech Stack

- React 19 and ReactDOM 19
- Vite 8 and TypeScript 6
- Zustand for local state
- Zod for validation
- Tailwind CSS 4 and shadcn UI primitives
- Base UI, lucide-react, motion, and dnd-kit
- Vitest and Testing Library

## Data And Privacy

DayBox is local-first. Tasks, groups, planner settings, timer settings, and theme preference are stored in browser `localStorage` by default. Export/import is available from the app settings, and Google Drive backup is optional.
