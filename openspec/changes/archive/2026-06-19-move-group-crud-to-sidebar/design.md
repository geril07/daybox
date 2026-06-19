## Context

The sidebar (`src/app/Sidebar.tsx`, rendered in a 220px desktop `<aside>` and a 260px mobile `Sheet`) currently renders two read-only sections: `Views` and `Groups` (the latter only when 2+ groups exist). Groups appear as filter chips: a click sets the active group lens (`null` for "All groups", or a group id), and the parent (`App.tsx`) holds that lens as runtime state. The sidebar owns no CRUD.

All group CRUD lives in the settings drawer's `GroupSettingsPanel` (`src/modules/groups/components/GroupSettingsPanel.tsx`), mounted via `SettingsDrawer.tsx`. That panel renders bordered card rows, each with a color popover (palette + native input), an inline rename input, and a delete button that opens a resolve popover ("Move tasks to General" / "Delete all tasks" / "Cancel"). A persistent text input + "Add" button at the bottom of the panel handles group creation.

The settings drawer is 310px wide and mounts the panel as one of four feature-owned sections (Timer, Display, Groups, Data, Google Drive). Each section reads and writes its own feature's store; the drawer owns no persisted data.

The `group-management` spec today is written around `SettingsDrawer`: the "Group UI is hidden with one group" requirement hides the sidebar section at 1 group, and CRUD scenarios say "in settings". Moving the CRUD to the sidebar inverts the hide rule for the sidebar section (but keeps the task-row tag hide rule) and relocates the scenarios.

The existing `TaskRow` component (`src/modules/tasks/components/TaskRow.tsx`) already establishes a hover-reveal pattern that degrades on coarse pointers: `group-hover:opacity-100 pointer-coarse:opacity-100` (drag handle, line 96) and `group-hover:opacity-100 pointer-coarse:hidden` (action buttons, line 163). The sidebar's `⋮` menu maps to the drag-handle pattern — always-visible on touch because there is no alternative touch path to edit/delete a group.

The sidebar is wider than the 310px settings panel rows? No — 220px is the desktop width, 260px in the mobile sheet. 220px is enough for: a 11px color dot, a 1–2 word group name, a 20px `⋮` button, and the popovers (which portal outside the sidebar bounds via base-ui `Popover`). The current panel's 310px was needed because of its three-per-row control layout (dot + name + pencil + trash). The sidebar row collapses to (dot + name + ⋮), so 220px is comfortable.

## Goals / Non-Goals

**Goals:**

- Every group interaction (filter, create, rename, recolor, delete with resolution) lives in the sidebar.
- The settings drawer no longer contains a Groups section.
- The sidebar's `Groups` section is always visible (1 group or more). The "All groups" item only appears at 2+ groups.
- Group rows render in the same flat ghost-button style as `Views` rows, so the sidebar reads as one unified nav.
- The `⋮` menu uses the existing `TaskRow` coarse-pointer pattern so the sidebar behaves correctly on touch.
- The `useGroupStore` and `useTaskStore` actions used today are reused as-is, including the focused-task cascade defined in `task-management`.

**Non-Goals:**

- Changing the data model or localStorage keys.
- Changing the focused-task cascade behavior.
- Adding a separate sidebar CRUD for any other entity (tasks, timer presets, routines).
- A redesign of the sidebar's overall layout beyond the Groups section.
- Keyboard shortcuts for group CRUD beyond what the existing row interactions provide.
- A different color picker — the existing palette + native input stays.
- Drag-to-reorder groups (not in scope).

## Decisions

### D1: Always show sidebar `Groups` section, but hide "All groups" at ≤1 group

- The `Groups` section header and its rows are always rendered. This makes the `+` add affordance always reachable, so a 1-group user can create a 2nd group from the sidebar without hunting for an entry point elsewhere.
- The "All groups" row is hidden when ≤1 group. With only `General` present, "All groups" and `General` filter to the same set — redundant. The `General` row is sufficient.
- The task-row group tag (the small colored dot + name on each task row) still hides at 1 group. The sidebar is navigation; the tag is inline labeling. Different progressive-disclosure rules are appropriate.

**Alternatives considered:**

- Hide the entire section at 1 group (status quo). Rejected: leaves the user with no visible add affordance.
- Show "All groups" always. Rejected: redundant row at 1 group adds noise without value.

### D2: Flat row style matching `Views` rows; row is a `<div role="button">`, not a `Button` primitive

- Group rows render with the same Tailwind class set as `Views` rows in `Sidebar.tsx` (round-md, px-2 py-2, text-sm font-medium, selected state via `bg-muted`) so the sidebar reads as one unified nav.
- The current `GroupSettingsPanel` row style (bordered card, `rounded-xl border`) is dropped. The `⋮` button and the directly-clickable color dot already signal that the row is manipulable.
- The "selected" state (active lens) is visually identical to a selected `Views` row.
- **The row is a `<div role="button" tabIndex={0}>` with an `onClick` and an `onKeyDown` for Enter/Space, NOT the `Button` primitive.** The row contains a real `<button>` for the color dot and a real `<button>` for the `⋮` menu trigger; HTML disallows nested `<button>` elements, so the row cannot itself be a `<button>`. This is a divergence from the `Views` rows (which are simple buttons with no button children), but the visual style is identical so the sidebar still reads as one component.
- The color dot's `onClick` and the `⋮` menu trigger's `onClick` MUST call `e.stopPropagation()` so tapping them does not also fire the row's lens-set handler (mirroring `TaskRow.tsx:98`). The rename input's `onKeyDown` for Enter should likewise `stopPropagation` so saving a rename does not also re-set the lens.

**Alternatives considered:**

- Use `Button variant="ghost" size="none"` like `Views` rows. Rejected: HTML-invalid (nested buttons); the color dot and `⋮` would not be reachable as clickable elements.
- Keep bordered cards. Rejected: visually separates groups from views, breaks the unified nav.
- Cards only when hovered. Rejected: visual flicker, no benefit.

### D3: `⋮` menu for rename + delete; directly-clickable color dot for color; both reach the color picker

- Each row exposes a `⋮` button (MoreHorizontal from `lucide-react`) that opens a `Menu`/`Popover` with: `Change color`, `Rename`, `Delete`.
- The color dot is also directly clickable, opening the same color popover the `Change color` menu item opens. Both paths lead to the color picker.
- The duplicate entry to color is intentional: the dot is the fast path for power users; the menu item is the discoverable path for new users.
- `Rename` menu item → menu closes → row name becomes an inline input (same inline-edit pattern as today: Enter saves, Escape cancels, blur saves).
- `Delete` menu item → menu closes → if the group has zero tasks, delete immediately; if the group has tasks, the resolve popover opens anchored to the `⋮` button with `align="end"` (Move to General / Delete all tasks / Cancel). Anchoring to the `⋮` button (not the row) keeps the popover's right edge aligned with the menu trigger, mirroring the current `GroupSettingsPanel.tsx:247` behavior. The resolve popover portals outside the sidebar via base-ui `Popover`, so the 220px rail width is not a constraint.

**Alternatives considered:**

- Only `⋮` menu, dot purely decorative. Rejected: slower (2 clicks) for the common recolor action; loses direct affordance.
- Only directly-clickable dot, no `⋮` menu. Rejected: no room on a 220px flat row for three separate icons (color + pencil + trash) without reverting to bordered-card density.
- Inline expanding row for color picker. Rejected: pushes other rows down, jarring in a nav rail.
- Submenu for delete (Move / Delete-all as nested items). Rejected: nested menus in a narrow rail are awkward; the resolve popover preserves the current UX.

### D4: `⋮` visibility uses the `TaskRow` drag-handle pattern, not the action-button pattern

- `⋮` is `opacity-0 group-hover:opacity-100` (on a `group/row` parent) and `pointer-coarse:opacity-100` (always visible on touch).
- This mirrors `TaskRow.tsx:96` (drag handle), not `TaskRow.tsx:163` (action buttons, which are `pointer-coarse:hidden`).
- Rationale: the `⋮` menu is the **only** path to edit/delete a group on touch (no alternative touch interaction like a long-press or swipe exists for group rows). Hiding it on touch would block all group CRUD on mobile. The `TaskRow` action buttons can be hidden on touch because the row itself has alternative touch affordances; group rows do not.
- Tailwind 4 ships `pointer-coarse:` as a built-in variant — no custom config required (verified against `src/index.css`).

**Alternatives considered:**

- Always-visible `⋮` everywhere. Rejected: noisier on desktop where hover-reveal is the established pattern.
- `pointer-coarse:hidden` like `TaskRow` action buttons. Rejected: no alternative touch path to CRUD.
- Long-press / right-click context menu on touch. Rejected: hidden, undiscoverable, inconsistent with the rest of the sidebar.

### D5: `+` add affordance lives in the `Groups` section title row; focuses a persistent input at the bottom

- The `Groups` section header renders `Groups` on the left and a `+` (Plus from `lucide-react`) on the right. The `+` is always visible (independent of group count) so 1-group users can add a 2nd group.
- A transient add row appears at the bottom of the section when the user clicks the `+`. The row is `flex items-center justify-between` with a borderless text field on the left and `Cancel` / `Confirm` icon buttons on the right.
- The input auto-focuses when the row opens. Submission happens on `Enter`, on blur when the field is non-empty, or by clicking the `Confirm` button. `Escape` or clicking `Cancel` closes the row without creating a group. Blur ignores clicks on the `Cancel` / `Confirm` buttons via `data-cancel` / `data-submit` guards so the buttons do not double-submit or race.
- The input is hidden when not in use, so the sidebar stays compact.

**Alternatives considered:**

- Persistent input always visible. Rejected: adds visual noise when the user is not adding a group; the `+` affordance is enough invitation.
- `+` opens a popover. Rejected: a popover for a single text field is heavier than an inline row; loses inline feel.
- Input with a single submit button and no cancel. Rejected: users need an explicit escape path; the transient row's `Cancel` and `Escape` behaviors match the project's other inline-edit patterns.
- Place the add row at the top of the list (under the title). Rejected: visually odd that the newest item appears at the top; users expect lists to append.

### D6: `GroupSettingsPanel` is split, not lifted wholesale

- The panel's row-level controls (color popover, inline rename, delete-with-resolve popover) move into a new sidebar-internal component, e.g. `src/modules/groups/components/SidebarGroupItem.tsx`.
- The transient add-group input is extracted into `SidebarAddGroupInput.tsx` and mounted at the bottom of the `Groups` section.
- `GroupSettingsPanel` and its test file are removed once no caller mounts it.
- The split keeps the new sidebar-internal component free of any settings-drawer coupling and lets the settings drawer lose the `GroupSettingsPanel` import cleanly.

**Alternatives considered:**

- Move the entire `GroupSettingsPanel` into the sidebar as a unit. Rejected: it is a 310px drawer-oriented layout (bordered cards, explicit Add button); repurposing it inside a 220px rail with flat rows is more work than splitting.
- Keep `GroupSettingsPanel` exported in case a future feature wants it. Rejected: YAGNI; the only caller is the settings drawer which loses it.

## Risks / Trade-offs

- **Discoverability of the `⋮` menu on desktop (hover-revealed) and on touch (always-visible)** — users accustomed to settings-drawer CRUD may not look in the sidebar. Mitigation: the `+` in the title row is a strong convention; the `⋮` icon is a strong convention; the sidebar already lists groups, so users are already looking at this surface when managing groups.

- **Color dot is directly clickable but the affordance is implicit** — the dot has no "change color" tooltip/aria-label today (it has `aria-label="Change group color"` already in `GroupSettingsPanel`). Mitigation: keep that `aria-label`; a `title="Change color"` for hover discoverability is a one-line addition.

- **Resolve-on-delete popover portals outside the sidebar** — on narrow viewports the popover's right-edge alignment could clip. Mitigation: anchor the resolve popover to the `⋮` button (`align="end"`) so it grows leftward into the content area, mirroring the current `align="end"` in `GroupSettingsPanel.tsx:247`.

- **Test churn in `App.sidebar.test.tsx` and `GroupSettingsPanel.test.tsx`** — the tests assert specific row contents and a panel layout that no longer exists. Mitigation: rewrite the sidebar tests to cover the new CRUD affordances (add, rename via menu, color via dot, delete via menu, delete-empty-skips-prompt); remove or replace the panel tests; the store-level behaviors are already covered by store tests.

- **Spec scenario churn** — three or four existing scenarios in `group-management` say "in settings". Mitigation: reword them to "in the sidebar" as part of the delta spec; behavior is unchanged so the intent of each scenario transfers directly.

- **Sidebar height growth from the always-visible section + add input** — with many groups, the section + input could push the `Views` section out of view on a short viewport. Mitigation: the sidebar already lives inside a flex column inside the shell's `min-h-0` flex row; an `overflow-y-auto` on the sidebar (not the main content) keeps the sidebar scrollable independently if it ever needs to be. Today's sidebar does not scroll, so this is added only if a real overflow appears.

## Open Questions

- Should the persistent add input have an explicit "Add" button (matching the current panel's pattern) for discoverability, or is `Enter` + the `+` icon in the title enough? The design picks `Enter`-only for flatness, but this is a small UX call worth confirming during implementation.
- If a future change adds many groups (e.g. 20+), should the sidebar scroll independently or should the section collapse after N rows? Out of scope for this change; addressed if/when it bites.
