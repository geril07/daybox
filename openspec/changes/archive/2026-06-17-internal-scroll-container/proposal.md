# Proposal: Internal Scroll Container

## Why

The app currently relies on **document-level scroll** (`<body>` / `<html>` scrolls naturally). The header and TimerBar use `position: sticky` to pin to viewport edges. This causes problems:

1. **Scrollbar layout shift** — switching between views with different content lengths (e.g. Today with 2 tasks → Later with 50 tasks) makes the viewport scrollbar appear/disappear, shifting the entire layout horizontally.
2. **Visual jank** — sticky elements can glitch on some browsers/devices during rapid scrolling.
3. **No `scrollbar-gutter`** — without a stable scrollbar gutter, any content under 100vh causes the layout to shift.

## What

Replace document-level scroll with an **internal scroll container**: only the main content area (`<main>`) scrolls. The header and TimerBar become static flex children — always visible, no sticky hacks.

```
     BEFORE                          AFTER
┌──────────────────────┐     ┌──────────────────────┐
│ Header (sticky)      │     │ Header (fixed)       │
├──────────────────────┤     ├──────────────────────┤
│ Content              │     │ ┌──────────────────┐ │
│ (scrolls w/ document)│     │ │ scrollable       │ │
│                      │ ←   │ │ content area     │ │ ← scrollbar
│                      │     │ │ (own scrollbar)  │ │   lives here
│                      │     │ │                  │ │
│                      │     │ │ stable gutter    │ │
│                      │     │ └──────────────────┘ │
├──────────────────────┤     ├──────────────────────┤
│ TimerBar (sticky)    │     │ TimerBar (fixed)      │
└──────────────────────┘     └──────────────────────┘
```

## Scope

- **Affected files**: `src/app/App.tsx` (shell layout), `src/index.css` (scrollbar-gutter utility), `src/modules/timer/components/TimerBar.tsx` (remove sticky)
- **Not affected**: sidebar sheet (already uses Portal, renders outside app shell), settings drawer, view components, task animations

## Risks

- **Flexbox `min-h-0` gotcha**: the flex row wrapping sidebar+main needs `min-h-0` to allow the scrollable `<main>` to shrink below its content height. Without it, content pushes the TimerBar off screen.
- **Mobile address bar**: using `h-dvh` (dynamic viewport height) instead of `h-screen` accounts for mobile browser chrome that hides/shows during scroll.
- **Animation clipping**: `AnimatePresence` exit animations (elements translating/moving out) may clip at the `overflow: auto` boundary of the scroll container. Needs verification.
