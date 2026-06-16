# RND — Desktop widgets for DayBox

> **Status: exploration, no direction chosen.**
> This doc maps the space and ends with a recommended exploration order.
> Promote one of the directions below into a real `proposal.md` + delta specs
> when you are ready to commit. Until then, this is research, not a change.

## 1. Context

DayBox is a local-first React SPA. The hard facts that bound this work:

- **State lives in the browser.** `useTimerStore`, `useTaskStore`,
  `useGroupStore`, `usePlannerStore` — each is a zustand store wrapped in
  `persist`, writing to its own `localStorage` key
  (`daybox-timer`, `daybox-tasks`, `daybox-groups`, `daybox-planner`).
- **No service worker, no PWA manifest, no native wrapper** in
  `package.json`. `public/` only has favicons and logo variants.
- **An export pipeline already exists.** `src/modules/data-portability/`
  knows how to serialise a versioned snapshot of all four stores via
  `buildSnapshot()` and a zod-validated `SaveEnvelope` schema
  (`envelopeVersion: 1`). The same shape is what `import.ts` consumes.
- **Module boundaries are strict** (`openspec/specs/architecture/spec.md`).
  A new feature lands as a new folder under `src/modules/<domain>/` with
  `store.ts`, `schema.ts`, `types.ts`, `components/`, `index.ts` — and any
  cross-cutting concern goes through `src/shared/` or `src/app/`.

The user-facing question is "can I see DayBox on my actual desktop, not
inside a tab". The architecture-level question is **"where does state
live, and how does a non-browser surface read or write a slice of it"**.

## 2. The data-flow problem

Today the only writer/reader of the four stores is the same React tab.
A "desktop widget" introduces a _second reader_ (and probably a _second
writer_) outside that tab. That is the entire problem.

```
        ┌────────────── one tab ──────────────┐
        │  React component                    │
        │      │                              │
        │      ▼                              │
        │  zustand store (module singleton)   │
        │      │                              │
        │      ▼                              │
        │  persist middleware                 │
        │      │                              │
        │      ▼                              │
        │  localStorage (debounced for timer) │
        └─────────────────────────────────────┘
```

Cross-tab and cross-surface sync is the missing piece. There are three
mechanisms the browser gives us:

| Mechanism                        | Granularity | Cross-tab | Cross-process | Use it for                                      |
| -------------------------------- | ----------- | --------- | ------------- | ----------------------------------------------- |
| `localStorage` + `storage` event | per write   | yes       | no            | backstop for state, slow but durable            |
| `BroadcastChannel`               | per message | yes       | no            | real-time sync of mutations inside the browser  |
| Tauri/Electron IPC / shared file | per command | n/a       | yes           | bridging JS and native code outside the browser |

Every direction below picks a row from this table and lives with its limits.

## 3. What could a DayBox widget look like?

Before picking a transport, name the things the widget might show. The
"protagonist" framing in `add-timer-focus-mode/proposal.md` makes the
timer the obvious candidate, but the task list and session dots are also
glanceable. Reasonable widget surfaces, smallest to largest:

1. **Timer chip** — `MM:SS` + phase dot, ~80×80px. The "is my focus
   interval going" glance.
2. **Timer + current task** — timer chip + the focused task title
   underneath, ~160×100px.
3. **Timer + next task** — adds one line of "up next" for the moment
   the current pomo ends.
4. **Session dots only** — four dots, current one filled. The "where
   in the cycle am I" glance.
5. **Today list** — mini list of today's tasks with completion checks.
   Largest, least "widget-shaped".

The smallest two fit real OS widget boards (macOS / Windows 11 / Plasma
constraints). The larger ones are more naturally a "floating window" or
"sidebar" surface. **Direction choice and widget size are coupled** —
small surfaces force you to keep the data flow narrow.

## 4. Directions

Six directions, ordered roughly from "cheapest to try" to "most
platform-specific".

### A. In-browser widget surfaces (no native wrap)

Reuse the existing React app, in another surface, in another browser
window. No new build pipeline, no new language. Three variants:

- **Document Picture-in-Picture** (Chrome 116+): put any HTML into a
  floating, always-on-top window. A `widget.html` entry that imports
  `useTimerStore` and renders a `<MiniTimer />` would "just work".
- **Browser Side Panel / Sidebar**: Firefox Sidebar API, Chrome Side
  Panel. The widget lives in a docked panel next to every tab.
- **New-tab override** (extension or service worker): a tiny
  `widget.html` becomes every new tab. Distribution via Web Store or
  self-host.

**Data flow:** same `localStorage` + a `BroadcastChannel('daybox-sync')`
so mutations in the main tab reach the widget window in real time.
The debounced timer store is fine for this — 1s granularity is
indistinguishable from real-time for a timer.

**Pros:** zero new tools, ~1 day of work, all in your existing stack.
**Cons:** still a webview. Closes with the browser. Not "the desktop"
in the OS sense. Chrome-only for DPIP and Side Panel.

**Verdict:** the cheapest way to validate the _widget UI_ and the
_data flow_ before committing to platform work. Good for power users,
not a marketing story.

### B. Tauri wrapper

Ship DayBox inside a Tauri 2 shell. Tauri is Rust-based, ~5–10 MB
binaries, a real desktop process. Three things this unlocks:

- **System tray icon** with a menu (toggle, skip, quit). Cross-platform,
  small effort, big "feels like a real app" payoff.
- **Always-on-top floating window** as a widget, using Tauri webviews
  with `alwaysOnTop: true` and `decorations: false`. Same React, same
  stores, just another window. This is the "Pomodoro stays visible
  while I work" surface.
- **macOS menu-bar app** (`LSUIElement` style) using
  `tauri-plugin-positioner`. The timer ticks in the menubar.
- **Windows 11 Widgets Board** — possible via the Microsoft Widget
  Provider API. Limited, real, but the user has to be on Windows 11
  with the new board. Not a primary target.

**Data flow, pick one:**

1. **Keep `localStorage` as-is.** Tauri webviews share a webview
   process per app, and `localStorage` is per-origin per-profile, so
   both windows read the same store. `BroadcastChannel` works
   inside a Tauri app. This is the lowest-friction path — your
   existing `persist` config, debounced timer, and storage-event
   backstop all just work.
2. **Migrate to `tauri-plugin-sql` (SQLite) or a JSON file via
   `tauri-plugin-fs`.** Necessary if you ever want _background_ state
   (timer ticking when all webviews are closed). Also unlocks a
   "headless" widget process that has no webview, just native.

For a v1, option 1 is enough. Option 2 is a v2.

**Pros:** real desktop presence, system tray, menubar, always-on-top
— all easy. Small bundle, fast cold start, modern stack.
**Cons:** Rust toolchain, OS-specific polish (menubar positioner,
tray icon design per platform), `tauri build` per OS, code-signing
for distribution.

**Verdict:** the right answer for "real" desktop integration. Tauri 2
is mature in 2026. This is the direction to commit to if you want
something you'd actually call "the DayBox desktop app".

### C. Electron wrapper

Same idea as Tauri, different runtime.

**Pros:** the most mature ecosystem. `electron-builder` for installers,
auto-update, `electron-store`, Squirrel. Easier path to a shipped,
auto-updating app. More Node libraries available.
**Cons:** ~50–150 MB binaries, higher RAM, slower cold start, less
"native feel" without care. macOS / Windows / Linux all work but
menubar apps and trays are more boilerplate.

**Verdict:** pick this if a Tauri limitation blocks you (e.g. you need
a Node-only package, or you want a specific Electron-only API). For
DayBox, Tauri is the better default — nothing in your current stack
needs Node beyond Vite's build, and the timer is the only always-on
surface, so bundle size matters.

### D. Native widget companion (Swift / WinAppSDK / GTK)

Build a small native widget _per OS_. DayBox stays a pure browser app
and writes a tiny `widget.json` file. The native widget reads it.

```
React ──useTimerStore──persist──localStorage
                          +
                          └─ writeWidgetPayload()  ──>  ~/Library/Application Support/DayBox/widget.json
                                                              ▲
                                                              │ FSEvents / INotify / ReadDirectoryChangesW
                                                              │
                                                       Native widget (Swift/Win/GTK)
```

**DayBox side:** new module `src/modules/widget-payload/` with one
job — write a _small, derived_ slice (timer state + focused task +
next task) to a known path, debounced, and on relevant mutations.
Reuses the existing export envelope, but writes to disk instead of
to a download.

**Widget side, per platform:**

- **macOS:** WidgetKit + AppIntents (macOS 11+). Modern, supported, the
  "Apple Reminders" model. Read the JSON in the timeline provider.
- **Windows 11:** WinAppSDK Widgets provider. Real, but the API is
  narrower and the visual constraints are tighter. Web content
  widgets are Adaptive Cards, not arbitrary HTML.
- **Linux:** Plasma plasmoids (QML) or GNOME extensions. No HTML
  widget story. Falls back to "it's a small webview in a window".

**Pros:** the most "real" widget board presence. DayBox stays pure
browser, no Tauri/Electron. Cleanest separation of concerns.
**Cons:** three native codebases, each with its own build, signing,
and App Store / Widget Board review. Slow widget UI iteration
because each change ships a binary.

**Verdict:** the right v2 if there is real user demand for native
widget boards. Almost certainly overkill for v1.

### E. OS-level web widget host

Some OSes accept a URL as a widget:

- **Windows 11 Widgets Board:** Adaptive Cards (templated JSON), not
  arbitrary HTML. Wrong shape.
- **macOS:** no first-class "URL widget". Third-party tools like Plash
  pin a URL as a wallpaper, but that is a hack.
- **Plasma / GNOME:** QML / JS extensions, not HTML.

**Verdict:** not a direction. There is no cross-platform "publish a
URL, get a real OS widget". Out.

### F. Browser extension

Chrome / Edge / Firefox extension. Two variants:

- **Popup:** click the extension icon, see a small timer/task panel.
- **New-tab override:** the extension replaces every new tab with a
  DayBox widget page. Most aggressive "always visible" surface.

**Data flow:** the extension popup / new-tab page can read
`localStorage` directly because it runs at the same origin as the
app. No separate store needed. For users on multiple devices, the
extension reads whatever the DayBox tab last wrote.

**Pros:** works in any Chromium / Firefox. Distribution via Web Store
or self-host as `.crx` / `.xpi`. No native wrap.
**Cons:** Web Store review for hosted distribution, only browsers
that support extensions, "pin to shelf" UX varies, not "the
desktop" in the OS sense.

**Verdict:** a solid complementary direction, especially the
new-tab override. Pair it with **A** (in-browser) — same React, same
store, same `BroadcastChannel`. Skip the Web Store at first, self-host.

## 5. Comparison matrix

| Direction                  | Real desktop?            | Effort (rel.) | Cross-platform     | Bidirectional?                     | Bundle size    | Best widget size   |
| -------------------------- | ------------------------ | ------------- | ------------------ | ---------------------------------- | -------------- | ------------------ |
| A. In-browser surfaces     | no                       | very low      | mostly Chromium    | yes (same store)                   | 0              | chip + next task   |
| B. Tauri                   | yes (tray, menubar, AoT) | medium        | all three          | yes (same store or Tauri commands) | ~5–10 MB       | chip + task + tray |
| C. Electron                | yes                      | medium        | all three          | yes                                | ~50–150 MB     | chip + task + tray |
| D. Native widget companion | yes (widget board)       | high          | per-OS codebases   | one-way (read) until you add IPC   | per-OS binary  | tiny chip only     |
| E. OS web widget host      | partial                  | n/a           | mostly no          | n/a                                | n/a            | n/a                |
| F. Browser extension       | no                       | low           | Chromium + Firefox | yes (same store)                   | extension size | chip + next task   |

"Bidirectional?" means: can the widget _act_ (start/pause/skip) and
have the change appear in the main app? For A/B/C/F the answer is
yes for free. For D it is a separate IPC problem.

## 6. Recommended exploration order

If the goal is "max user value for minimum commitment, with a clear
path to more if it works":

### Step 1 — Validate widget UI + data flow (Direction A)

- Add a `widget.html` Vite entry next to `index.html`. It imports
  the timer and tasks modules and renders a `<MiniTimer />` /
  `<MiniCurrentTask />` pair.
- Add a `BroadcastChannel('daybox-sync')` in `src/shared/sync/` that
  fires on every `useTimerStore` and `useTaskStore` mutation, and
  re-validates the receiving store against its zod schema on
  message receipt (reuse `createValidatedRehydrate`'s validator).
- Ship Document Picture-in-Picture first (Chrome-only is fine for a
  power-user beta) and a "pop out widget" button in `TimerBar`.
- This costs roughly one new shared module + one new component, no
  new tooling. Validate: does the timer tick in sync across the two
  surfaces? Does pause/spacebar in the main tab reflect in the
  widget within a frame?

### Step 2 — Real desktop presence (Direction B)

- Wrap DayBox in Tauri 2. Keep `localStorage` (no schema migration).
  Add a system tray icon with a "show/hide main window" and
  "pause/resume timer" menu. Add an "open floating widget" menu
  item that opens a second Tauri webview window with
  `alwaysOnTop: true`, `decorations: false`, and a small fixed
  size, pointing at the same `widget.html` from Step 1.
- This is "the desktop app". Distribution is your call: Mac App
  Store, Windows Store, or `tauri build` artefacts on a download
  page. Code-signing is the only mandatory part you do not have
  today.

### Step 3 (only if needed) — Native widget boards (Direction D)

- Add `src/modules/widget-payload/` to the DayBox side, which writes
  a 1–2 KB JSON to a known path on relevant mutations. This is a
  pure addition, no breaking changes.
- Build a separate repo per platform with the actual widget. Ship
  one at a time, starting with macOS (best widget story).
- Re-evaluate at the end of Step 2: if tray + menubar + floating
  window cover 95% of "I want it on my desktop", you may never need
  Step 3.

## 7. Open questions for the user

These are not blockers for picking a direction, but they will sharpen
the proposal once you do.

1. **Platform priority.** macOS, Windows, Linux? (macOS has the
   best widget board story; Windows 11 widgets are real but limited;
   Linux has no HTML widget story.)
2. **Widget content.** Of the five surfaces in §3, which is the
   _primary_ one? (Affects minimum data flow, affects direction
   choice — D is for tiny chips, A/B are for anything.)
3. **"Desktop" — OS desktop or browser-new-tab?** The phrase has two
   common meanings. If "I want a Pomodoro chip on the OS desktop
   always", B is the right answer. If "I want it in every new tab",
   F is enough. If "I want the macOS widget board", D.
4. **Distribution.** Mac App Store / Windows Store / sideload /
   self-host `.dmg` + `.msi`? Affects Tauri config and signing
   story.
5. **Background tick.** Do you need the timer to keep ticking when
   the main window is closed? (If yes, the localStorage path in
   Direction B is not enough — you need either a background
   webview in the tray, or a Rust-side tick + state.)

## 9. Narrow case: noctalia-shell on Wayland

> This is the _current_ focus, added after the broad exploration
> above. Everything in this section is a strict subset of the
> directions in §4 — kept here so you do not have to wade through the
> general case to find the answer for noctalia.

### Scope

- **Target:** noctalia-shell, a Quickshell/QML Wayland shell on Linux.
- **Widget:** written by the user in QML. Not the problem.
- **Data:** the timer store only. Nothing else from DayBox.
- **Direction:** one-way. DayBox → noctalia. (Two-way is an open
  question, see §7-9 below.)

### The data-flow problem, restated

```
   DayBox (browser tab)        gap          noctalia widget (QML)
   ─────────────────────    ──────────    ───────────────────────
   useTimerStore                          XmlHttpRequest / QFile
        │                                       ▲
        ▼                                       │ read
   localStorage['daybox-timer']                 │
   (debounced, 1s)                       timer.json on disk
        │             ───────►  ???  ──────►        or
   debounce flush                                HTTP localhost:PORT
                                                 or
                                                 D-Bus signal
```

The gap is the only hard part. The browser tab cannot, on its own,
expose data to another process — no local port, no D-Bus, no known
file path. There are exactly two ways to close the gap:

1. **Add a native host process** that reads the browser's state and
   re-publishes it on a transport noctalia understands.
2. **Add a native runtime around the React app itself** (Tauri /
   Electron) so the React app is no longer a plain browser tab.

Option 1 still requires a native host, so it does not actually avoid
the install footprint. Option 2 is the same work for less indirection
— pick option 2.

### Three realistic options, all of them Tauri

Once DayBox runs inside a Tauri shell, the React app continues to
work exactly as today. Tauri just adds a Rust side that can reach the
outside world. Three flavours of bridge, all otherwise identical:

| Bridge            | noctalia side reads                                         | Tauri writes                                                                   | Pros                                                         | Cons                                                          |
| ----------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------- |
| **JSON file**     | `XMLHttpRequest` to `file:///home/.../timer.json`, or QFile | `std::fs::write` on debounce flush                                             | Trivial to debug (`cat` it). Lowest QML ceremony. No port.   | Polling-based, or needs `QFileSystemWatcher`. No push.        |
| **HTTP loopback** | `XMLHttpRequest` to `http://127.0.0.1:9927/timer`           | `tauri::async_runtime::spawn` an `actix-web` (or `axum`) server with one route | Standard, real-time, debuggable with `curl`. Easy to extend. | Port to pick. Binds a port — minor firewall/firejail concern. |
| **D-Bus signal**  | QtDBus / Quickshell DBus bindings                           | `zbus` emits a signal on debounce flush                                        | Most "Wayland-native". Push, not poll. No port.              | Slightly more setup on QML side. Wire-protocol versioning.    |

Pick one, not all three. The minimum useful payload is the same in
all three cases — it is the transport that changes.

### The minimum payload

`src/modules/widget-payload/widget-payload.ts` derives a ~250-byte
JSON from the timer store. Derive, do not store — the widget is
read-only consumer of state the React app already owns.

```json
{
  "schemaVersion": 1,
  "phase": "focus" | "shortBreak" | "longBreak",
  "isRunning": true,
  "elapsedMs": 1234567,
  "phaseDurationMs": 1500000,
  "focusedTaskTitle": "Write Q1 plan" | null,
  "sessionPomoCount": 2,
  "longBreakInterval": 4,
  "sessionLabel": "2 of 4 · long next",
  "updatedAt": 1737012345678
}
```

The current `useTimerStore` already exposes everything except
`focusedTaskTitle` and `sessionLabel` — those are derived by joining
on `useTaskStore.getState().tasks[focusedTaskId]?.title` and by
formatting with the existing `sessionLabel` helper from the
`pomodoro-timer` spec. The writer is one function:

```ts
function buildWidgetPayload(): WidgetPayload {
  const t = useTimerStore.getState()
  const task = t.focusedTaskId
    ? useTaskStore.getState().tasks[t.focusedTaskId]
    : null
  const phaseDurationMs = phaseDuration(t.phase, t.settings)
  return {
    schemaVersion: 1,
    phase: t.phase,
    isRunning: t.isRunning,
    elapsedMs: t.elapsed,
    phaseDurationMs,
    focusedTaskTitle: task?.title ?? null,
    sessionPomoCount: t.sessionPomoCount,
    longBreakInterval: t.settings.longBreakInterval,
    sessionLabel: formatSessionLabel(
      t.sessionPomoCount,
      t.settings.longBreakInterval,
      t.phase,
    ),
    updatedAt: Date.now(),
  }
}
```

### When does the writer fire?

It piggybacks on the existing debounce. The timer's `persist`
middleware already coalesces writes to a 1-second cadence and flushes
on `beforeunload` and `visibilitychange → hidden`. A second
subscriber on the same store — registered with `useTimerStore.subscribe`
— fires `buildWidgetPayload()` and hands the result to Tauri's Rust
side via an `invoke` call. The Rust side does the actual
`fs::write` / HTTP response / D-Bus emit.

This means:

- The widget sees the timer with at most **1 s of latency** (the
  debounce delay). Indistinguishable from real-time.
- The widget sees the timer **even when the main window is hidden**,
  as long as the Tauri process is still running. (See the "tray or
  no tray" question below.)
- The writer is a no-op until Tauri's `invoke` channel is wired up,
  so it is harmless to develop in the browser with the existing
  Vite dev server.

### "Tauri wrap" really means: pick a windowing model

Tauri gives you a Rust process that owns one or more webview windows.
For the noctalia case, you do not actually need to _show_ a webview
window — you can run the React app in a hidden webview whose only job
is to keep the timer ticking, and the _visible_ surface is noctalia.
Concretely:

- **Tray variant (recommended for "always on"):** Tauri runs with no
  visible main window. The React app boots inside a hidden webview
  on startup. The timer's 1 Hz tick keeps running. The widget is
  always live. The user can click the tray icon to _show_ the
  DayBox UI in a window (so they can edit tasks, hit play/pause,
  etc.) — the window closes back to tray.
- **On-demand variant:** Tauri only spawns the React app when the
  user opens the tray menu's "Open DayBox" item. The widget is
  _stale_ (or empty) when the window is closed. Cheaper, worse UX.
- **Always-visible variant:** Tauri opens the React app in a normal
  window. Same as the on-demand variant but the window stays open.
  No benefit over running DayBox in a regular browser tab — you
  have taken on the Tauri dependency for nothing.

The tray variant is the one that justifies the Tauri dependency.

### Recommendation

If you commit to this:

1. **Tauri 2 wrap, tray variant.** No visible window by default.
   React app runs in a hidden webview. The widget on noctalia's side
   is always live.
2. **JSON file bridge for v1.** `~/.local/share/daybox/timer.json`
   (XDG-aware), updated on the existing debounce. QML reads with
   `XMLHttpRequest` to the `file://` URL, refreshed on
   `QFileSystemWatcher` change events. Why file over HTTP or D-Bus
   for v1: no port to manage, no D-Bus to register, easiest to
   `cat` while debugging. v2 can swap in D-Bus if you want push.
3. **`src/modules/widget-payload/`** owns the payload shape, the
   `subscribe` wiring, and the Tauri `invoke` call. Module follows
   the architecture spec — barrel re-exports the writer, schema in
   `schema.ts`, types in `types.ts`. No foreign-feature internals
   reached across.
4. **New spec: `widget-payload`.** Covers "Timer state is exposed
   to external consumers" with one requirement + a few scenarios
   for the payload shape, freshness, and the subscription
   lifecycle.
5. **No new task-management changes.** The widget reads a denormalised
   title, not a full task list. Adding a "next task" widget later
   would need a different shape, but is out of scope here.

### What the noctalia QML widget looks like (consumer side sketch)

A pointer, not part of the DayBox code. Just to make sure the data
flow is concrete end-to-end:

```qml
// noctalia/.../DayBoxWidget.qml  (not in this repo)
import QtQuick
import Qt.labs.platform as Labs

Item {
    property var state: ({})

    Timer {
        interval: 1000
        repeat: true
        running: true
        onTriggered: refresh()
    }

    function refresh() {
        const xhr = new XMLHttpRequest()
        xhr.open("GET", "file:///home/<user>/.local/share/daybox/timer.json")
        xhr.onreadystatechange = () => {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                try { state = JSON.parse(xhr.responseText) } catch (_) {}
            }
        }
        xhr.send()
    }
    // ...render MM:SS, phase, task title, session dots from `state`
}
```

(Replace the file:// path with the XDG-correct one on the actual
machine; QML's `StandardPaths` is the usual way.)

### Open questions specific to noctalia

6. **Tray or no tray?** (See "pick a windowing model" above.)
   No-tray = on-demand only = widget is stale when DayBox is closed.
   Tray = always live. The whole point of the widget is "always
   live", so default to tray.
7. **Display-only, or interactive?** v1 should be display-only. If
   you want click-to-pause on the widget, that needs a second
   bridge direction (noctalia → DayBox). Easiest path: same Tauri
   Rust side, add an HTTP `POST /timer/toggle` (or a D-Bus method
   for v2), and have QML call it.
8. **Distribution.** Tauri build artefacts on a GitHub release, or
   a package (`.deb` / AUR / Flatpak)? For a single-user dev tool
   on your own machine, `cargo tauri build` output installed by hand
   is fine. If you ever share, code-signing becomes mandatory on
   macOS / Windows; on Linux you can ship unsigned `.deb`s.

## 8. Out of scope here

- The actual _design_ of any widget surface. That is a separate
  design exercise once a direction is picked.
- Code signing, notarisation, auto-update infrastructure. All real
  concerns, all separate changes.
- Migrating the timer store to Tauri-managed storage. Step 2 option
  1 keeps `localStorage`; option 2 is a v2 follow-up.
- Cross-device widget sync (e.g. DayBox on Mac, widget on iPad).
  Out of scope for any direction above.

---

> **Cross-reference:** the noctalia-specific narrowing of this
> exploration lives in [§9](#9-narrow-case-noctalia-shell-on-wayland).
> That section supersedes §3–§6 for the current need — they remain
> here as background if the scope later widens to other shells or
> platforms.
