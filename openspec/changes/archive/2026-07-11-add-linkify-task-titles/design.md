## Context

Task titles today render as plain text at three sites: `TaskRow.tsx` (planner list and
edit mode), `TaskActionSheet.tsx` (mobile action sheet header), and `TimerBar.tsx`
(focused-task display). All three use plain `{task.title}` interpolation. There is no
existing link-rendering, URL-detection, or sanitization helper in `src/shared/`. The
change is purely presentational — title storage in localStorage is unchanged.

The `shared-ui` capability requires that all components in `src/shared/ui/` are added
via `npx shadcn@latest add`; this rule applies to primitives (Button, Sheet, etc.).
Custom presentational components like the existing `EmptyState.tsx` already coexist in
that folder, so a hand-written `LinkifiedText` is in line with the established pattern.

The `shared-layer` capability allows top-level files under `src/shared/utils/`
(precedent: `cn.ts`, `persistence.ts`, `download.ts`), so `linkify.ts` as a flat file
in that folder is compliant.

## Goals / Non-Goals

**Goals:**

- Render `http://` and `https://` URLs in task titles as clickable external links at
  the three call sites.
- Treat user input safely: tokenize into `ReactNode` (no string-built HTML, no
  `dangerouslySetInnerHTML`); validate candidates with the `new URL()` constructor;
  strip dangerous schemes before they reach `href`.
- Keep the implementation small, dependency-free, and trivially testable.

**Non-Goals:**

- `mailto:`, `tel:`, or protocol-relative `//host` detection.
- IDN punycode display — `new URL().href` already returns the ACE form.
- Link rendering inside `<input>` (edit mode) or other text-entry fields.
- Render-time linkification of the focused-task tooltip string in `TimerBar.tsx:102`
  (`Task: ${focusedTask.title}`) — that is a tooltip label, not a title cell.
- Persisting parsed tokens; linkification is a pure render-time function.

## Decisions

### Tokenize in plain JS, return `ReactNode`; no `dangerouslySetInnerHTML`

The tokenize function returns an array of `{ type: 'text', value }` and
`{ type: 'link', href, display }` tokens. The React mapper (`LinkifiedText`) emits
`<span>{value}</span>` for text and `<a href={href}>{display}</a>` for links. React
escapes text children; the only attack surface is `href`, which is closed by the
`new URL()` strict gate and the dangerous-scheme strip. This pattern is safe by
construction; we never build a string of HTML.

Alternatives considered:

- **`dangerouslySetInnerHTML` with a sanitizer library**: rejected — broader attack
  surface, adds a dependency, and the tokenizer is the only HTML producer.
- **A vetted library** (`linkifyjs`, `react-linkify`): rejected — adds a dependency
  tree, and the 30-line tokenizer below covers the use case.

### Liberal regex, `new URL()` is the strict gate

```ts
// ponytail: regex is liberal on purpose; new URL() is the actual gate.
const URL_RE = /\bhttps?:\/\/[^\s<>"'`]+/gi
const TRAILING_PUNCT = /[.,;:!?]+$/
const DANGEROUS = /^(?:javascript|data|vbscript|file):$/i
```

The regex is intentionally liberal (matches candidates with broad character classes).
The `new URL()` constructor is what decides whether a candidate is actually a URL —
it rejects whitespace, control characters, and malformed input that a string-prefix
check would miss. Candidates that fail the constructor check fall back to plain text
rendering.

A trailing-punctuation strip removes `.`, `,`, `;`, `:`, `!`, `?` from the end of a
match. Unbalanced closing parens are trimmed one at a time until balanced or empty
(e.g., `(see https://en.wikipedia.org/wiki/Foo_(bar))` keeps `(bar)`).

Schemes `javascript:`, `data:`, `vbscript:`, and `file:` are matched against
`url.protocol.toLowerCase()`. They are demoted to plain text and the original match
substring is rendered as-is.

Alternatives considered:

- **Strict regex with full RFC 3986 grammar**: rejected — a 200-line regex that still
  misses edge cases. `new URL()` already covers RFC 3986 in well-tested code shipped
  in every browser.
- **DOM-based parsing (`document.createElement('a')` + assign)**: rejected — it would
  force a DOM dependency, breaking the pure utility's testability in `jsdom`-less
  contexts.

### `target="_blank" rel="noopener noreferrer"`

The 2026 baseline. `noopener` is the security-critical attribute (severs
`window.opener` in the new tab); `noreferrer` strips the `Referer` header (privacy
positive, no downside for a task app). Browsers ≥2021 default `target="_blank"` to
`noopener` semantics, but we set it explicitly for older browsers and embedded
webviews. The shared `src/shared/ui/` does not yet have a CSP header; the dangerous-
scheme strip closes the `javascript:` navigation hole without one.

### `onClick stopPropagation` on the anchor

`TaskRow` is clickable to start inline title editing. Without `stopPropagation`, a
click on a link would bubble up and trigger edit mode. The mapper stops the click at
the anchor.

### Component split: pure utility + thin React wrapper

`src/shared/utils/linkify.ts` exports `tokenize(input: string): Token[]` and the
`Token` type. `src/shared/ui/LinkifiedText.tsx` exports a default-React component that
maps tokens to JSX. This split:

- Lets the tokenizer be tested with plain string assertions (no React rendering).
- Lets the React component be a tiny 12-line file with one test that exercises the
  happy path through React Testing Library.
- Keeps the trust boundary (the tokenizer) decoupled from the rendering concern.

### Tailwind class choice

`text-blue-600 underline break-all hover:text-blue-800 focus-visible:outline-2
focus-visible:outline-offset-1 focus-visible:outline-blue-500` — neutral blue, full
keyboard a11y via `focus-visible`, `break-all` for long-URL wrapping. The existing
theme system uses CSS variables; a future pass can swap the literal blue for a
`text-link` semantic variable if a project-wide link color emerges.

## Risks / Trade-offs

- **Custom shared-ui component is hand-written, not `shadcn add`-derived** — the
  `shared-ui` spec rule on CLI-originated components applies to primitives. Custom
  presentational components like the existing `EmptyState.tsx` are accepted. Mitigation:
  the component is small and dependency-free; no future "shadcn" refactor would add
  value here.
- **Tokenizer is the trust boundary; a future "simplification" of the regex could
  regress safety** — the `javascript:` strip, the `new URL()` gate, and the
  trailing-punct trim are all required. Mitigation: the test file covers one case
  per attack family (happy path, `javascript:` strip, balanced parens); a fourth
  test pinning the `new URL()` strict-gate behavior makes future regressions visible.
- **Links inside a single title share a flat namespace** — there is no support for
  inline `<mark>`, code spans, or other markdown. Mitigation: not in scope; users who
  need rich text can use a description field instead.
- **Long URLs force `break-all`** — this can break in the middle of words in
  surrounding text. Mitigation: `break-all` applies to the anchor only because
  text spans do not receive that class; the surrounding plain text is unaffected.
