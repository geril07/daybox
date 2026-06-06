## Why

`overhaul-week-view` introduced a shared `SectionHeader` and proved the "a view is an ordered list of titled sections" model on the Week view. But the original inconsistency that motivated it still lives in `DayView`: the Today view hand-rolls its "Overdue"/"Today" labels inline, while **Tomorrow and Backlog render no header at all** (`DayView.tsx` only emits a label when `view === 'today'`). That is the exact complaint that kicked this off — "Tomorrow doesn't have a Tomorrow label, Today does."

We now have two header implementations live (the shared `SectionHeader` in Week, inline markup in `DayView`). This change retires the duplication by moving `DayView` onto `SectionHeader`, giving Tomorrow and Backlog proper headers and making every reachable view share one header style. It also removes a smaller smell: `App.defaultDate` re-derives the view→date mapping that `viewToRange` already owns.

## What Changes

- **`DayView` adopts `SectionHeader`** for the Overdue and day sections.
- **Tomorrow and Backlog gain section headers** ("Tomorrow" / "Backlog") matching the Today view's style, instead of rendering a bare list.
- **`App.defaultDate` is folded into `viewToRange`** (single source of truth for "what date is this view about"); `App` derives the add-task default date from it instead of re-implementing the switch.
- The parked `'date'` view branch and `browseDate` store fields are **left in place** (tracked by `add-date-browser-entry-point`), not deleted.

## Capabilities

### Modified Capabilities

- `time-views`: the "Tomorrow view" and "Backlog view" requirements change from "flat list" to "a single titled section (header + list)", matching the Today view's section style. The Today view's behavior is unchanged (its rendering just routes through the shared component).

## Impact

- `src/features/planner/components/DayView.tsx` — render via `SectionHeader`; add Tomorrow/Backlog headers.
- `src/features/planner/queries.ts` — `viewToRange` (or a small helper) becomes the single source for a view's default date; `viewMetaMap` already holds the labels.
- `src/app/App.tsx` — replace the inline `defaultDate` switch with the shared derivation.
- No data, schema, or persistence changes.

## Out of scope

- **The date browser** — parked under `add-date-browser-entry-point`; its `'date'` view, `DateBrowser`, and `browseDate` fields stay untouched here.
- **`text-fg-2` → `muted-foreground` consolidation** — `text-fg-2` is used in 9 sites across timer, tasks, and shared/ui (alongside `text-fg-3`), suggesting an intentional tiered grey scale rather than planner drift. Whether to consolidate needs its own evaluation; it is not bundled into this planner cleanup.
- Moving `SectionHeader` from `planner/components` to `shared/ui` — revisit only if a non-planner consumer appears.
- Relocating the `view` state from `App` `useState` into the planner store.
