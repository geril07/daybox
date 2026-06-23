## Context

The timer store already has `setFocusedTaskId(null)` as a primitive. `TaskRow.focusTask` toggles against it. `TimerBar` renders a read-only "Working on…" line at the bottom of the bar (around `TimerBar.tsx:300-312`). The line shows the focused task's title, or "No task focused" when `focusedTaskId` is `null` / the task can't be resolved. There's no UI on the bar itself to call `setFocusedTaskId(null)`. The result is an unreachable state: focused on a task whose row is off-screen.

The decision made during explore mode: place the clear control inline on the "Working on" row (Option A). The control is purely a focus clear — it does NOT reset the timer interval, phase, or running state. We explicitly skip adding a "stale-state" branch (the proposal dropped the "Task no longer available" wording); the same clear affordance handles both reachable and stale focus.

## Goals / Non-Goals

**Goals:**

- A single, always-available in-timer affordance to clear `focusedTaskId` to `null`.
- The control works regardless of whether the focused task is still resolvable in the tasks store.
- The clear is a pure mutation of `focusedTaskId` — no side effects on timer state.
- Keep the existing `TaskRow` focus toggle untouched; the two paths coexist.

**Non-Goals:**

- Changing `focusTask`'s toggle semantics on `TaskRow`.
- Adding a "task is stale, click to clear" distinct visual state. The control looks the same whether the task is resolvable or not.
- Resetting the timer interval / phase / running state when clearing focus.
- Adding the control to the mobile/coarse-pointer action sheet — that sheet already has `Focus this task` (toggle via `focusTask`), which already clears when re-tapped.
- Adding keyboard shortcuts for unfocusing (the spacebar is the timer's play/pause gesture; conflating it with focus would be confusing).
- Migrating other call sites (delete cascade, import-stale clear) — they're out of scope and already correct.

## Decisions

### D1: Where the control lives — inline on the "Working on" row

**Decision:** Render the clear affordance as the trailing element of the existing "Working on…" row inside `TimerBar`.

**Why over alternatives:**

- **Vs. adding a 4th button to the transport cluster (`[⟲][▶][⏭][◎]`):** that cluster is timer-transport (restart current interval / play-pause / skip phase). A focus-clear is task-level, not transport-level. Mixing the two conceptual layers in one button group muddies the model. Also: the cluster is already tight on small widths.
- **Vs. making the "Working on {title}" text itself the trigger:** zero new chrome, but invisible. "Click text to unfocus" has no precedent in the app and no discoverability cue.
- **The "Working on" row is already task-level** — it's the natural home. The control appears only when there's something to clear, using space that's otherwise empty.

### D2: Visual treatment — small `×` button, only when `focusedTaskId !== null`

**Decision:** Render a small circular `×` button (lucide `X` icon at ~14px) at the trailing edge of the "Working on" row. It appears whenever `focusedTaskId` is non-null — even if the task can't be resolved from the store. It's a `Button variant="ghost"` styled to match the row's existing muted text.

**Why always-on when `focusedTaskId !== null`:** the proposal explicitly skipped the stale-state branch. The control is "clear whatever focus is set", not "clear this specific task." Making it always visible keeps the code simple (no separate stale state) and handles the off-screen case and the stale case with one branch.

### D3: Action — call `setFocusedTaskId(null)` directly, not `focusTask`

**Decision:** The click handler calls `useTimerStore.getState().setFocusedTaskId(null)`. It does NOT call `focusTask(focusedTaskId)`.

**Why:** `focusTask` is a toggle that requires the currently focused id. Reusing it would (a) couple the timer's clear control to the focused-id value, and (b) inherit the toggle semantics by accident. `setFocusedTaskId(null)` is the primitive the rest of the cascade already uses (delete cascade, import-stale clear). Same primitive, same invariant, no surprise.

### D4: Pure focus clear — do NOT reset timer state

**Decision:** The click handler mutates only `focusedTaskId`. `elapsed`, `startedAt`, `isRunning`, `phase`, `sessionPomoCount` are untouched.

**Why:** Mirrors the existing `focusTask` contract ("rebind SHALL only change `focusedTaskId`; it SHALL NOT reset the timer, alter its phase, or auto-start it" — `task-management/spec.md:388`). The same contract should hold in reverse: unbind is a pure binding change. The user may want to keep the running focus interval going after dropping the task binding (e.g. "I was working on task X but I want to finish this pomo unbound").

### D5: No keyboard shortcut

**Decision:** No new keybinding. The control is pointer-only (click/tap).

**Why:** The timer's spacebar is play/pause. `Escape` would be a natural "clear focus" key but conflicts with nothing-yet — still, no existing precedent for Escape-as-clear in this app, and adding it would be a separate UX decision. Out of scope; can be added in a follow-up if it turns out the control isn't enough.

## Risks / Trade-offs

- **[The control may be missed]** — It's a small icon on a low-contrast row. Users who don't notice it will still fall back to scrolling to find the task row. → Mitigation: the icon is in a position that's familiar (trailing-edge dismiss pattern, same as chips/badges elsewhere in the UI). No further mitigation planned; can revisit if usability shows it's invisible.
- **[Two paths to the same outcome]** — `TaskRow` toggle and the new timer control both clear `focusedTaskId`. This duplicates intent. → Mitigation: both call the same primitive (`setFocusedTaskId(null)` directly or via `focusTask` toggle). No state divergence is possible. The two paths serve different contexts (on-row vs. in-timer), so the overlap is justified.
- **[Stale focus now has an escape hatch in the timer]** — Previously a stale `focusedTaskId` would just keep showing "Working on {title}" with no way to clear it without refocusing another task. This change turns that dead-end into a working affordance. → No mitigation needed; this is the goal.
