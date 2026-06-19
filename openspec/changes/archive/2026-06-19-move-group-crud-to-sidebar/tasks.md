## 1. Build the new sidebar group item component

- [x] 1.1 Create `src/modules/groups/components/SidebarGroupItem.tsx` with props `{ group, isActive, onSelect, onRename, onSetColor, onDelete, onResolveAndDelete, isLast }`. The row is a `<div role="button" tabIndex={0}>` (NOT the `Button` primitive — HTML disallows nested `<button>` elements, and the row contains a real `<button>` for the color dot and a real `<button>` for the `⋮` menu trigger) with the same Tailwind classes as the `Views` rows in `Sidebar.tsx` (`justify-start gap-2.5 rounded-md px-2 py-2 text-sm font-medium`, selected state via `bg-muted`). Add `onClick` to set the lens and `onKeyDown` for `Enter` / `Space` to set the lens from the keyboard. Add `e.stopPropagation()` to the color-dot `onClick` and the `⋮` menu-trigger `onClick` so they do not also set the lens. Add `title="Change color"` to the color dot for hover discoverability (the 11px dot is a small tap target).
- [x] 1.2 Implement the color picker popover inside the new component: 16-swatch grid, current-color ring, native `<input type="color">` (wrapped in a `CustomColorInput` component that throttles color commits via `requestAnimationFrame`) with `Custom` label, closes on swatch click (but NOT on custom-color change, so the user can see the result while picking). Reuse the `GROUP_COLORS` constant and popover styling from `GroupSettingsPanel.tsx`.
- [x] 1.3 Implement inline rename: `⋮` → `Rename` closes the menu and turns the row name into a text input. Enter saves via `onRename`, Escape cancels and restores the prior name, blur saves (with `data-cancel` guard to avoid double-fire, mirroring `GroupSettingsPanel.tsx:194-197`). Call `e.stopPropagation()` in the Enter handler so saving the rename does not also bubble to the row's Enter-to-set-lens handler.
- [x] 1.4 Implement delete-with-resolution: `⋮` → `Delete` closes the menu. If the group has zero tasks, call `onDelete` immediately. Otherwise open the resolve popover anchored to the `⋮` button with `align="end"` and `Move tasks to General` / `Delete all tasks` / `Cancel`, using the same task-count copy as `GroupSettingsPanel.tsx:248-265`.
- [x] 1.5 Apply the hover/coarse-pointer visibility to the `⋮` button: wrap the row in `className="group/row"` and the `⋮` in `opacity-0 group-hover/row:opacity-100 pointer-coarse:opacity-100` (matching `TaskRow.tsx:96`).
- [x] 1.6 Disable the `Delete` menu item (and the underlying handler) when `isLast` (only one group) or when the group is `DEFAULT_GROUP_ID`, matching `GroupSettingsPanel.tsx:104-105`.
- [x] 1.7 Keep the `aria-label="Change group color"` on the color-dot trigger (carried over from `GroupSettingsPanel.tsx:147`) and add `aria-label="Group actions"` to the `⋮` button.

## 2. Build the sidebar's add-group input

- [x] 2.1 Create `src/modules/groups/components/SidebarAddGroupInput.tsx` conditionally rendered while adding a group. The row is `flex items-center justify-between` with a borderless text field on the left and `Cancel` / `Confirm add group` icon buttons on the right. `Enter` submits via `useGroupStore.addGroup`; `Escape` closes without creating; blur creates the group if the name is non-empty (with `data-cancel` / `data-submit` guards so clicking the buttons does not double-fire).
- [x] 2.2 Wire the input to `useGroupStore` directly (it is the only consumer; no need to thread callbacks). Match the auto-color assignment contract from `group-management` (palette index 1–15, skipping General's index 0) — `addGroup` already does this; no logic changes.
- [x] 2.3 `Sidebar.tsx` owns `isAddingGroup` state and toggles the add input with the title-row `+` `Button`. `SidebarAddGroupInput` auto-focuses its text field when opened via `useLayoutEffect`.
- [x] 2.4 Export the new components from the `modules/groups` barrel. Add `export * from './components/SidebarGroupItem'` and `export * from './components/SidebarAddGroupInput'` to `src/modules/groups/index.ts` so `src/app/Sidebar.tsx` imports from `@/modules/groups` per the architecture spec (`openspec/specs/architecture/spec.md:81-83`).

## 3. Wire the sidebar to host the new CRUD

- [x] 3.1 In `src/app/Sidebar.tsx`, always render the `Groups` section (drop the `showGroups` gate for the section's title + rows). The title row renders a `Button` with the `Plus` icon (`lucide-react`) that opens the transient add input at the bottom of the section.
- [x] 3.2 Render the `All groups` row only when `groups.length >= 2`. With `groups.length === 1`, render the single group row directly. This matches the new "Sidebar Groups section is always visible" requirement.
- [x] 3.3 Replace the current flat group `Button` rows with `SidebarGroupItem` (one per group, after the `All groups` row). Pass `isActive = selectedGroupId === group.id` and the same `onSelectGroup` for click-row. Pass `onRename` / `onSetColor` / `onDelete` from `useGroupStore` and a local `handleResolveAndDelete` that calls `useTaskStore.reassignTasks` / `deleteTasksByGroupId` exactly once each (mirroring `GroupSettingsPanel.tsx:36-46`).
- [x] 3.4 Mount `SidebarAddGroupInput` at the bottom of the `Groups` section, below the group rows. Pass `open` and `onClose` from `Sidebar.tsx`.
- [x] 3.5 Add a `MoreHorizontal` import to `src/app/Sidebar.tsx` (or, if you prefer keeping the icon import in the `SidebarGroupItem` file, import it in `SidebarGroupItem.tsx`). Do not touch `src/app/sidebarViews.ts` — that file is the typed list of view rows and has no relation to group-row icons.

## 4. Remove the Groups section from the settings drawer

- [x] 4.1 In `src/app/shell/SettingsDrawer.tsx`, remove the `GroupSettingsPanel` import and the `Groups` section block (lines 197-202 in the current file). Leave the rest of the drawer (Timer, Display, Data, Google Drive) untouched.
- [x] 4.2 Verify the drawer's `Settings` title and the `flex-1 flex-col gap-7 overflow-y-auto p-5` wrapper still render correctly without the Groups section.

## 5. Delete the old `GroupSettingsPanel` and its test

- [x] 5.1 Delete `src/modules/groups/components/GroupSettingsPanel.tsx`.
- [x] 5.2 Delete `src/modules/groups/components/GroupSettingsPanel.test.tsx`.
- [x] 5.3 Remove the `GroupSettingsPanel` export from `src/modules/groups/index.ts` (and any barrel re-export) so no stale import remains. (The new `SidebarGroupItem` and `SidebarAddGroupInput` exports are added in task 2.4.)

## 6. Update the sidebar tests

- [x] 6.1 In `src/app/App.sidebar.test.tsx`, replace any assertion that the Groups section is hidden at 1 group with an assertion that the section is visible. Add assertions for: `+` button in the title row, `⋮` button present (visible per the coarse-pointer class), color dot clickable. The add input is transient: assert it appears after clicking `+` and is hidden after submit/cancel/blur.
- [x] 6.2 Add new tests covering: clicking the color dot opens the color popover; clicking `⋮` opens the menu; `Rename` item turns the row into an input; `Delete` on an empty group deletes immediately; `Delete` on a non-empty group opens the resolve popover. Use the same `useGroupStore` / `useTaskStore` seeding pattern as `GroupSettingsPanel.test.tsx`. Add a spy assertion that `useTaskStore.reassignTasks` / `deleteTasksByGroupId` are called **exactly once** per delete (the "Group deletion routes through the bulk task helpers" requirement in `group-management`). Also mirror the three focused-task-cascade tests from `GroupSettingsPanel.test.tsx:175-222` (moving preserves focus, deleting clears focus, deleting an unfocused group leaves focus alone) so the cascade contract is covered end-to-end through the new UI.

## 7. Verify

- [x] 7.1 `npm run format`
- [x] 7.2 `npm run typecheck`
- [x] 7.3 `npm run lint`
- [x] 7.4 `npm run test`
- [x] 7.5 Manual smoke: open DayBox in the browser, confirm 1-group state shows the section with the single `General` row + `+` button; create a second group from the sidebar; rename via `⋮`; recolor via dot; delete the empty group (no prompt) and a non-empty group (resolve prompt); reload to confirm persistence and that the lens is not persisted.
