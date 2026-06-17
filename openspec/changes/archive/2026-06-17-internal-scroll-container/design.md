# Design: Internal Scroll Container

## Layout Structure (After)

```
.app-shell (h-dvh, flex flex-col, overflow-hidden)
├── <header>                    ← static flex child, no sticky
├── <div flex flex-1 min-h-0>   ← min-h-0 lets children shrink below content height
│   ├── <aside>                 ← sidebar, shrink-0
│   └── <main flex-1 overflow-y-auto scrollbar-gutter-stable>  ← THE scroll container
│       └── <div container max-w-[680px]>
│           └── task-list-area + views
└── <TimerBar />                ← static flex child, no sticky
```

## Key CSS Changes

### `App.tsx` shell div (line 79)

| Before         | After                   |
| -------------- | ----------------------- |
| `min-h-screen` | `h-dvh overflow-hidden` |

- `h-dvh` pins shell to dynamic viewport height (handles mobile address bar).
- `overflow-hidden` prevents the shell itself from scrolling.

### `App.tsx` header (line 80)

| Before              | After     |
| ------------------- | --------- |
| `sticky top-0 z-30` | (removed) |

Header is first flex child; stays at top naturally. No z-index needed since nothing overlaps it in the scroll container.

### `App.tsx` content row (line 152)

| Before        | After                 |
| ------------- | --------------------- |
| `flex flex-1` | `flex flex-1 min-h-0` |

`min-h-0` is **critical**. Without it, a flex child defaults to `min-height: auto`, which means `<main>` will grow to fit its content instead of adopting `overflow: auto` behavior. The row would overflow the shell, pushing TimerBar off screen.

### `App.tsx` main (line 157)

| Before   | After                                            |
| -------- | ------------------------------------------------ |
| `flex-1` | `flex-1 overflow-y-auto scrollbar-gutter-stable` |

`overflow-y-auto` creates the internal scroll. `scrollbar-gutter-stable` reserves scrollbar space even when content is short, preventing horizontal layout shifts on view switch.

### `TimerBar.tsx` outer div (line 209)

| Before                 | After     |
| ---------------------- | --------- |
| `sticky bottom-0 z-20` | (removed) |

TimerBar is last flex child; stays at bottom naturally.

## `scrollbar-gutter: stable` in Tailwind v4

Tailwind CSS v4.3 ships `scrollbar-gutter` as a core utility. The class `scrollbar-gutter-stable` maps to `scrollbar-gutter: stable`. No custom CSS needed.

## Portal Components

The `<Sheet>` (mobile sidebar) and `<SettingsDrawer>` already use Base UI's `Portal`, which renders to `document.body`. `overflow: hidden` on `.app-shell` does not affect them.

## View Animations

Views use `AnimatePresence` with `layout` animations from `motion`. The scroll container `overflow-y: auto` clips content to its bounds. Enter animations (translate from outside → in) will be clipped during the transition — invisible during the animation, which is acceptable. Exit animations (translate out → outside) may also clip. This should be visually tested.

Alternative considered: using `overflow-y: clip` instead of `auto` during animations, then switching to `auto`. Rejected as over-engineering — the visual difference is negligible for content that animates in from outside the viewport anyway.
