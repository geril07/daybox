## Why

The planner already contains a **date browser** — a `'date'` view (`DateBrowser.tsx`) that shows a single arbitrary day's tasks with a `◀ ▶` day stepper, backed by a persisted `browseDate` in the planner store. It is even wired into `App`'s render switch (`case 'date'`) and covered by two requirements in the `time-views` spec.

But it has **no entry point**: the tab bar only offers Today / Tomorrow / This Week / Backlog, and nothing ever sets `view='date'`. The only code that writes `browseDate` is the bootstrap migration restoring an old persisted value. So a user cannot reach the feature, and its own stepper is the only way to change the date — a chicken-and-egg dead end. It also renders the raw `browseDate` string (e.g. `2026-06-06`) instead of a formatted date, a sign it was left unfinished.

This is the "jump to any specific day" capability (e.g. "what's on June 20th", "what did I have last Tuesday") that the four fixed tabs can't provide.

**This is parked for later.** It is captured now so the unreachable-but-spec'd state is tracked rather than silently rotting. The user does not need arbitrary-date browsing right now; the four fixed views cover current workflows. When picked up, this change gives the existing component a real way in and finishes its polish.

## What Changes

- **Add an entry point** that sets `browseDate` and switches to the `'date'` view — most likely a calendar / date-picker control in the header (exact affordance TBD in design).
- **Format the displayed date** in `DateBrowser` (e.g. "Fri · Jun 6, 2026") instead of the raw ISO string, reusing `@/shared/dates` helpers.
- **Reconcile with the section model**: once reachable, `DateBrowser` should adopt the shared `SectionHeader` introduced in `overhaul-week-view`, so it matches the other views.
- Until this lands, the date browser remains intentionally unreachable; the `cleanup-planner-views` work (if pursued) should treat the `'date'` view and `browseDate` store fields as parked, not dead — i.e. leave them in place rather than deleting them.

## Capabilities

### Modified Capabilities

- `time-views`: the existing "Date browser shows any specific date" and "Date browser holds a persisted browse date" requirements gain a reachable entry point. A new scenario covers opening the date browser from the header (today the spec describes behavior that no UI can trigger).

## Impact

- `src/app/App.tsx` — a header control that sets `browseDate` and `view='date'`; `View` type already includes `'date'`.
- `src/features/planner/components/DateBrowser.tsx` — formatted date label; adopt `SectionHeader`.
- `src/features/planner/store.ts` — no new fields expected (`browseDate`/`stepBrowseDate`/`setBrowseDate` already exist).
- No data/schema/persistence changes.

## Out of scope

- A full month/calendar grid view — this is single-day browse with a stepper, not a calendar.
- The broader `cleanup-planner-views` refactor (migrating Today/Tomorrow/Backlog onto `SectionHeader`, the `App.defaultDate` duplication, the `text-fg-2` token consolidation) — separate work; this change only concerns making the date browser reachable.
