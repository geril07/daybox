import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  REFRESH_TOKEN_COOKIE,
  STATE_COOKIE,
  VERIFIER_COOKIE,
} from '../lib/cookies.js'
import type { SealedPayload } from '../lib/encrypt.js'
import { open, seal } from '../lib/encrypt.js'
import app from './[[...route]].js'

const TOKEN_ENC_KEY = '0'.repeat(64)
const CLIENT_ID = 'client-id-123'
const CLIENT_SECRET = 'client-secret-456'

function mockFetchOnce(response: unknown, status = 200) {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response(JSON.stringify(response), { status }),
  )
}

function extractCookieHeader(
  response: Response,
  name: string,
): string | undefined {
  const headers: string[] = []
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') headers.push(value)
  })
  return headers.find((h) => h.startsWith(`${name}=`))
}

function cookieValue(header: string | undefined): string | undefined {
  if (!header) return undefined
  const match = header.match(/^[^=]+=([^;]+)/)
  return match?.[1]
}

function parseSetCookies(response: Response): Map<string, string> {
  const map = new Map<string, string>()
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      const name = value.split('=')[0]
      map.set(name, value)
    }
  })
  return map
}

describe('auth endpoints', () => {
  beforeEach(() => {
    vi.stubEnv('TOKEN_ENC_KEY', TOKEN_ENC_KEY)
    vi.stubEnv('GOOGLE_CLIENT_ID', CLIENT_ID)
    vi.stubEnv('GOOGLE_CLIENT_SECRET', CLIENT_SECRET)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  describe('GET /start', () => {
    it('sets verifier and state cookies and redirects to Google consent', async () => {
      const res = await app.request('https://daybox.example.com/start', {
        headers: { Origin: 'https://daybox.example.com' },
      })
      expect(res.status).toBe(302)
      const location = res.headers.get('Location')
      expect(location).toContain('https://accounts.google.com/o/oauth2/v2/auth')
      expect(location).toContain(`client_id=${CLIENT_ID}`)
      expect(location).toContain('response_type=code')
      expect(location).toContain('code_challenge_method=S256')
      expect(location).toContain('access_type=offline')
      expect(location).toContain('prompt=consent')
      expect(location).toContain(
        encodeURIComponent('https://daybox.example.com/api/auth/callback'),
      )

      const verifierHeader = extractCookieHeader(res, VERIFIER_COOKIE)
      const stateHeader = extractCookieHeader(res, STATE_COOKIE)
      expect(verifierHeader).toBeDefined()
      expect(stateHeader).toBeDefined()
      expect(verifierHeader).toContain('HttpOnly')
      expect(verifierHeader).toContain('Max-Age=600')
      expect(verifierHeader).toContain('Secure')
      expect(verifierHeader).toContain('SameSite=Lax')
    })

    it('uses unprefixed cookie names and no Secure on http localhost', async () => {
      const res = await app.request('http://localhost:3000/start', {
        headers: { Origin: 'http://localhost:3000' },
      })
      expect(res.status).toBe(302)
      // On http origins the __Host- prefix is dropped (browsers reject __Host-
      // cookies without Secure), and Secure is omitted.
      const verifierHeader = extractCookieHeader(res, 'db_v')
      expect(verifierHeader).toBeDefined()
      expect(verifierHeader).not.toContain('Secure')
      expect(verifierHeader).not.toContain('__Host-')
    })

    it('returns 500 when env vars are missing', async () => {
      vi.unstubAllEnvs()
      const res = await app.request('https://daybox.example.com/start', {
        headers: { Origin: 'https://daybox.example.com' },
      })
      expect(res.status).toBe(500)
    })
  })

  describe('GET /callback', () => {
    it('exchanges code and sets refresh token cookie on success', async () => {
      // First call: start to get verifier/state cookies.
      const startRes = await app.request('https://daybox.example.com/start', {
        headers: { Origin: 'https://daybox.example.com' },
      })
      const verifier = cookieValue(
        extractCookieHeader(startRes, VERIFIER_COOKIE),
      )
      const state = cookieValue(extractCookieHeader(startRes, STATE_COOKIE))
      if (!verifier || !state) throw new Error('verifier/state missing')

      // Mock Google token exchange.
      mockFetchOnce({
        access_token: 'access-token-1',
        refresh_token: 'refresh-token-1',
        expires_in: 3600,
        token_type: 'Bearer',
      })
      // Mock Google userinfo.
      mockFetchOnce({ email: 'user@example.com' })

      const res = await app.request(
        `https://daybox.example.com/callback?code=auth-code-123&state=${state}`,
        {
          headers: {
            Origin: 'https://daybox.example.com',
            Cookie: `${VERIFIER_COOKIE}=${verifier}; ${STATE_COOKIE}=${state}`,
          },
        },
      )

      expect(res.status).toBe(302)
      expect(res.headers.get('Location')).toBe('/?connected=1')
      const refreshHeader = extractCookieHeader(res, REFRESH_TOKEN_COOKIE)
      expect(refreshHeader).toBeDefined()
      expect(refreshHeader).toContain('HttpOnly')
      expect(refreshHeader).toContain('Secure')

      // Verifier and state cookies should be cleared.
      const cookies = parseSetCookies(res)
      expect(cookies.get(VERIFIER_COOKIE)).toContain('Max-Age=0')
      expect(cookies.get(STATE_COOKIE)).toContain('Max-Age=0')

      // Verify refresh token is encrypted and contains email.
      const raw = cookieValue(refreshHeader)
      expect(raw).toBeDefined()
      const payload = open(raw!, TOKEN_ENC_KEY)
      expect(payload.refreshToken).toBe('refresh-token-1')
      expect(payload.email).toBe('user@example.com')
    })

    it('rejects mismatched state with 400', async () => {
      const res = await app.request(
        'https://daybox.example.com/callback?code=auth-code-123&state=bad',
        {
          headers: {
            Origin: 'https://daybox.example.com',
            Cookie: `${STATE_COOKIE}=good`,
          },
        },
      )
      expect(res.status).toBe(400)
    })

    it('redirects to connected=0 on exchange failure', async () => {
      const startRes = await app.request('https://daybox.example.com/start', {
        headers: { Origin: 'https://daybox.example.com' },
      })
      const verifier = cookieValue(
        extractCookieHeader(startRes, VERIFIER_COOKIE),
      )
      const state = cookieValue(extractCookieHeader(startRes, STATE_COOKIE))
      if (!verifier || !state) throw new Error('verifier/state missing')

      mockFetchOnce({ error: 'invalid_grant' }, 400)

      const res = await app.request(
        `https://daybox.example.com/callback?code=auth-code-123&state=${state}`,
        {
          headers: {
            Origin: 'https://daybox.example.com',
            Cookie: `${VERIFIER_COOKIE}=${verifier}; ${STATE_COOKIE}=${state}`,
          },
        },
      )
      expect(res.status).toBe(302)
      expect(res.headers.get('Location')).toBe('/?connected=0')
      expect(extractCookieHeader(res, REFRESH_TOKEN_COOKIE)).toBeUndefined()
    })
  })

  describe('POST /refresh', () => {
    it('returns a fresh access token', async () => {
      const payload: SealedPayload = {
        refreshToken: 'refresh-token-1',
        email: 'user@example.com',
        createdAt: Date.now(),
      }
      const sealed = seal(payload, TOKEN_ENC_KEY)

      mockFetchOnce({
        access_token: 'access-token-2',
        expires_in: 3600,
        token_type: 'Bearer',
      })

      const res = await app.request('https://daybox.example.com/refresh', {
        method: 'POST',
        headers: {
          Origin: 'https://daybox.example.com',
          Cookie: `${REFRESH_TOKEN_COOKIE}=${sealed}`,
        },
      })
      expect(res.status).toBe(200)
      const body = (await res.json()) as {
        accessToken: string
        expiresIn: number
      }
      expect(body.accessToken).toBe('access-token-2')
      expect(body.expiresIn).toBe(3600)
    })

    it('rotates the refresh cookie when Google returns a new one', async () => {
      const payload: SealedPayload = {
        refreshToken: 'refresh-token-old',
        email: 'user@example.com',
        createdAt: Date.now(),
      }
      const sealed = seal(payload, TOKEN_ENC_KEY)

      mockFetchOnce({
        access_token: 'access-token-3',
        refresh_token: 'refresh-token-new',
        expires_in: 3600,
        token_type: 'Bearer',
      })

      const res = await app.request('https://daybox.example.com/refresh', {
        method: 'POST',
        headers: {
          Origin: 'https://daybox.example.com',
          Cookie: `${REFRESH_TOKEN_COOKIE}=${sealed}`,
        },
      })
      expect(res.status).toBe(200)
      const refreshHeader = extractCookieHeader(res, REFRESH_TOKEN_COOKIE)
      expect(refreshHeader).toBeDefined()
      const raw = cookieValue(refreshHeader)
      expect(raw).toBeDefined()
      const opened = open(raw!, TOKEN_ENC_KEY)
      expect(opened.refreshToken).toBe('refresh-token-new')
    })

    it('returns 401 and clears cookie when cookie is missing', async () => {
      const res = await app.request('https://daybox.example.com/refresh', {
        method: 'POST',
      })
      expect(res.status).toBe(401)
      const header = extractCookieHeader(res, REFRESH_TOKEN_COOKIE)
      expect(header).toContain('Max-Age=0')
    })

    it('returns 401 and clears cookie when cookie is undecryptable', async () => {
      const res = await app.request('https://daybox.example.com/refresh', {
        method: 'POST',
        headers: {
          Cookie: `${REFRESH_TOKEN_COOKIE}=not-valid-base64-or-tampered`,
        },
      })
      expect(res.status).toBe(401)
      const header = extractCookieHeader(res, REFRESH_TOKEN_COOKIE)
      expect(header).toContain('Max-Age=0')
    })

    it('returns 401 and clears cookie on invalid_grant from Google', async () => {
      const payload: SealedPayload = {
        refreshToken: 'refresh-token-1',
        email: 'user@example.com',
        createdAt: Date.now(),
      }
      const sealed = seal(payload, TOKEN_ENC_KEY)

      mockFetchOnce({ error: 'invalid_grant' }, 400)

      const res = await app.request('https://daybox.example.com/refresh', {
        method: 'POST',
        headers: { Cookie: `${REFRESH_TOKEN_COOKIE}=${sealed}` },
      })
      expect(res.status).toBe(401)
      const header = extractCookieHeader(res, REFRESH_TOKEN_COOKIE)
      expect(header).toContain('Max-Age=0')
    })
  })

  describe('POST /disconnect', () => {
    it('revokes the refresh token and clears the cookie', async () => {
      const payload: SealedPayload = {
        refreshToken: 'refresh-token-1',
        email: 'user@example.com',
        createdAt: Date.now(),
      }
      const sealed = seal(payload, TOKEN_ENC_KEY)
      mockFetchOnce({}, 200)

      const res = await app.request('https://daybox.example.com/disconnect', {
        method: 'POST',
        headers: { Cookie: `${REFRESH_TOKEN_COOKIE}=${sealed}` },
      })
      expect(res.status).toBe(200)
      const header = extractCookieHeader(res, REFRESH_TOKEN_COOKIE)
      expect(header).toContain('Max-Age=0')
    })

    it('still clears cookie when revoke fails', async () => {
      const payload: SealedPayload = {
        refreshToken: 'refresh-token-1',
        email: 'user@example.com',
        createdAt: Date.now(),
      }
      const sealed = seal(payload, TOKEN_ENC_KEY)
      mockFetchOnce({ error: 'invalid_token' }, 400)

      const res = await app.request('https://daybox.example.com/disconnect', {
        method: 'POST',
        headers: { Cookie: `${REFRESH_TOKEN_COOKIE}=${sealed}` },
      })
      expect(res.status).toBe(200)
      const header = extractCookieHeader(res, REFRESH_TOKEN_COOKIE)
      expect(header).toContain('Max-Age=0')
    })

    it('is a no-op when no cookie is present', async () => {
      const res = await app.request('https://daybox.example.com/disconnect', {
        method: 'POST',
      })
      expect(res.status).toBe(200)
      const header = extractCookieHeader(res, REFRESH_TOKEN_COOKIE)
      expect(header).toContain('Max-Age=0')
    })
  })

  describe('GET /status', () => {
    it('returns connected + email from valid cookie without hitting Google', async () => {
      const payload: SealedPayload = {
        refreshToken: 'refresh-token-1',
        email: 'user@example.com',
        createdAt: Date.now(),
      }
      const sealed = seal(payload, TOKEN_ENC_KEY)
      const res = await app.request('https://daybox.example.com/status', {
        headers: { Cookie: `${REFRESH_TOKEN_COOKIE}=${sealed}` },
      })
      expect(res.status).toBe(200)
      const body = (await res.json()) as { connected: boolean; email: string }
      expect(body.connected).toBe(true)
      expect(body.email).toBe('user@example.com')
    })

    it('returns disconnected when cookie is missing', async () => {
      const res = await app.request('https://daybox.example.com/status')
      expect(res.status).toBe(200)
      const body = (await res.json()) as { connected: boolean; email: null }
      expect(body.connected).toBe(false)
      expect(body.email).toBeNull()
    })

    it('returns disconnected when cookie is undecryptable', async () => {
      const res = await app.request('https://daybox.example.com/status', {
        headers: { Cookie: `${REFRESH_TOKEN_COOKIE}=garbage` },
      })
      expect(res.status).toBe(200)
      const body = (await res.json()) as { connected: boolean; email: null }
      expect(body.connected).toBe(false)
      expect(body.email).toBeNull()
    })
  })
})
