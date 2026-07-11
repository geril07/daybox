export type Token =
  | { type: 'text'; value: string }
  | { type: 'link'; href: string; display: string }

// ponytail: regex is liberal on purpose; new URL() is the actual gate.
const URL_RE = /\bhttps?:\/\/[^\s<>"'`]+/gi
const TRAILING_PUNCT = /[.,;:!?]+$/
const DANGEROUS = /^(?:javascript|data|vbscript|file):$/i

export function tokenize(input: string): Token[] {
  if (input === '') return []

  const tokens: Token[] = []
  let last = 0

  for (const m of input.matchAll(URL_RE)) {
    if (m.index === undefined) continue

    // Push any text before this match
    if (m.index > last) {
      tokens.push({ type: 'text', value: input.slice(last, m.index) })
    }

    let raw = m[0].replace(TRAILING_PUNCT, '')

    // Trim unbalanced trailing ')'
    while (
      raw.endsWith(')') &&
      (raw.match(/\)/g)?.length ?? 0) > (raw.match(/\(/g)?.length ?? 0)
    ) {
      raw = raw.slice(0, -1)
    }

    try {
      const url = new URL(raw)
      if (DANGEROUS.test(url.protocol)) {
        tokens.push({ type: 'text', value: m[0] })
        last = m.index + m[0].length
        continue
      }
      tokens.push({ type: 'link', href: url.href, display: raw })
      last = m.index + raw.length
    } catch {
      tokens.push({ type: 'text', value: m[0] })
      last = m.index + m[0].length
    }
  }

  // Push remaining tail
  if (last < input.length) {
    tokens.push({ type: 'text', value: input.slice(last) })
  }

  return tokens
}
