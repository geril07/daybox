## Context

The planner has four tab views: Today, Tomorrow, This Week, and a fourth view that filters `date=null` tasks. Historically named "Backlog", this view's internal identifier `'backlog'` appears in the `View` union type, `viewMetaMap`, routing switches, and component type guards. The date picker in `TaskRow` independently settled on `'Unsched.'` for the same concept, leaving the codebase split between two names for one idea.

`view` is ephemeral `useState` in `App.tsx` — it is not persisted to localStorage, not exported, and not part of any migration path. Renaming the internal literal carries zero data-migration risk.

## Goals / Non-Goals

**Goals:**

- Rename every occurrence of `'backlog'` (user-visible strings and internal identifiers) to `'unscheduled'`
- Align the date picker preset label with the view name
- Update the Today empty-state copy to remove the now-stale "Backlog" reference
- Keep the delta minimal — purely a rename, no behavior change

**Non-Goals:**

- Changing how `date=null` tasks are queried, sorted, or displayed
- Introducing a separate "Backlog" concept (deferred; would be a group, not a view)

## Decisions

**Rename the internal identifier too, not just the label**

The `'backlog'` string literal appears in the type system (`type View`) and switch cases. Keeping it as an internal name while showing "Unscheduled" externally would create a mismatch that makes the code harder to read. Since there is no persistence concern, the rename is free.

**Expand `'Unsched.'` to `'Unscheduled'` in the date picker**

The abbreviation was a space compromise. With the view adopting the full name, using the abbreviation in the picker creates a visual inconsistency. The button is wide enough at current sizing to fit "Unscheduled" at `text-xs`.

**Today empty state: rephrase, don't just swap the word**

"Pull tasks from Backlog" → "Pull unscheduled tasks" reads more naturally and avoids treating "Unscheduled" as a proper noun in a sentence where it sounds awkward.

## Risks / Trade-offs

- Tiny chance a user has bookmarked or hard-coded a deep link containing `view=backlog` in a URL — not applicable here since the app uses no URL routing for view state.
- Tests referencing the `'backlog'` string literal will fail until updated — expected, caught by the test suite.
