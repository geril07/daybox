# Rounded workspace implementation plan

## Target

Implement the approved desktop concept at
`/tmp/opencode/daybox-visuals/daybox-01e-rounded-workspace.png`. The image is a
visual reference, not a source of new behavior. Keep the current icons, group
selection and focused-task styling, including its thin red left border.

The desktop sidebar is a full-height colored rail with the DayBox logo above
Groups. A lightly inset, rounded workspace sits to its right, with Settings at
the upper right. Period tabs, task entry and tasks remain centered; the timer is
at the bottom and its outer edges align with the task column. Use color rather
than full-width structural borders to distinguish surfaces.

Retain mobile navigation through its existing drawer and keep settings and
timer accessible on narrow screens. Keep the main task area as the internal
scroll container, with the timer visible at the bottom.

Theme colors must respond to all existing presets and light/dark modes; do not
hard-code the mockup's palette. Round buttons, selects and controls consistently
without altering their behavior. Preserve timer progress, phase tints, controls,
keyboard shortcuts, task entry and group selection. Replacing the trash icon
was only an optional idea; do not change it in this implementation.

## Stages

1. **Shell and theme surfaces.** Reorganize `src/app/App.tsx` and supporting
   app/theme styles into the desktop rail and rounded workspace. Keep the mobile
   drawer and settings working. Preserve scroll behavior and ensure visible
   contrast in every preset. Add or update behavioral tests for any changed
   shell behavior. Done when the workspace and rail render across desktop and
   mobile and navigation retains its current functionality.
2. **Timer alignment.** Make the timer a rounded bottom surface aligned to the
   same content width as the task column; establish one shared definition for
   their width and horizontal padding. Preserve timer progress, phase tints,
   controls and responsive usability. Update tests only for observable changes.
   Done when both edges align at desktop and mobile widths and timer behavior
   remains intact.
3. **Controls and specifications.** Match the approved tab and add-task
   treatments; establish consistent rounded controls across shared UI and
   relevant local overrides. Preserve existing icons and behavior. Update the
   affected OpenSpec requirements, notably `app-shell`, to describe the new
   structure while retaining scrolling, tabs and navigation requirements. Add
   behavioral tests where needed. Done when the changed controls and specs
   reflect the approved design without regressions.

Stages run sequentially. The coordinator checks each diff against this plan
before assigning the next. Each stage has a new DeepSeek Flash High agent;
follow-up fixes go to that same agent.

## Verification

After implementation, run `npm run format`, `npm run typecheck`,
`npm run lint`, and `npx vitest run`. Check desktop and mobile layout with empty
and populated tasks, week and group views, focused task, running timer and break
phases, scrolling, and light/dark/alternative themes. Preserve existing user
data; browser test data must be isolated.
