## Context

TaskRow replaces linkified spans with a textarea and currently restores only a collapsed caret.

## Goals / Non-Goals

**Goals:** Preserve the selected characters and direction; retain normal clicks and links.

**Non-Goals:** Rich-text editing, transferring selections spanning multiple rows, changing save behavior.

## Decisions

Read native Selection endpoints before unmounting the display. Convert endpoints to title-relative UTF-16 offsets using DOM ranges, matching the existing caret mapping. Restore textarea selection in a layout effect. Observe mouse release on the document only for gestures started in the title so release outside its bounds also works. Keep the textarea rather than introduce contenteditable.

## Risks / Trade-offs

- Native gesture timing differs by browser → exercise real pointer events and report the browsers tested.
- Mobile long-press behavior is different → no claim of mobile validation.
- Linkified text has nested nodes → map both endpoints relative to the title container.
