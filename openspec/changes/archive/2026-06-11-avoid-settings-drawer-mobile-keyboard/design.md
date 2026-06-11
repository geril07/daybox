## Context

`SettingsDrawer` renders a Base UI-backed `Sheet` with timer settings at the top of the drawer. The timer settings panel begins with `NumberInput` controls, so Base UI's default dialog focus behavior can land on the first numeric input when the drawer opens. On mobile browsers, focusing that input opens the virtual keyboard even though the user has only opened settings.

Base UI's `Dialog.Popup` supports `initialFocus`, including a ref target. The project uses React 19, where `ref` can be passed as a prop to function components. `SheetContent` already forwards ordinary props to `SheetPrimitive.Popup`, so the intended implementation is local to `SettingsDrawer`.

## Goals / Non-Goals

**Goals:**

- Keep initial focus inside the Settings drawer when it opens.
- Prevent opening the Settings drawer from automatically focusing a text-editing or numeric input.
- Keep the mobile virtual keyboard closed until the user explicitly taps or tabs into an editable input.
- Implement the behavior with a local `SettingsDrawer.tsx` change only.

**Non-Goals:**

- Do not change `src/shared/ui/sheet.tsx`.
- Do not change the order, layout, or contents of the settings sections.
- Do not alter timer setting controls, validation, persistence, or data shape.
- Do not disable Base UI dialog focus management globally.

## Decisions

### Focus the drawer surface on open

Use a `useRef<HTMLDivElement | null>(null)` in `SettingsDrawer` and pass that ref to `SheetContent` both as `ref` and as `initialFocus`. Add `tabIndex={-1}` so the drawer surface is programmatically focusable without entering the normal tab order.

This keeps focus inside the dialog boundary while avoiding activation of the first `NumberInput`.

Alternatives considered:

- Focus the close button: accessible and keyboard-safe, but opening settings would initially land on a dismiss action rather than the settings surface.
- Focus the title: semantically meaningful, but it requires making a heading focusable and is less direct than focusing the dialog popup itself.
- Disable initial focus: avoids the keyboard, but weakens the dialog accessibility model by allowing focus to remain behind the overlay.
- Reorder sections: could avoid the first numeric input accidentally, but it couples focus behavior to content order and does not address future editable controls.

### Rely on React 19 ref-as-prop behavior

Do not convert `SheetContent` to `forwardRef` or otherwise change the shared UI wrapper. The implementation assumes React 19 allows `ref` to flow through `SheetContent` as a prop and that the existing `...props` spread passes it to `SheetPrimitive.Popup`.

If typecheck rejects this assumption, implementation should stop and report that the proposed no-`sheet.tsx` path is not type-safe, rather than broadening the change without a proposal update.

## Risks / Trade-offs

- Browser shows a focus outline around the drawer surface -> Accept if consistent with existing focus styles; only adjust locally if it creates a visible regression and can be done without shared wrapper changes.
- React 19 runtime supports ref-as-prop but local TypeScript types reject the call site -> Stop and report the blocker; do not silently modify `sheet.tsx`.
- Screen reader announcement may differ from focusing the first control -> The drawer remains named by its `SheetTitle`, and focus stays within the dialog popup.
