## 1. Implement Focus Target

- [x] 1.1 Add a `useRef<HTMLDivElement | null>(null)` focus target in `src/app/shell/SettingsDrawer.tsx`.
- [x] 1.2 Pass the ref to `SheetContent` as both `ref` and `initialFocus`.
- [x] 1.3 Add `tabIndex={-1}` to `SheetContent` so the drawer surface can receive programmatic focus without entering normal tab order.
- [x] 1.4 Keep the implementation local to `SettingsDrawer.tsx`; do not edit `src/shared/ui/sheet.tsx`.

## 2. Verify Behavior

- [x] 2.1 Run `npm run format`.
- [x] 2.2 Run `npm run typecheck`; if React 19 ref-as-prop is rejected by local types, stop and report the no-`sheet.tsx` path as blocked.
- [x] 2.3 Run `npm run lint`.
- [x] 2.4 Run `npm run test`.
- [x] 2.5 Manually verify on a mobile viewport/device that opening Settings does not open the virtual keyboard.
- [x] 2.6 Manually verify keyboard navigation still moves into drawer controls and remains constrained while the drawer is open.
