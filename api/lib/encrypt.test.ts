import { describe, expect, it } from 'vitest'

import { open, seal } from './encrypt'

const KEY = '0'.repeat(64) // 32 bytes hex

describe('encrypt', () => {
  it('round-trips a payload', () => {
    const payload = {
      refreshToken: 'refresh-abc',
      email: 'user@example.com',
      createdAt: 123456789,
    }
    const sealed = seal(payload, KEY)
    expect(open(sealed, KEY)).toEqual(payload)
  })

  it('round-trips a payload with null email', () => {
    const payload = {
      refreshToken: 'refresh-xyz',
      email: null,
      createdAt: 0,
    }
    const sealed = seal(payload, KEY)
    expect(open(sealed, KEY)).toEqual(payload)
  })

  it('throws on tampered ciphertext', () => {
    const payload = {
      refreshToken: 'refresh-abc',
      email: 'user@example.com',
      createdAt: 123456789,
    }
    const sealed = seal(payload, KEY)
    const buf = Buffer.from(sealed, 'base64url')
    buf[buf.length - 1] ^= 1
    expect(() => open(buf.toString('base64url'), KEY)).toThrow()
  })

  it('throws on a short key', () => {
    const payload = {
      refreshToken: 'refresh-abc',
      email: 'user@example.com',
      createdAt: 123456789,
    }
    expect(() => seal(payload, '0'.repeat(32))).toThrow()
  })

  it('throws on missing key', () => {
    const payload = {
      refreshToken: 'refresh-abc',
      email: 'user@example.com',
      createdAt: 123456789,
    }
    expect(() => seal(payload, '')).toThrow()
    expect(() => open('', KEY)).toThrow()
  })
})
