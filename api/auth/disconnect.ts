import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'

import { originFromRequest, tokenEncKey } from '../lib/auth-shared.js'
import {
  REFRESH_TOKEN_COOKIE,
  clearCookieHeader,
  cookieName,
} from '../lib/cookies.js'
import { open } from '../lib/encrypt.js'
import { revokeToken } from '../lib/google.js'

const app = new Hono()

app.post('*', async (c) => {
  const origin = originFromRequest(c)
  const sealed = getCookie(c, cookieName(REFRESH_TOKEN_COOKIE, origin))
  if (sealed) {
    try {
      const payload = open(sealed, tokenEncKey())
      if (payload.refreshToken) {
        try {
          await revokeToken({ token: payload.refreshToken })
        } catch {
          // Revoke failure is best-effort; still clear the cookie below.
        }
      }
    } catch {
      // If the cookie is undecryptable we still want to clear it.
    }
  }
  c.header('Set-Cookie', clearCookieHeader(REFRESH_TOKEN_COOKIE, origin), {
    append: true,
  })
  return c.json({ ok: true })
})

export default app
