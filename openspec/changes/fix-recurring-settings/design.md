## Context

The app shell owns planner-aware occurrence generation. Its refresh effect runs at startup, focus, visibility changes, and minute ticks, but does not observe series changes. Settings currently renders every series editor in full.

## Goals / Non-Goals

**Goals:** Generate missing tasks after series changes and make the editors compact and accessible.

**Non-Goals:** Rewrite or remove existing occurrences, change the generation horizon, persist expansion state, or redesign other Settings sections.

## Decisions

- Observe the series array in the existing app-shell refresh effect. This keeps planner context in the shell and reuses the idempotent generation action, rather than adding generation calls to individual Settings controls or coupling the tasks store to planner preferences.
- Add the shared accordion through the configured shadcn CLI. Use one uncontrolled accordion item in SettingsDrawer to hide the entire Recurring section; leave the tasks-owned panel and individual editors unchanged.
- Use the existing Recurring section heading as the trigger with a chevron. The whole series list and creation form belong in its panel. Start collapsed on drawer mount and keep the section open when adding a series.
- Use measured panel-height animation and reduced-motion overrides; no animation dependency.
- Deliver generation and accordion changes as separate atomic commits with their tests and specifications.

## Risks / Trade-offs

- Existing upcoming tasks retain old template values → preserve the agreed occurrence semantics and test this explicitly.
- A series change restarts the refresh interval → acceptable because it also immediately refreshes; focus and visibility listeners retain cleanup.
- Collapsed fields can contain a pending title edit → preserve blur-to-save behavior and verify section collapse commits the edit. Unsaved creation drafts reset when the panel unmounts.
- Browser verification can be masked by a minute tick → reload before the flow, assert tasks immediately after creation, and record that the entire flow finishes well before 60 seconds; use frozen timers in app regressions.
- The existing global Space shortcut also toggles the timer when a Settings button has focus → verify accordion activation with Enter and document the unrelated shortcut issue rather than changing shortcut behavior in this change.
