## 1. Project Scaffold

- [x] 1.1 Scaffold Vite project with React + TypeScript template, create module dirs (app/, features/\*/, shared/)
- [x] 1.2 Install and configure Tailwind CSS v4
- [x] 1.3 Install @base-ui/react
- [x] 1.4 Install @dnd-kit/react @dnd-kit/helpers
- [x] 1.5 Install and configure vitest + @testing-library/react + @testing-library/jest-dom + jsdom
- [x] 1.6 Set up Tailwind dark mode (class strategy)
- [x] 1.7 Move design tokens from design.html into src/index.css as CSS custom properties
- [x] 1.8 Configure Tailwind to use custom design tokens (colors, fonts, radius, shadows)
- [x] 1.9 Add Google Fonts (DM Sans + JetBrains Mono) via CSS import
- [x] 1.10 Build app shell layout in app/App.tsx (flex column, min-h-screen, isolation:isolate on root for Base UI portaled popups, sticky header, fixed bottom timer)

## 2. Types & Utilities — shared/

- [x] 2.1 Define all TypeScript interfaces in shared/types.ts (Task, Group, TimerSettings, AppSettings, View, TimerPhase)
- [x] 2.2 Implement crypto.randomUUID() ID generator helper
- [x] 2.3 Build date helpers in shared/dates.ts: formatDate, isToday, isTomorrow, isOverdue, getWeekDays, getWeekRange
- [x] 2.4 Implement alarm sounds in features/timer/alarm.ts: bell, digital, gentle, ping via Web Audio API with configurable volume and repeat count
- [x] 2.5 Implement browser Notification helper in shared/notifications.ts with permission request
- [x] 2.6 Implement keyboard shortcut handler in shared/keyboard.ts (Enter=add, Space=start/pause timer, N=focus add-task, Escape=close/cancel — suppress all shortcuts when focus is in INPUT/TEXTAREA)
- [x] 2.7 Test date helpers: isToday, isOverdue, getWeekRange with various weekStartDay values

## 3. Store & Data Layer — app/

- [x] 3.1 Create appStore with Zustand: tasks, groups, settings, UI state (view, browseDate, focusedTaskId)
- [x] 3.2 Create timerStore with Zustand: phase, startedAt, elapsed, sessionPomoCount, isRunning (kept separate to avoid task re-renders)
- [x] 3.3 Wire Zustand persist middleware on appStore with version field in the stored blob
- [x] 3.4 Add migration registry: each version shift gets a function for forward-migrating state shape
- [x] 3.5 Implement load-time version check: match → hydrate, older → migrate, newer → wipe, missing → fresh install
- [x] 3.6 Seed default group on fresh install
- [x] 3.7 Implement export data as JSON file download (shape: { version, exportedAt, appStore: { tasks, groups, settings, ... } })
- [x] 3.8 Implement import with Base UI AlertDialog confirmation + version handling: older → migrate up, newer → import known fields + ignore extras, corrupted → error message, orphan group IDs → reassign to default with warning
- [x] 3.9 Test store: task CRUD, group CRUD, settings updates, version check, migrations, export/import roundtrip

## 4. Task Management — features/tasks/

- [x] 4.1 Build AddTaskRow with quick-add input, plus icon, group chip
- [x] 4.2 Implement task creation on Enter with smart group default, clear input after create
- [x] 4.3 Implement #group typeahead: live dropdown on `#` showing matching groups, create on-the-fly if no match
- [x] 4.4 Build TaskRow (checkbox, title, group tag, pomo area, hover actions, focus button)
- [x] 4.5 Implement task completion toggle (check/uncheck with strikethrough)
- [x] 4.6 Implement inline title editing (click to edit, Enter to save, Escape to cancel)
- [x] 4.7 Implement task deletion — immediate, no confirmation (trash icon on hover)
- [x] 4.8 Implement drag-to-reorder via @dnd-kit/react (DragDropProvider + useSortable with handle ref — only grip icon initiates drag)
- [x] 4.9 Build PomoPopup with Base UI Popover + numbered buttons (0-8)
- [x] 4.10 Build DatePickerPopup with Base UI Popover + quick presets + date input
- [x] 4.11 Implement reschedule via date picker
- [x] 4.12 Build focus button: bind + reset timer + auto-start if timer was running
- [x] 4.13 Test TaskRow interactions: complete toggle, inline edit, delete, focus click, drag reorder

## 5. Group Management — features/groups/

- [x] 5.1 Build GroupSettings UI (list, add inline input, rename, delete)
- [x] 5.2 Implement group creation with name and auto-assigned color from fixed 8-color oklch palette, cycled round-robin
- [x] 5.3 Implement group rename in settings
- [x] 5.4 Implement group deletion with Base UI AlertDialog (delete tasks or reassign to default)
- [x] 5.5 Disable delete button on last remaining group
- [x] 5.6 Implement progressive disclosure: hide all group UI when only 1 group exists
- [x] 5.7 Build GroupTag (colored dot + name) on task rows when 2+ groups
- [x] 5.8 Build GroupLens dropdown via Base UI Menu (hidden when 1 group)
- [x] 5.9 Build group chip on add-task row when 2+ groups (sticky — persists for subsequent tasks until changed)

## 6. App Shell — app/

- [x] 6.1 Build app/App.tsx with layout, view routing, store providers
- [x] 6.2 Build app/Header.tsx: sticky header with logo mark + text
- [x] 6.3 Build view tab bar (Today, Tomorrow, This Week, Backlog) with active state
- [x] 6.4 Build date stepper (left/right arrows + formatted date label)
- [x] 6.5 Implement gear icon button that opens settings drawer
- [x] 6.6 Build responsive header (scrollable horizontal tabs on mobile, collapse date label)

## 7. Time Views — features/views/

- [x] 7.1 Build TodayView: Overdue section (past unfinished tasks, sorted by date asc + sortOrder asc) + today's tasks section
- [x] 7.2 Build Overdue section header (uppercase "OVERDUE", red-tinted)
- [x] 7.3 Hide Overdue section when no past-dated tasks are incomplete
- [x] 7.4 Build TomorrowView: tasks dated tomorrow
- [x] 7.5 Build WeekView: current calendar week (respecting weekStartDay), grouped by day with headers, stacked vertically on mobile
- [x] 7.6 Build BacklogView: all tasks with null date
- [x] 7.7 Build DateBrowser: step forward/back, show tasks for selected date
- [x] 7.8 Implement view routing via activeView state (switch which view renders)
- [x] 7.9 Implement overdue roll-over logic in the store (past unfinished tasks appear in Today)

## 8. Pomodoro Timer — features/timer/

- [x] 8.1 Build TimerBar (fixed bottom, progress track with phase-colored fill — accent for focus, green for short break, blue for long break, mode label showing uppercase phase name "FOCUS" / "SHORT BREAK" / "LONG BREAK", task name, digits showing full duration dimmed when idle, controls, session dots)
- [x] 8.2 Implement timer engine: start, pause, reset (current phase to full duration), skip (advance to next phase)
- [x] 8.3 Implement timer based on stored startedAt timestamp (drift-resistant)
- [x] 8.4 Implement focus → short break → focus → … → long break cycle
- [x] 8.5 Implement session progress dots (filled/dimmed for current cycle, resets after long break)
- [x] 8.6 Increment focused task's pomoCompleted on focus interval finish
- [x] 8.7 Highlight the focused task row when timer is bound to a task
- [x] 8.8 Implement alarm sound on interval end (uses features/timer/alarm.ts)
- [x] 8.9 Implement browser notification on interval end
- [x] 8.10 Implement auto-start of next interval based on settings — sound plays, then next phase starts counting immediately
- [x] 8.11 Handle tab visibility: on re-entry, check if startedAt + duration elapsed, auto-advance phases and play notification if so
- [x] 8.12 Update document.title to show remaining time while timer runs ("MM:SS — DayBox"), revert when idle/paused

## 9. Settings — features/settings/

- [x] 9.1 Build SettingsDrawer via Base UI Drawer with backdrop overlay and slide-in animation
- [x] 9.2 Build Timer section: focus duration, short break, long break, long-break interval via Base UI NumberField with ± buttons
- [x] 9.3 Build auto-start toggles via Base UI Switch (breaks and pomodoros)
- [x] 9.4 Build alarm sound selector via Base UI Select (bell, digital, gentle, ping)
- [x] 9.5 Build alarm volume slider via Base UI Slider (0-1)
- [x] 9.6 Build alarm repeat count input via Base UI NumberField (1-5)
- [x] 9.7 Build first day of week selector (Sun–Sat radio group or select)
- [x] 9.8 Build light/dark theme toggle using Tailwind dark mode
- [x] 9.9 Build Data section: Export and Import buttons
- [x] 9.10 Wire all settings controls to store actions
