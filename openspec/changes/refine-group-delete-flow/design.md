## Context

Today `GroupSettingsPanel` triggers an `AlertDialog` on every delete click, regardless of whether the group has tasks. The dialog is structurally a **resolution picker** — every primary button is a different downstream effect ("Move to General", "Delete all tasks") — not a yes/no confirmation. Using a modal primitive for a picker is a mismatch: it pulls focus, hides the panel behind a backdrop, and forces ceremony even when the group is empty and nothing is at stake.

Separately, `useGroupStore.deleteGroup` only refuses when exactly one group is left (`store.ts:96`). Nothing stops a caller from deleting the seeded "General" group, which leaves orphaned references to `DEFAULT_GROUP_ID` — both for tasks that fall back to it and for the panel's own "Move to General" option, which would point at a soon-deleted id.

Relevant primitives already exist:

- `Popover`, `PopoverTrigger`, `PopoverContent` in `@/shared/ui` (used by `TaskRow` and `AddTaskRow`).
- `DEFAULT_GROUP_ID` exported from `@/features/groups`.

## Goals / Non-Goals

**Goals:**

- Replace the modal confirmation with a popover anchored to the trash button, shown only when the group has ≥1 task.
- Delete empty groups silently with no prompt.
- Block deletion of the default group at both the UI affordance level and the store level.
- Keep the delta minimal and surgical — touch only `GroupSettingsPanel.tsx` and `groups/store.ts`.

**Non-Goals:**

- Refactoring `handleDeleteGroup` to use the existing `reassignTasks` / `deleteTasksByGroupId` helpers in `tasks/store.ts`. That is a related but distinct quality issue and belongs in a follow-up change so this one stays focused on the UX and the default-group guard.
- Adding undo for group deletion.
- Changing any other group-related affordance (rename, add, color, ordering).
- Introducing a hold-to-confirm interaction for the destructive choice.

## Decisions

### Decision 1: Popover instead of AlertDialog

Use `Popover` from `@/shared/ui` for the resolution prompt.

**Rationale:**

- The prompt is a picker, not a confirmation. Pickers belong in popovers; confirmations belong in modals.
- Locality: the popover anchors to the trash button, keeping cause and effect visually adjacent and preserving the rest of the panel as visible context.
- It also enables the empty-group case to degrade gracefully to "no UI at all" — a modal popping up empty would feel absurd, but the popover branch simply doesn't render.

**Alternatives considered:**

- _Keep `AlertDialog`, fix transparency/contrast._ Treats a symptom (the dialog feels heavy) but not the cause (wrong primitive for the job).
- _Popover for Move, modal escalation for Delete-all._ Re-introduces ceremony for the very case the popover framing makes unnecessary, and adds a two-step UX that punishes the common path.

### Decision 2: Anchor to trash button with `align="end"`

`PopoverContent` defaults to `side="bottom"` and `align="center"`. We override `align="end"` so the popup edge lines up with the trailing edge of the trash button. Side stays at the default — top vs bottom is automatically handled by `@base-ui/react` based on viewport space, which is the right behavior in this collapsible settings panel.

**Rationale:** The trash button sits at the right edge of the row; `align="end"` keeps the popup from spilling into the row above, while the default automatic side-flip handles overflow at the bottom of the panel.

### Decision 3: Show task count in microcopy

Header reads: `"<group name>" has N task(s)`. The word "all" in "Delete all tasks" is otherwise ambiguous (does it include completed? archived? scheduled later?). Showing the raw count anchors the decision in concrete numbers.

The count is computed from `useTaskStore.getState().tasks.filter(t => t.groupId === group.id).length`. "Any task" is the threshold — completed status does not exclude.

### Decision 4: Button order — Move, Delete-all, Cancel

In this order, top to bottom:

1. **Move to General** — primary visual weight (`Button` default variant), safer choice nearest the pointer.
2. **Delete all tasks** — destructive variant, deliberately placed below the safer option so the destructive button is _not_ where the pointer lands after click.
3. **Cancel** — ghost variant, smaller, present for keyboard / touch users even though click-outside and Escape also dismiss.

No button receives autofocus or `Enter`-default. The user must make a conscious selection.

### Decision 5: Two-layer guard on default-group deletion

- **UI layer:** `GroupItem` disables its trash button when `group.id === DEFAULT_GROUP_ID` (in addition to the existing `isLast` rule).
- **Store layer:** `useGroupStore.deleteGroup` returns early if `id === DEFAULT_GROUP_ID`.

**Rationale:** UI rule communicates intent visually. Store rule prevents the latent bug from any future caller (import / migration / future component) bypassing the panel. Defense in depth is cheap here — one extra conditional.

### Decision 6: Branching logic lives in `GroupItem`, not in `GroupSettingsPanel`

`GroupItem` already owns the trash trigger and per-row state. It computes `hasTasks` locally (`useTaskStore` selector keyed by `group.id`) and decides whether to render the popover or call the delete handler directly. The parent's `onDelete` API (`(groupId: string, reassignToDefault: boolean) => void`) is unchanged for the popover path; for the empty-group path, `GroupItem` invokes `deleteGroup(groupId)` directly via a new callback or by reusing `onDelete` with a sentinel — chosen during implementation to keep the prop surface minimal.

## Risks / Trade-offs

- **Misclick on "Delete all tasks"** → Mitigated by button ordering (destructive is second, not first), no autofocus, no `Enter` default, and destructive button styling that visually flags the choice.
- **No backdrop means adjacent UI stays interactive** → Click on a different group's trash immediately moves the popover to that group. Considered a feature for bulk cleanup; documented behavior, no mitigation needed.
- **Popover repositioning on small viewports** → `@base-ui/react` `Positioner` auto-flips. If the panel becomes very tight in the future, we'd revisit `side` / `align` defaults then; not worth pre-engineering now.
- **Spec lock-in to the popover primitive** → Spec language stays at "prompt anchored to the delete button" rather than "Popover component" so the requirement survives a future primitive swap.
- **Default-group lockout** → If a user genuinely wanted to rename the seeded "General" group out of existence, they can already rename it (e.g., to "Inbox"). The id stays `default`; only the displayed name changes. No regression.
