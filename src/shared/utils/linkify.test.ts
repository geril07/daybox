import { describe, expect, it } from 'vitest'

import { tokenize, type Token } from './linkify'

describe('tokenize', () => {
  it('happy path — single URL with surrounding text', () => {
    const result = tokenize('see https://example.com for details')
    expect(result).toEqual<Token[]>([
      { type: 'text', value: 'see ' },
      {
        type: 'link',
        href: 'https://example.com/',
        display: 'https://example.com',
      },
      { type: 'text', value: ' for details' },
    ])
  })

  it('no URL — returns single text token', () => {
    const result = tokenize('Write quarterly report')
    expect(result).toEqual<Token[]>([
      { type: 'text', value: 'Write quarterly report' },
    ])
  })

  it('javascript: scheme is demoted to text', () => {
    const result = tokenize('click javascript:alert(1) now')
    expect(result).toEqual<Token[]>([
      { type: 'text', value: 'click javascript:alert(1) now' },
    ])
  })

  it('data: scheme is demoted to text', () => {
    const result = tokenize('download data:text/html,<script>...</script>')
    expect(result).toEqual<Token[]>([
      {
        type: 'text',
        value: 'download data:text/html,<script>...</script>',
      },
    ])
  })

  it('trailing . is excluded from the link', () => {
    const result = tokenize('See https://example.com.')
    expect(result).toEqual<Token[]>([
      { type: 'text', value: 'See ' },
      {
        type: 'link',
        href: 'https://example.com/',
        display: 'https://example.com',
      },
      { type: 'text', value: '.' },
    ])
  })

  it('balanced parens inside URL are retained', () => {
    const result = tokenize('(see https://en.wikipedia.org/wiki/Foo_(bar))')
    expect(result).toEqual<Token[]>([
      { type: 'text', value: '(see ' },
      {
        type: 'link',
        href: 'https://en.wikipedia.org/wiki/Foo_(bar)',
        display: 'https://en.wikipedia.org/wiki/Foo_(bar)',
      },
      { type: 'text', value: ')' },
    ])
  })

  it('unbalanced trailing ) is excluded', () => {
    const result = tokenize('see https://en.wikipedia.org/wiki/Foo_(bar))')
    expect(result).toEqual<Token[]>([
      { type: 'text', value: 'see ' },
      {
        type: 'link',
        href: 'https://en.wikipedia.org/wiki/Foo_(bar)',
        display: 'https://en.wikipedia.org/wiki/Foo_(bar)',
      },
      { type: 'text', value: ')' },
    ])
  })

  it('IDN host — parse succeeds with non-empty href starting with https://', () => {
    const result = tokenize('check https://例え.jp/path')
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual<Token>({ type: 'text', value: 'check ' })
    expect(result[1].type).toBe('link')
    if (result[1].type === 'link') {
      expect(result[1].href).toMatch(/^https:\/\//)
      expect(result[1].href.length).toBeGreaterThan(0)
      expect(result[1].display).toBe('https://例え.jp/path')
    }
  })

  it('multiple URLs in one title', () => {
    const result = tokenize('a https://one.com b https://two.com c')
    expect(result).toEqual<Token[]>([
      { type: 'text', value: 'a ' },
      {
        type: 'link',
        href: 'https://one.com/',
        display: 'https://one.com',
      },
      { type: 'text', value: ' b ' },
      {
        type: 'link',
        href: 'https://two.com/',
        display: 'https://two.com',
      },
      { type: 'text', value: ' c' },
    ])
  })

  it('empty input returns empty array', () => {
    expect(tokenize('')).toEqual([])
  })
})
