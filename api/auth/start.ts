import { Hono } from 'hono'

import { envOk, googleClientId, originFromRequest } from '../lib/auth-shared.js'
import {
  STATE_COOKIE,
  VERIFIER_COOKIE,
  PKCE_MAX_AGE_SECONDS,
  generateState,
  generateVerifier,
  setCookieHeader,
} from '../lib/cookies.js'
import { buildAuthUrl } from '../lib/google.js'

const app = new Hono()

app.get('*', (c) => {
  if (!envOk()) {
    return c.text('Server configuration error.', 500)
  }
  const origin = originFromRequest(c)
  const verifier = generateVerifier()
  const state = generateState()
  const redirectUrl = buildAuthUrl({
    origin,
    verifier,
    state,
    clientId: googleClientId(),
  })

  c.header(
    'Set-Cookie',
    setCookieHeader(VERIFIER_COOKIE, verifier, origin, PKCE_MAX_AGE_SECONDS),
    { append: true },
  )
  c.header(
    'Set-Cookie',
    setCookieHeader(STATE_COOKIE, state, origin, PKCE_MAX_AGE_SECONDS),
    { append: true },
  )
  return c.redirect(redirectUrl, 302)
})

export default app
