## Why

Group CRUD currently lives only in the Settings drawer, while the sidebar already lists every group as a filter chip. The result is a two-step dance to manage groups — open settings, find the section, edit — for a control that is conceptually part of the group's surface. Moving CRUD into the sidebar puts every group interaction (filter, rename, recolor, delete, create) in one place, eliminates the redundant "Groups" section from the settings drawer, and removes the awkward "you can only see group controls once you have 2+ groups" progressive-disclosure rule by always showing the sidebar's group section.

## What Changes

- Relocate all group CRUD (create, rename, change color, delete with task resolution) from the settings drawer's `GroupSettingsPanel` into the sidebar's existing `Groups` section.
- Always render the sidebar `Groups` section (including the "+" add affordance), independent of group count. The "All groups" filter item is still hidden until 2+ groups exist (where it becomes meaningful).
- Render each group row in the sidebar as a flat nav row matching the existing `Views` row style. The row exposes a hover-reveal `⋮` menu (always-visible on coarse pointers, mirroring the `TaskRow` drag-handle pattern) and a directly clickable color dot. Both paths lead to the color picker.
- Remove the `Groups` section from the settings drawer. The settings drawer's other sections (Timer, Display, Data, Google Drive) are unchanged.
- Update `group-management` requirements: rewrite the "Group UI is hidden with one group" requirement so it no longer hides the sidebar section, add a "Sidebar hosts group CRUD" requirement covering add/rename/color/delete in the sidebar, and reword the existing CRUD scenarios from "in settings" to "in the sidebar". The group-lens behavior is unchanged.
- Update `settings` requirements: remove the "Groups section mounts the groups management panel" scenario and update the drawer's purpose text to no longer list Groups among its sections.

No new external APIs, no new dependencies, no data model changes. The `useGroupStore` and `useTaskStore` actions used for resolution are unchanged.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `group-management`: The "Group UI is hidden with one group" requirement is narrowed to the task-row group tag (the sidebar `Groups` section is now always shown). A new "Sidebar hosts group CRUD" requirement is added covering add/rename/color/delete interactions and their task-resolution guarantees. Scenarios that reference "in settings" are reworded to "in the sidebar".
- `settings`: The "Settings drawer hosts feature-owned panels" requirement drops its Groups-section scenario. The drawer's purpose text updates to remove Groups from the listed sections.

## Impact

- `src/app/Sidebar.tsx` — gains CRUD state, menus, popovers, and an always-visible add input. Becomes the sole host of group CRUD UI.
- `src/app/shell/SettingsDrawer.tsx` — drops the `Groups` section block and the `GroupSettingsPanel` import.
- `src/modules/groups/components/GroupSettingsPanel.tsx` — likely refactored or split: the row-level controls (color popover, rename, delete with resolve) move into a new sidebar-internal component. The bottom "Add group" input is replaced by a sidebar input row. The public component may be removed once settings no longer mounts it.
- `src/app/App.sidebar.test.tsx` and `src/modules/groups/components/GroupSettingsPanel.test.tsx` — tests update to reflect the new location and the always-visible section.
- No store changes. No localStorage key changes. No migration.
- `useGroupStore` action `addGroup` is invoked from the sidebar instead of the settings panel. The `reassignTasks` / `deleteTasksByGroupId` cascade behavior and the focused-task guarantees from `task-management` apply unchanged.
