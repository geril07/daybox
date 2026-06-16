## 1. Expand palette

- [x] 1.1 Replace 8-color `GROUP_COLORS` array in `src/modules/groups/constants.ts` with 16 oklch colors evenly spaced on the hue wheel (0°–337.5° in 22.5° steps, lightness 0.55, chroma 0.15)

## 2. Fix color collision

- [x] 2.1 Update `getGroupColorIndex()` in `src/modules/groups/store.ts` to skip index 0 (General's red): return `((groups.length - 1) % 15) + 1`

## 3. Add color mutation action

- [x] 3.1 Add `setGroupColor(id: string, color: string)` action to `GroupActions` interface and store implementation in `src/modules/groups/store.ts`

## 4. Build color picker UI

- [x] 4.1 In `src/modules/groups/components/GroupSettingsPanel.tsx`, replace the static color dot with a `<Popover>` that uses the color dot as `<PopoverTrigger>`
- [x] 4.2 Add a 4x4 swatch grid inside `<PopoverContent>` rendering each `GROUP_COLORS` entry as a clickable `<button>` with `style={{ background: c }}` and a ring highlight when selected
- [x] 4.3 Add a native `<input type="color">` below the swatch grid for custom hex colors, with a `onChange` that calls `setGroupColor`
- [x] 4.4 Wire `onSetColor={setGroupColor}` prop through to `GroupItem` and handle popover state

## 5. Tests

- [x] 5.1 Add tests in `src/modules/groups/components/GroupSettingsPanel.test.tsx` for: clicking color dot opens popover, clicking a swatch updates color and closes popover, native color input triggers color change
- [x] 5.2 Add tests for `setGroupColor` store action in group store tests (if a separate store test file exists, otherwise in the component test)

## 6. Verify

- [x] 6.1 Run `npm run typecheck`
- [x] 6.2 Run `npm run lint`
- [x] 6.3 Run `npm run format`
- [x] 6.4 Run `npm run test`
