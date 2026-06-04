# DayBox — App Overview / PRD

_Working title — rename freely._

A local-first Pomodoro timer fused with a lightweight task planner. Think Pomofocus, but your tasks aren't trapped in "right now" — you can spread them across days and run focus sessions against whatever you've planned for today.

---

## 1. The problem

Pomofocus is a great execution tool but a flat one: it only knows about _today's_ list. There's no backlog, no "do this tomorrow," no sense of a week. So planning lives in your head (or in a second app), and anything you don't finish today just... evaporates.

DayBox fixes the one missing dimension: **time**. Tasks get a date (or stay unscheduled), you plan your day by pulling work into Today, and then you execute it with the Pomodoro timer you already trust.

---

## 2. Goals & non-goals

**Goals**

- Plan tasks across days: today, tomorrow, this week, or a parked backlog.
- Run Pomodoro focus sessions against a specific task, tracking progress in pomodoros.
- Make the daily planning ritual fast and obvious.
- Run entirely in the browser. No account, no backend, no cost. Deployable to GitHub Pages / Vercel.

**Non-goals (at least for v1)**

- Collaboration, sharing, multi-user.
- Cloud sync across devices.
- Heavy project management (sub-tasks, dependencies, Gantt, labels, priorities).
- Mobile-native app. (Responsive web is fine; native is later.)

---

## 3. Who it's for

A solo focused-worker who already lives in the Pomodoro method and wants their planning and their timer in one place. Single user, single device, opinionated and minimal. You are the primary user.

---

## 4. Core mental model

Two independent properties on every task, and that separation _is_ the product:

- **Group** — _what a task belongs to._ A static, named container (Work, Personal, Side project). Persistent; it doesn't change as time passes.
- **Date** — _when you'll do it._ The planning dimension. A task can be scheduled for a day or left unscheduled (Backlog).

The two are **not equal in the UI.** Time is the primary axis — the day and the week are what you navigate, and every time view shows _all_ tasks regardless of group. Group is secondary metadata that rides along: a task always belongs to exactly one group, but grouping never organizes or filters a view unless you explicitly ask it to. The time tabs are _views_, not containers — they simply filter tasks by date.

**How groups surface — progressive disclosure.** Groups stay out of the way until you want them:

- A fresh install ships with one default group, so capture works instantly and you never think about groups to get started.
- While that's your only group, there is **no group UI at all** — no tags, no picker, no filter. The app behaves like a pure time planner.
- The moment you create a second group, two quiet things appear: a small group tag (a color dot + name) on each task row, and an optional "filter by group" lens, set to **All** by default. The lens narrows the current view to one group when you reach for it, but it never _binds_ — switch views and you're back to seeing everything.

---

## 5. The loop the app is built around

Everything in the UI serves this daily cycle:

1. **Capture** — dump tasks in whenever they occur to you (no date, no group decision needed).
2. **Plan** — each morning, pull tasks into Today and give each an estimate in pomodoros.
3. **Execute** — pick a task, run the timer, watch its pomodoro count fill up.
4. **Carry over** — whatever you didn't finish surfaces again tomorrow instead of disappearing.

If a feature doesn't support this loop, it's probably out of scope.

---

## 6. Information architecture

```
┌───────────────────────────────────────────────────────┐
│  [ Today ][ Tomorrow ][ This week ][ Backlog ]          │  ← time tabs (primary)
│  ‹ Wed, Jun 4 ›                          All groups ▾   │  ← date stepper · group lens
├───────────────────────────────────────────────────────┤
│  + Add a task…                                          │
│  ○  Fix login redirect bug     • Work     ●●○○ overdue  │
│  ○  Write sprint update        • Work     ●○            │  ← flat list, all groups,
│  ○  Read design chapter 3      • Reading  ○○            │     ordered by you
│  ○  Evening gym session        • Personal               │
├───────────────────────────────────────────────────────┤
│  ⏱  24:12  Focus · on "Fix login redirect bug"          │  ← docked timer (persistent)
└───────────────────────────────────────────────────────┘
```

- **Top:** time tabs (Today / Tomorrow / This Week / Backlog), a date stepper for browsing any day, and the optional group lens defaulting to "All groups."
- **Middle:** a single flat task list for the active view, ordered by you. No group sections — the group shows only as a small color tag per row.
- **Bottom (persistent):** the Pomodoro timer, anchored to whichever task you're focusing on, so it stays put as you move between views.

There is deliberately **no group sidebar.** Groups are a tag and an optional lens, never the navigation spine.

---

## 7. The views

**Today** — the home screen and the heart of the app. Shows tasks dated today **plus any unfinished tasks from past days** (rolled-over, visually marked as overdue) so nothing slips through. One flat list across all groups, ordered by you. This is where you plan and execute.

**Tomorrow** — a staging area for the next day. Same layout. Lets you pre-load tomorrow before you end today.

**This Week** — the wider horizon, so you can balance load across days. (Rolling 7 days reads better for planning than a fixed Mon–Sun week, but that's a choice to confirm.)

**Date browser** — step to any specific date, forward or back, to review history (what you actually did) or schedule further out.

**Backlog** — every unscheduled task (no date), across all groups, as one flat list. The parking lot. New tasks land here until you give them a day.

---

## 8. Anatomy of a task (in the UI)

A task row shows, left to right:

- a checkbox to complete it,
- the title,
- a subtle group tag (color dot + name) — shown only once you have more than one group,
- pomodoro progress — e.g. `●●○○` (2 of 4 done) or `2 / 4`,
- on hover/tap: a date control (reschedule), a "focus" button (load into the timer), edit, delete.

Tapping the title opens inline edit. Tapping the group dot reassigns the group. Tasks are reorderable within a view (manual drag). Completing a task checks it off and dims it; it stays visible in its day's history.

---

## 9. The Pomodoro timer

The execution half. Behaves like Pomofocus and stays docked at the bottom.

- **Select a task to focus.** The timer binds to it; finishing a focus interval increments that task's completed-pomodoro count.
- **Cycle:** focus → short break → focus → … → long break, on a configurable interval (e.g. long break every 4 pomodoros).
- **Controls:** start / pause / skip / reset. A clear readout of time left and which interval you're in.
- **Signals:** a sound and/or browser notification when an interval ends. Optional auto-start of the next interval.
- **At-a-glance:** the current task title and its progress are shown next to the timer.

Running pomodoros against tasks is what makes the estimates meaningful and feeds any future stats.

---

## 10. Key interactions

- **Capture fast:** a quick-add input (type a title, Enter) drops a task into the active view. No modal. Group assignment never interrupts capture — it works in three layers, cheapest first:
  - _Smart default:_ the new task takes a sensible group automatically. The group lens doubles as the add-context — if you've narrowed the view to Work, new tasks go to Work; on "All groups" they fall back to your default (or last-used) group. So Enter alone always works and a task is never groupless.
  - _One-tap chip:_ a small group chip on the add row shows where the task will land and opens a picker to change it before you hit Enter. It appears only when you have more than one group.
  - _`#group` typeahead:_ type `Plan Q3 roadmap #wor` to assign or create a group inline, without leaving the keyboard.
  - Reassign anytime later by tapping the task's group dot.
- **Reschedule:** drag a task to another day/tab, or use its date control. Moving to a new date is the _only_ thing "scheduling" means.
- **Plan the day:** from Backlog or This Week, send tasks to Today; set estimates inline.
- **Reorder:** drag within a list to set the order you'll tackle things.
- **Keyboard-friendly:** at minimum Enter to add, space to start/pause the timer. (More shortcuts are a nice-to-have.)

---

## 11. States & edge cases (UX level)

- **Overdue:** unfinished past-dated tasks appear in Today with an "overdue" marker, so the day always reflects everything outstanding.
- **Empty Today:** an inviting empty state that nudges you to pull from Backlog or This Week — turning the void into the planning prompt.
- **Single group:** with only the default group, all group UI is hidden — no tags, no chip, no lens. The app reads as a pure time planner until a second group exists.
- **Deleting a group:** must resolve its tasks — either delete them with it or move them to a default group. The UI should ask, not silently destroy. (You can never delete the last remaining group.)
- **Completed tasks:** stay in their day for history/review rather than vanishing.

---

## 12. Settings (UX level)

Kept minimal: focus length, short break, long break, long-break interval, auto-start breaks/pomodoros, sound on/off, and light/dark theme. Plus **Export / Import** (download/upload your data as a file) — important because everything lives locally and you don't want one cleared browser to wipe your history.

---

## 13. Look & feel

Calm, focused, single-screen. Flat and uncluttered — this is a tool you stare at while working, so low visual noise matters. Generous whitespace, one accent color, clear typographic hierarchy between the timer (loud) and the task list (quiet). Responsive enough to be usable on a phone, but designed desktop-first.

---

## 14. Scope

**MVP**

- Groups (create, rename, delete-with-resolution) with progressive disclosure.
- Tasks with title, group, optional date, pomodoro estimate, completion.
- Today / Tomorrow / This Week / Backlog views + date browser, all flat / all-groups.
- Overdue roll-over into Today.
- Pomodoro timer bound to a task, with the full focus/break cycle and settings.
- Quick-add with smart-default group assignment, reschedule, reorder, inline edit.
- Local persistence + export/import.

**Later**

- Stats dashboard (pomodoros per day, completion trends, time per group).
- Recurring tasks.
- Notifications polish, richer keyboard shortcuts, command palette.
- Optional cloud sync / multi-device.
- Native mobile.

---

## 15. Open questions

1. **"This Week"** — rolling 7 days or calendar week?
2. **Reschedule UX** — full drag-and-drop between tabs (more work), or a date-picker control (simpler) for v1?
3. **Group lens in v1** — does the optional group filter actually work in v1, or is group purely a visual tag for now, with filtering deferred to "later"?
4. **Stats** — care about it eventually? It's the one thing that shapes how much history you want to retain.
