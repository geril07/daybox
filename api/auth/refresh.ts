import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'

import {
  googleClientId,
  googleClientSecret,
  originFromRequest,
  tokenEncKey,
} from '../lib/auth-shared.js'
import {
  REFRESH_TOKEN_COOKIE,
  clearCookieHeader,
  cookieName,
  setCookieHeader,
} from '../lib/cookies.js'
import { open, seal } from '../lib/encrypt.js'
import { refreshAccessToken } from '../lib/google.js'

const app = new Hono()

app.post('*', async (c) => {
  const origin = originFromRequest(c)
  const sealed = getCookie(c, cookieName(REFRESH_TOKEN_COOKIE, origin))
  if (!sealed) {
    c.header('Set-Cookie', clearCookieHeader(REFRESH_TOKEN_COOKIE, origin), {
      append: true,
    })
    return c.json({ error: 'Not authenticated.' }, 401)
  }

  let payload: ReturnType<typeof open>
  try {
    payload = open(sealed, tokenEncKey())
  } catch {
    c.header('Set-Cookie', clearCookieHeader(REFRESH_TOKEN_COOKIE, origin), {
      append: true,
    })
    return c.json({ error: 'Invalid session.' }, 401)
  }

  try {
    const tokens = await refreshAccessToken({
      refreshToken: payload.refreshToken,
      clientId: googleClientId(),
      clientSecret: googleClientSecret(),
    })
    if (tokens.refresh_token) {
      const rotated = seal(
        {
          refreshToken: tokens.refresh_token,
          email: payload.email,
          createdAt: Date.now(),
        },
        tokenEncKey(),
      )
      c.header(
        'Set-Cookie',
        setCookieHeader(REFRESH_TOKEN_COOKIE, rotated, origin),
        { append: true },
      )
    }
    return c.json({
      accessToken: tokens.access_token,
      expiresIn: tokens.expires_in,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.toLowerCase().includes('invalid_grant')) {
      c.header('Set-Cookie', clearCookieHeader(REFRESH_TOKEN_COOKIE, origin), {
        append: true,
      })
      return c.json({ error: 'Session expired.' }, 401)
    }
    return c.json({ error: 'Refresh failed.' }, 500)
  }
})

export default app
