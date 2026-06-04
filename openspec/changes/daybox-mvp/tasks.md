## 1. Project Scaffold

- [ ] 1.1 Scaffold Vite project with React + TypeScript template, create module dirs (app/, features/*/, shared/)
- [ ] 1.2 Install and configure Tailwind CSS v4
- [ ] 1.3 Install @base-ui/react
- [ ] 1.4 Set up Tailwind dark mode (class strategy)
- [ ] 1.5 Move design tokens from design.html into src/index.css as CSS custom properties
- [ ] 1.6 Configure Tailwind to use custom design tokens (colors, fonts, radius, shadows)
- [ ] 1.7 Add Google Fonts (DM Sans + JetBrains Mono) via CSS import
- [ ] 1.8 Build app shell layout in app/App.tsx (flex column, min-h-screen, sticky header, fixed bottom timer)

## 2. Types & Utilities — shared/

- [ ] 2.1 Define all TypeScript interfaces in shared/types.ts (Task, Group, TimerSettings, AppSettings, View, TimerPhase)
- [ ] 2.2 Implement crypto.randomUUID() ID generator helper
- [ ] 2.3 Build date helpers in shared/dates.ts: formatDate, isToday, isTomorrow, isOverdue, getWeekDays, getWeekRange
- [ ] 2.4 Implement alarm sounds in features/timer/alarm.ts: bell, digital, gentle, ping via Web Audio API with configurable volume and repeat count
- [ ] 2.5 Implement browser Notification helper in shared/notifications.ts with permission request
- [ ] 2.6 Implement keyboard shortcut handler in shared/keyboard.ts (Enter=add, Space=start/pause timer, N=focus add-task, Escape=close/cancel)

## 3. Store & Data Layer — app/

- [ ] 3.1 Create appStore with Zustand: tasks, groups, settings, UI state (view, browseDate, focusedTaskId)
- [ ] 3.2 Create timerStore with Zustand: phase, startedAt, elapsed, sessionPomoCount, isRunning (kept separate to avoid task re-renders)
- [ ] 3.3 Wire Zustand persist middleware on appStore with version field in the stored blob
- [ ] 3.4 Add migration registry: each version shift gets a function for forward-migrating state shape
- [ ] 3.5 Implement load-time version check: match → hydrate, older → migrate, newer → wipe, missing → fresh install
- [ ] 3.6 Seed default group on fresh install
- [ ] 3.7 Implement export data as JSON file download (useStore.getState() + version field)
- [ ] 3.8 Implement import with Base UI AlertDialog confirmation + version handling: older → migrate up, newer → import known fields + ignore extras, corrupted → error message

## 4. Task Management — features/tasks/

- [ ] 4.1 Build AddTaskRow with quick-add input, plus icon, group chip
- [ ] 4.2 Implement task creation on Enter with smart group default
- [ ] 4.3 Implement #group syntax parsing in quick-add (create on-the-fly)
- [ ] 4.4 Build TaskRow (checkbox, title, group tag, pomo area, hover actions, focus button)
- [ ] 4.5 Implement task completion toggle (check/uncheck with strikethrough)
- [ ] 4.6 Implement inline title editing (click to edit, Enter to save, Escape to cancel)
- [ ] 4.7 Implement task deletion with confirmation
- [ ] 4.8 Implement drag-to-reorder within a view
- [ ] 4.9 Build PomoPopup with Base UI Popover + numbered buttons (0-8)
- [ ] 4.10 Build DatePickerPopup with Base UI Popover + quick presets + date input
- [ ] 4.11 Implement reschedule via date picker
- [ ] 4.12 Build focus button: bind + reset timer + auto-start if timer was running

## 5. Group Management — features/groups/

- [ ] 5.1 Build GroupSettings UI (list, add inline input, rename, delete)
- [ ] 5.2 Implement group creation with name and auto-assigned color
- [ ] 5.3 Implement group rename in settings
- [ ] 5.4 Implement group deletion with Base UI AlertDialog (delete tasks or reassign to default)
- [ ] 5.5 Disable delete button on last remaining group
- [ ] 5.6 Implement progressive disclosure: hide all group UI when only 1 group exists
- [ ] 5.7 Build GroupTag (colored dot + name) on task rows when 2+ groups
- [ ] 5.8 Build GroupLens dropdown via Base UI Menu (hidden when 1 group)
- [ ] 5.9 Build group chip on add-task row when 2+ groups

## 6. App Shell — app/

- [ ] 6.1 Build app/App.tsx with layout, view routing, store providers
- [ ] 6.2 Build app/Header.tsx: sticky header with logo mark + text
- [ ] 6.3 Build view tab bar (Today, Tomorrow, This Week, Backlog) with active state
- [ ] 6.4 Build date stepper (left/right arrows + formatted date label)
- [ ] 6.5 Implement gear icon button that opens settings drawer
- [ ] 6.6 Build responsive header (collapse elements on mobile)

## 7. Time Views — features/views/

- [ ] 7.1 Build TodayView: Overdue section (past unfinished tasks) + today's tasks section
- [ ] 7.2 Build Overdue section header (uppercase "OVERDUE", red-tinted)
- [ ] 7.3 Hide Overdue section when no past-dated tasks are incomplete
- [ ] 7.4 Build TomorrowView: tasks dated tomorrow
- [ ] 7.5 Build WeekView: current calendar week (respecting weekStartDay), grouped by day
- [ ] 7.6 Build BacklogView: all tasks with null date
- [ ] 7.7 Build DateBrowser: step forward/back, show tasks for selected date
- [ ] 7.8 Implement view routing via activeView state (switch which view renders)
- [ ] 7.9 Implement overdue roll-over logic in the store (past unfinished tasks appear in Today)

## 8. Pomodoro Timer — features/timer/

- [ ] 8.1 Build TimerBar (fixed bottom, progress track, mode label, task name, digits, controls, session dots)
- [ ] 8.2 Implement timer engine: start, pause, reset, skip
- [ ] 8.3 Implement timer based on stored startedAt timestamp (drift-resistant)
- [ ] 8.4 Implement focus → short break → focus → … → long break cycle
- [ ] 8.5 Implement session progress dots (filled/dimmed for current cycle)
- [ ] 8.6 Increment focused task's pomoCompleted on focus interval finish
- [ ] 8.7 Highlight the focused task row when timer is bound to a task
- [ ] 8.8 Implement alarm sound on interval end (uses features/timer/alarm.ts)
- [ ] 8.9 Implement browser notification on interval end
- [ ] 8.10 Implement auto-start of next interval based on settings
- [ ] 8.11 Handle tab visibility changes (pause when hidden, resume when visible)

## 9. Settings — features/settings/

- [ ] 9.1 Build SettingsDrawer via Base UI Drawer with backdrop overlay and slide-in animation
- [ ] 9.2 Build Timer section: focus duration, short break, long break, long-break interval inputs
- [ ] 9.3 Build auto-start toggles via Base UI Switch (breaks and pomodoros)
- [ ] 9.4 Build alarm sound selector via Base UI Select (bell, digital, gentle, ping)
- [ ] 9.5 Build alarm volume slider via Base UI Slider (0-1)
- [ ] 9.6 Build alarm repeat count input via Base UI NumberField (1-5)
- [ ] 9.7 Build first day of week selector (Sun–Sat radio group or select)
- [ ] 9.8 Build light/dark theme toggle using Tailwind dark mode
- [ ] 9.9 Build Data section: Export and Import buttons
- [ ] 9.10 Wire all settings controls to store actions
