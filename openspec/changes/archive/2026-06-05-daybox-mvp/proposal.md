## Why

Pomofocus is a great execution tool but flat: it only knows about today's list. There's no backlog, no "do this tomorrow," no sense of a week. Planning lives in your head or a second app, and unfinished work evaporates. DayBox fixes the missing dimension — time — by fusing a Pomodoro timer with a lightweight task planner that spans days.

## What Changes

This is the initial build of the entire DayBox app. It introduces:

- A single-page web application (React 18 + Babel standalone, no build step)
- Task capture, scheduling across days, and Pomodoro execution bound to tasks
- Groups as secondary metadata with progressive disclosure
- Four time views (Today, Tomorrow, This Week, Backlog) + a date browser
- Overdue task roll-over into Today
- Persistent Pomodoro timer docked at the bottom with full focus/break cycle
- Settings drawer with timer config, theme toggle, and data export/import
- Local-first persistence (localStorage)

## Capabilities

### New Capabilities

- `task-management`: Create, edit, delete, reorder, and complete tasks. Each task has a title, group assignment, optional date, pomodoro estimate, and completion status.
- `group-management`: Create, rename, and delete groups (with task resolution). One default group on install; group UI hidden until a second group exists.
- `time-views`: Today, Tomorrow, This Week (rolling 7 days), Backlog (unscheduled), and date browser. Each view filters tasks by date. Overdue tasks surface in Today.
- `pomodoro-timer`: Full timer with focus → short break → focus → … → long break cycle. Binds to a task, increments completed pomodoros on finish. Configurable durations, auto-start, sound notifications.
- `settings`: Timer duration config, long-break interval, auto-start toggles, sound toggle, light/dark theme, data export/import.
- `data-persistence`: LocalStorage persistence of all state (tasks, groups, settings, timer session history). Export as JSON file; import via file upload.

### Modified Capabilities

None — this is the initial build.

## Impact

- New files in project root (HTML, JSX components, store)
- No external backend or dependencies beyond React 18 UMD + Babel standalone (existing setup)
- No breaking changes to existing code (greenfield feature)
