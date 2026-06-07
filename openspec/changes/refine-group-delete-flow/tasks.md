## 1. Store guard: default group cannot be deleted

- [ ] 1.1 Add early return in `useGroupStore.deleteGroup` (`src/features/groups/store.ts`) when `id === DEFAULT_GROUP_ID`, before the `length <= 1` check.
- [ ] 1.2 Add a test in `src/features/groups/store.test.ts` that calls `deleteGroup(DEFAULT_GROUP_ID)` on a store with multiple groups and asserts the default group still exists.
- [ ] 1.3 Add a test asserting that calling `deleteGroup(DEFAULT_GROUP_ID)` does not throw.

## 2. UI: disable trash button on default group

- [ ] 2.1 In `GroupItem` (`src/features/groups/components/GroupSettingsPanel.tsx`), compute `isDefault = group.id === DEFAULT_GROUP_ID` and pass it through to the trash button's `disabled` prop alongside the existing `isLast` rule (`disabled={isLast || isDefault}`).
- [ ] 2.2 Import `DEFAULT_GROUP_ID` from `@/features/groups` in `GroupSettingsPanel.tsx` if not already imported in the right scope.

## 3. UI: branch on empty group

- [ ] 3.1 In `GroupItem`, subscribe to the count of tasks in this group via `useTaskStore`: `const hasTasks = useTaskStore(s => s.tasks.some(t => t.groupId === group.id))`. Use a derived selector so the row re-renders only when the boolean flips.
- [ ] 3.2 Also subscribe to the raw count for microcopy: `const taskCount = useTaskStore(s => s.tasks.filter(t => t.groupId === group.id).length)`. (Or compute count only inside the popover render path to avoid unnecessary re-renders.)
- [ ] 3.3 When `hasTasks` is false, the trash button's click handler calls `deleteGroup(group.id)` directly (lifted via a callback prop or invoked through the existing `onDelete` path with a clear branch).

## 4. UI: replace AlertDialog with Popover for non-empty groups

- [ ] 4.1 In `GroupSettingsPanel.tsx`, remove the `AlertDialog*` imports and add `Popover`, `PopoverTrigger`, `PopoverContent` from `@/shared/ui`.
- [ ] 4.2 Replace the `<AlertDialog>` block in `GroupItem` with a `<Popover>` whose `PopoverTrigger` renders the trash `Button` (same `ghostDestructive` variant, same `disabled` rule from task 2.1, conditional rendering based on `hasTasks` from task 3.1).
- [ ] 4.3 Configure `PopoverContent` with `align="end"` and default `side`. Set a sensible `className` for width (e.g., `min-w-[200px]`) matching the visual weight of other popovers in the app.
- [ ] 4.4 Inside `PopoverContent`, render the header microcopy: `"<group name>" has N task(s)` using `taskCount` from task 3.2. Use the singular/plural form appropriately.
- [ ] 4.5 Render three buttons in order: `Move to General` (`Button` default variant) → `Delete all tasks` (destructive variant) → `Cancel` (ghost variant). None should have autofocus.
- [ ] 4.6 Wire `Move to General` to `onDelete(group.id, true)` and `Delete all tasks` to `onDelete(group.id, false)`. Both must close the popover (use a controlled `open` state on the `Popover` or rely on `PopoverPrimitive.Close` if available — confirm against `@base-ui/react` API during implementation).
- [ ] 4.7 Wire `Cancel` to simply close the popover with no other effect.
- [ ] 4.8 Verify Escape and click-outside close the popover (default `@base-ui/react` behavior; confirm in browser).
- [ ] 4.9 Verify focus returns to the trash button when the popover closes.

## 5. Tests

- [ ] 5.1 Add a test for `GroupSettingsPanel` (create `GroupSettingsPanel.test.tsx` next to the component if it does not exist) that renders a group with zero tasks, clicks its trash button, and asserts the group is removed without any popover/dialog appearing.
- [ ] 5.2 Add a test that renders a group with one or more tasks, clicks its trash button, asserts the popover opens with the task count microcopy and three action buttons in the documented order.
- [ ] 5.3 Add a test that clicks "Move to General" in the popover and asserts the tasks are reassigned and the group is deleted.
- [ ] 5.4 Add a test that clicks "Delete all tasks" in the popover and asserts the tasks are removed and the group is deleted.
- [ ] 5.5 Add a test that clicks "Cancel" and asserts no state mutation.
- [ ] 5.6 Add a test asserting the trash button on the default group's row is disabled.

## 6. Verification

- [ ] 6.1 Run `npm run format`.
- [ ] 6.2 Run `npm run typecheck`.
- [ ] 6.3 Run `npm run lint`.
- [ ] 6.4 Run `npm run test`.
- [ ] 6.5 Manual smoke test: create two groups, add a task to one, delete the empty one (should vanish), delete the non-empty one via popover with each choice, attempt to delete "General" (should be disabled).
