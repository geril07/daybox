## 1. Store guard: default group cannot be deleted

- [x] 1.1 Add early return in `useGroupStore.deleteGroup` (`src/features/groups/store.ts`) when `id === DEFAULT_GROUP_ID`, before the `length <= 1` check.
- [x] 1.2 Add a test in `src/features/groups/store.test.ts` that calls `deleteGroup(DEFAULT_GROUP_ID)` on a store with multiple groups and asserts the default group still exists.
- [x] 1.3 Add a test asserting that calling `deleteGroup(DEFAULT_GROUP_ID)` does not throw.

## 2. UI: disable trash button on default group

- [x] 2.1 In `GroupItem` (`src/features/groups/components/GroupSettingsPanel.tsx`), compute `isDefault = group.id === DEFAULT_GROUP_ID` and pass it through to the trash button's `disabled` prop alongside the existing `isLast` rule (`disabled={isLast || isDefault}`).
- [x] 2.2 Import `DEFAULT_GROUP_ID` from `@/features/groups` in `GroupSettingsPanel.tsx` if not already imported in the right scope.

## 3. UI: branch on empty group

- [x] 3.1 In `GroupItem`, subscribe to the count of tasks in this group via `useTaskStore`: `const hasTasks = useTaskStore(s => s.tasks.some(t => t.groupId === group.id))`. Use a derived selector so the row re-renders only when the boolean flips.
- [x] 3.2 Also subscribe to the raw count for microcopy: `const taskCount = useTaskStore(s => s.tasks.filter(t => t.groupId === group.id).length)`. (Or compute count only inside the popover render path to avoid unnecessary re-renders.)
- [x] 3.3 When `hasTasks` is false, the trash button's click handler calls `deleteGroup(group.id)` directly (lifted via a callback prop or invoked through the existing `onDelete` path with a clear branch).

## 4. UI: replace AlertDialog with Popover for non-empty groups

- [x] 4.1 In `GroupSettingsPanel.tsx`, remove the `AlertDialog*` imports and add `Popover`, `PopoverTrigger`, `PopoverContent` from `@/shared/ui`.
- [x] 4.2 Replace the `<AlertDialog>` block in `GroupItem` with a `<Popover>` whose `PopoverTrigger` renders the trash `Button` (same `ghostDestructive` variant, same `disabled` rule from task 2.1, conditional rendering based on `hasTasks` from task 3.1).
- [x] 4.3 Configure `PopoverContent` with `align="end"` and default `side`. Set a sensible `className` for width (e.g., `min-w-[200px]`) matching the visual weight of other popovers in the app.
- [x] 4.4 Inside `PopoverContent`, render the header microcopy: `"<group name>" has N task(s)` using `taskCount` from task 3.2. Use the singular/plural form appropriately.
- [x] 4.5 Render three buttons in order: `Move to General` (`Button` default variant) → `Delete all tasks` (destructive variant) → `Cancel` (ghost variant). None should have autofocus.
- [x] 4.6 Wire `Move to General` to `onDelete(group.id, true)` and `Delete all tasks` to `onDelete(group.id, false)`. Both must close the popover (use a controlled `open` state on the `Popover` or rely on `PopoverPrimitive.Close` if available — confirm against `@base-ui/react` API during implementation).
- [x] 4.7 Wire `Cancel` to simply close the popover with no other effect.
- [x] 4.8 Verify Escape and click-outside close the popover (default `@base-ui/react` behavior; confirm in browser).
- [x] 4.9 Verify focus returns to the trash button when the popover closes.

## 5. Tests

- [x] 5.1 Add a test for `GroupSettingsPanel` (create `GroupSettingsPanel.test.tsx` next to the component if it does not exist) that renders a group with zero tasks, clicks its trash button, and asserts the group is removed without any popover/dialog appearing.
- [x] 5.2 Add a test that renders a group with one or more tasks, clicks its trash button, asserts the popover opens with the task count microcopy and three action buttons in the documented order.
- [x] 5.3 Add a test that clicks "Move to General" in the popover and asserts the tasks are reassigned and the group is deleted.
- [x] 5.4 Add a test that clicks "Delete all tasks" in the popover and asserts the tasks are removed and the group is deleted.
- [x] 5.5 Add a test that clicks "Cancel" and asserts no state mutation.
- [x] 5.6 Add a test asserting the trash button on the default group's row is disabled.

## 6. Verification

- [x] 6.1 Run `npm run format`.
- [x] 6.2 Run `npm run typecheck`.
- [x] 6.3 Run `npm run lint`.
- [x] 6.4 Run `npm run test`.
- [x] 6.5 Manual smoke test: create two groups, add a task to one, delete the empty one (should vanish), delete the non-empty one via popover with each choice, attempt to delete "General" (should be disabled).
