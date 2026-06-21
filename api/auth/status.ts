import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'

import { originFromRequest, tokenEncKey } from '../lib/auth-shared.js'
import { REFRESH_TOKEN_COOKIE, cookieName } from '../lib/cookies.js'
import { open } from '../lib/encrypt.js'

const app = new Hono()

app.get('*', (c) => {
  const origin = originFromRequest(c)
  const sealed = getCookie(c, cookieName(REFRESH_TOKEN_COOKIE, origin))
  if (!sealed) {
    return c.json({ connected: false, email: null })
  }
  try {
    const payload = open(sealed, tokenEncKey())
    return c.json({ connected: true, email: payload.email })
  } catch {
    return c.json({ connected: false, email: null })
  }
})

export default app
