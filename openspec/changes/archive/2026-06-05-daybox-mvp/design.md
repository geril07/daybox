## Context

DayBox is a local-first Pomodoro timer fused with a lightweight task planner. Built with Vite + React 18 + TypeScript + Tailwind CSS v4. All state lives in localStorage.

## Goals / Non-Goals

**Goals:**

- Data model that cleanly separates a task's Group (what it is) from its Date (when to do it)
- Flat task list per time view with manual reorder
- Pomodoro timer bound to a task with full focus/break cycle
- Progressive disclosure of group UI (hidden until 2+ groups)
- All state persisted to localStorage; export/import for backup

**Non-Goals:**

- Backend, accounts, multi-user
- Drag-between-views for reschedule (date-picker popup instead)
- Group filter lens in v1 (group is visual tag only)
- SSR, routing library, or state management library beyond Zustand (lightweight enough to not need replacing)

## Data Model

```typescript
interface Task {
  id: string
  title: string
  groupId: string
  date: string | null // "2025-06-04" or null for Backlog
  pomoEstimate: number // 0 = no estimate
  pomoCompleted: number
  sortOrder: number // per-date ordering
  completed: boolean
  completedAt: string | null
  createdAt: string
}

interface Group {
  id: string
  name: string
  color: string // oklch color string
  createdAt: string
}

interface TimerSettings {
  focusDuration: number // default 25 (minutes)
  shortBreakDuration: number // default 5
  longBreakDuration: number // default 15
  longBreakInterval: number // default 4 (pomodoros)
  autoStartBreaks: boolean
  autoStartPomodoros: boolean
  alarmSound: 'bell' | 'digital' | 'gentle' | 'ping'
  alarmVolume: number // 0-1, default 0.5
  alarmRepeat: number // 1-5, default 3
}

interface AppSettings {
  timer: TimerSettings
  theme: 'light' | 'dark'
  weekStartDay: 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0=Sun, 1=Mon, default 1
}

type View = 'today' | 'tomorrow' | 'week' | 'backlog' | 'date'
type TimerPhase = 'focus' | 'shortBreak' | 'longBreak'
```

## State Management

The localStorage blob wraps all state with a version:

```typescript
interface StoreBlob {
  version: 1
  tasks: Task[]
  groups: Group[]
  settings: AppSettings
  timerState: {
    phase: TimerPhase
    startedAt: number | null
    elapsed: number
    sessionPomoCount: number
  }
  focusedTaskId: string | null
}
```

On load, the version is checked:

- **Matches current version** → hydrate normally
- **Older version** → run migration functions sequentially per version, then hydrate
- **Newer version** → warn and replace with fresh state (can't reverse-engineer future schema)
- **Missing / corrupted** → treat as fresh install

On import, the rules differ: imported data comes from an explicit user action, so be more permissive.

- **Same or older version** → migrate up if needed, then import
- **Newer version** → import known fields + ignore extras. Forward compatibility assumes the schema evolves by adding fields, not removing/renaming them. Unknown top-level keys are carried through on re-export.
- **Missing / corrupted** → show error, abort import

Two Zustand stores split by concern to isolate timer re-renders:

**`useAppStore`** — tasks, groups, settings, UI state (view, browseDate, focusedTaskId). Wrapped with `persist` middleware for localStorage sync.

**`useTimerStore`** — timer-specific state: `{ phase, startedAt, elapsed, sessionPomoCount, isRunning }`. Not persisted (timer resets on page load) — only `startedAt` + `phase` survive reload so the timer can resume from the compute engine.

This split means:

- `useTimerStore(s => s.secondsRemaining)` updates every second but nothing in the task list re-renders
- `useAppStore(s => s.tasks)` stays stable during a running timer

## File Architecture — Module-Based

Headless UI primitives from **Base UI v1.5** (`@base-ui/react`) — Popover, Dialog, Drawer, Menu, Switch, Slider, Select, AlertDialog, NumberField. All styled via direct `className` passthrough with Tailwind.

```
src/
  app/                          — App shell, entry, shared stores
    main.tsx                    — Entry point, ReactDOM.createRoot
    App.tsx                     — App shell, layout, view routing
    store.ts                    — Persisted Zustand app store (tasks, groups, settings, UI state)
    timerStore.ts               — Non-persisted Zustand timer store (isolated, ticks every 1s)
    localStorage.ts             — Export/import helpers, migration registry, version check
  features/
    tasks/                      — Task CRUD, quick-add, inline editing, reschedule
      TaskRow.tsx               — Single task row (checkbox, title, group tag, pomo dots, actions)
      AddTaskRow.tsx            — Quick-add input with group chip
      TaskList.tsx              — Filtered task list for current view
      PomoPopup.tsx             — Pomodoro estimate popup
      DatePickerPopup.tsx       — Date quick-presets + input
    timer/                      — Pomodoro timer engine + UI
      TimerBar.tsx              — Fixed-bottom bar (digits, controls, session dots, progress)
      alarm.ts                  — Web Audio API: multiple alarm sounds, volume, repeat
    groups/                     — Group management + progressive disclosure
      GroupTag.tsx              — Colored dot + name on task rows
      GroupLens.tsx             — Dropdown filter (hidden when 1 group)
      GroupSettings.tsx         — CRUD UI in settings drawer
    settings/                   — Settings drawer
      SettingsDrawer.tsx        — Slide-out panel with all sections
    views/                      — Time-based view implementations
      TodayView.tsx             — Overdue section + today tasks
      TomorrowView.tsx          — Tasks for tomorrow
      WeekView.tsx              — Calendar week grouped by day
      BacklogView.tsx           — Unscheduled tasks
      DateBrowser.tsx           — Arbitrary date view
  shared/                       — Cross-cutting utilities and UI
    types.ts                    — All TypeScript interfaces
    dates.ts                    — formatDate, isToday, isOverdue, getWeekRange etc.
    keyboard.ts                 — Global keyboard shortcut handler
    notifications.ts            — Browser notification helper
    EmptyState.tsx              — Contextual empty view placeholder
  index.css                     — Tailwind directives + design tokens
```

## Component Tree

```
<App>                                  — app/App.tsx
  <Header>                             — app/Header.tsx
    <Logo />
    <ViewTabs />
    <DateStepper />
    <GroupLens />                       — features/groups/GroupLens.tsx
    <GearIcon />
  </Header>
  <AddTaskRow />                      — features/tasks/AddTaskRow.tsx
  <TaskList>                           — features/tasks/TaskList.tsx
    <OverdueSection />                  — features/views/TodayView.tsx
    <TaskRow />*                        — features/tasks/TaskRow.tsx
    <PomoPopup />                       — features/tasks/PomoPopup.tsx
    <DatePickerPopup />                 — features/tasks/DatePickerPopup.tsx
    <EmptyState />                      — shared/EmptyState.tsx
  </TaskList>
  <TimerBar>                           — features/timer/TimerBar.tsx
    <TimerMode />
    <TimerTask />
    <TimerDigits />
    <TimerControls />
    <SessionDots />
  </TimerBar>
  <SettingsDrawer />                   — features/settings/SettingsDrawer.tsx
</App>
```

## Key Design Decisions

| Decision                | Choice                                                        | Rationale                                                                                                                                                              |
| ----------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reschedule UX           | Date-picker popup (not drag-between-tabs)                     | Simpler implementation; avoids drag-drop complexity across view boundaries                                                                                             |
| Group filter lens       | Deferred; group is visual tag only in v1                      | Reduces scope; progressive disclosure means most users may never need it                                                                                               |
| Build tooling           | Vite + React + TypeScript + Tailwind v4                       | Production-ready stack; fast dev server, type safety, utility-first CSS                                                                                                |
| State management        | Zustand (two stores: app + timer)                             | 0.5KB gzip, selector-based re-render isolation (critical for 1Hz timer ticks), built-in persist middleware, trivial export/import                                      |
| Timer precision         | Store "startedAt" timestamp, compute remaining on tick        | Avoids setInterval drift; accurate even after tab-away                                                                                                                 |
| Task ordering           | @dnd-kit/react sortable + sortOrder renumber on drop          | ~5KB, touch/keyboard/auto-scroll built-in, simplest API (DragDropProvider + useSortable hook)                                                                          |
| Persistence             | localStorage with full-state serialize/deserialize            | Simplest local-first approach; export/import as JSON file                                                                                                              |
| ID generation           | crypto.randomUUID()                                           | Native, no dependency, available in all modern browsers                                                                                                                |
| Theme                   | CSS custom properties swapped via Tailwind dark mode          | Built-in Tailwind support; clean separation                                                                                                                            |
| Headless UI primitives  | Base UI v1.5                                                  | Better component coverage than Radix (Drawer, Slider, NumberField all in one package), direct className passthrough (no asChild), typed event details, active MUI team |
| Styling                 | Tailwind utility classes + CSS variables for design tokens    | Zero runtime; design tokens from HTML prototype map to Tailwind theme extension                                                                                        |
| LocalStorage versioning | Integer version field at root of stored blob, checked on load | Enables forward-compatible schema migrations; unknown-version → wipe rather than corrupt                                                                               |
| Keyboard shortcuts      | Global handler via keydown listener on mount                  | Enter=add, Space=start/pause timer, N=focus add-task, Escape=close/cancel                                                                                              |

## Testing Strategy

**Stack:** Vitest + React Testing Library + jsdom.

```
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

**What to unit test (pure logic):**

- `shared/dates.ts` — isToday, isOverdue, getWeekRange, getWeekDays (parameterize weekStartDay)
- `app/store.ts` — task CRUD actions, group CRUD, settings updates, migration functions, version check, export/import serialization
- `app/timerStore.ts` — start, pause, reset, skip, cycle transitions, drift math
- `features/timer/alarm.ts` — sound generation with varying volume/repeat

**What to component test (interactions):**

- `TaskRow` — complete toggle, inline edit, delete, focus click, reschedule
- `AddTaskRow` — Enter creates task, #group parsing
- `TimerBar` — display formats, play/pause/reset button clicks
- `PomoPopup` — estimate selection updates store
- `DatePickerPopup` — preset buttons set date

**What NOT to test in v1:**

- Visual regression (screenshot tests)
- E2E flows (add in a later pass when the app stabilizes)
- Base UI internals (they test their own)
- Tailwind styles (trust the framework)

**Convention:** Test files side-by-side with source:

```
shared/dates.ts          → shared/dates.test.ts
app/store.ts             → app/store.test.ts
features/tasks/TaskRow.tsx → features/tasks/TaskRow.test.tsx
```

## Risks / Trade-offs

- **[Loss of data]** localStorage can be cleared accidentally → mitigation: export/import as manual backup
- **[Timer drift]** Tab throttling in background → mitigation: store `startedAt` timestamp and compute elapsed time; pause when tab hidden
- **[TypeScript complexity]** Steeper learning curve for simple app → mitigation: minimal types, no generics, no complicated patterns
- **[No group filter in v1]** Users with many groups may want filtering → mitigation: easy to add later as a dropdown; data model supports it
