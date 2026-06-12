## 1. TaskRow drag handle visibility

- [x] 1.1 Remove the `useState(hovering)` declaration, `setHovering` calls, and `onMouseEnter` / `onMouseLeave` handlers from `TaskRow`. Confirm via `grep` that the symbol is no longer referenced.
- [x] 1.2 Convert the drag-handle `<div>` in `TaskRow` to a CSS-only visibility pattern: add `group` to the row's outermost div, give the handle `opacity-0 group-hover:opacity-100 pointer-coarse:opacity-100 transition-opacity duration-120`, and keep `cursor-grab` / `active:cursor-grabbing`. The visible icon and the `dragHandleRef` wiring are unchanged.
- [x] 1.3 Add a `matchMedia` stub helper in `src/test-utils/matchMedia.ts` (or co-locate in `TaskRow.test.tsx` if a shared helper would be its only consumer) that returns `{ matches: true }` for `(pointer: coarse)` and `{ matches: false }` for `(pointer: fine)`. Default in jsdom is fine-pointer; coarse tests install the stub in `beforeEach` and restore in `afterEach`.
- [x] 1.4 Add tests in `TaskRow.test.tsx`: (a) the `⋮` handle is `opacity-0` at rest under default (fine-pointer) matchMedia; (b) under stubbed coarse-pointer matchMedia, the handle has `opacity-100` on the rendered class list at rest; (c) the existing `[title="Delete"]` and `[title="Focus"]` query selectors still resolve under default matchMedia (regression guard).

## 2. TaskActionSheet component

- [x] 2.1 Create `src/features/tasks/components/TaskActionSheet.tsx`. It accepts `{ task: Task; open: boolean; onOpenChange: (open: boolean) => void }`. It renders the existing `Sheet` with `side="bottom"`, a `<SheetHeader><SheetTitle>{task.title}</SheetTitle></SheetHeader>`, and a body with two button rows: `Focus this task` (calls `useTimerStore.getState().focusTask(task.id)` and `onOpenChange(false)`) and `Delete` (calls `useTaskStore.getState().deleteTask(task.id)` and `onOpenChange(false)`). Both buttons use the existing `Button` primitive with `variant="ghost"` and a `justify-start` left-aligned layout, similar to the GroupChip's popover items.
- [x] 2.2 Add `title="More actions"` to the new `⋯` button. Use the `MoreHorizontal` icon from `lucide-react`.

## 3. TaskRow kebab + sheet wiring

- [x] 3.1 In `TaskRow`, replace the existing `<div className="group/actions … opacity-0 hover:opacity-100">…Focus…Delete…</div>` with two branches wrapped in a `<></>`: the existing div for `pointer:fine` (unchanged markup, keeps the existing `[title="Focus"]` and `[title="Delete"]` selectors), and a new `<TaskActionSheet>` + `⋯` button for `pointer:coarse`. Use the same `pointer-coarse:hidden` / `pointer-fine:hidden` Tailwind v4 utilities to keep only one branch in the DOM at a time.
- [x] 3.2 Place the new `⋯` button at the right edge of the row, at the same horizontal position the hover-revealed `Focus` / `Delete` icons currently occupy, so the row's right edge doesn't shift between pointer types. Use the `icon-sm` size and the same gap pattern (`gap-0.5`).
- [x] 3.3 Add tests in `TaskRow.test.tsx`: (a) under default matchMedia (fine), the `⋯` button is not rendered; (b) under coarse matchMedia, the `⋯` button is rendered and the hover-revealed `Focus` / `Delete` icons are not; (c) clicking the `⋯` opens a sheet that contains the task title and the strings `Focus this task` and `Delete`; (d) clicking `Focus this task` in the sheet calls `focusTask` and closes the sheet; (e) clicking `Delete` in the sheet calls `deleteTask` and closes the sheet; (f) pressing `Escape` in the sheet closes it without modifying the task.

## 4. TaskList touch-only Delay sensor

- [x] 4.1 In `TaskList.tsx`'s `SortableTaskRow`, pass a `sensors` option to `useSortable` that configures a `PointerSensor` with an `activationConstraints` function returning `[PointerActivationConstraints.Delay(250, 5)]` when the source `PointerEvent`'s `pointerType === 'touch'`, else `undefined`. Import `PointerSensor` from `@dnd-kit/react` and `PointerActivationConstraints` from `@dnd-kit/dom`.
- [x] 4.2 Add a test in `TaskList.test.tsx` (or a new `TaskList.sensor.test.tsx`) that: (a) imports the sensor function, (b) calls it with a `PointerEvent`-like object having `pointerType: 'touch'` and asserts the return is an array of length 1, (c) calls it with `pointerType: 'mouse'` and asserts the return is `undefined`. If extracting the function is awkward, expose it as a named export from `TaskList.tsx` and test that.

## 5. Container gutter

- [x] 5.1 In `src/app/App.tsx`, change `px-7` to `px-4 sm:px-7` on three sites: `.header-top` (line 81), `.header-nav` (line 112), and `.container` (line 130).
- [x] 5.2 In `src/features/timer/components/TimerBar.tsx`, change `px-7` to `px-4 sm:px-7` on the inner column wrapper (line 206). The progress-bar strip above it (line 200) keeps its full-bleed width and is unaffected.

## 6. Tab label compression

- [x] 6.1 In `src/app/App.tsx`, change the `tabs` array's type and values to `{ label: string; shortLabel?: string; value: View }[]`. Add `shortLabel: 'Week'` to the `This Week` entry. Other entries omit `shortLabel`.
- [x] 6.2 In the `TabsTrigger` render, wrap the label in two `<span>`s: one with `className="hidden sm:inline"` containing `tab.label`, and one with `className="sm:hidden"` containing `tab.shortLabel ?? tab.label`. The `TabsTrigger` itself is unchanged.
- [x] 6.3 Add a test in `App.test.tsx` (or a new `App.tabs.test.tsx`) that: (a) renders the tabs at default matchMedia (jsdom viewport), (b) asserts the `This Week` trigger's text content includes `This Week`, (c) stubs `matchMedia('(min-width: 640px)')` to return `matches: false` and re-renders, (d) asserts the trigger now reads `Week`. If the existing App tests are not yet set up, a focused unit test on the `tabs` array + a small rendering helper is acceptable.

## 7. Validation

- [ ] 7.1 Run `npm run format` and confirm the diff is empty.
- [ ] 7.2 Run `npm run typecheck` and confirm zero errors.
- [ ] 7.3 Run `npm run lint` and confirm zero errors.
- [ ] 7.4 Run `npm run test` (or `npx vitest run` for a single pass) and confirm the full suite passes, including the new coarse-pointer, sheet, sensor, and tab-label tests.
- [ ] 7.5 Smoke-render the dev server with Chrome DevTools' device emulation set to an iPhone 12 viewport (390 × 844, `pointer: coarse`): confirm the drag handle is visible, the kebab opens the sheet with Focus/Delete, the tabs read `Today / Tomorrow / Week / Unscheduled` and fit, and the column has `16 px` side gutters. Then switch to a 1280 × 800 desktop viewport (`pointer: fine`): confirm the drag handle is hover-revealed, no kebab is present, the tabs read `Today / Tomorrow / This Week / Unscheduled`, and the column has `28 px` side gutters.
