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
  STATE_COOKIE,
  VERIFIER_COOKIE,
  clearCookieHeader,
  cookieName,
  setCookieHeader,
} from '../lib/cookies.js'
import { seal } from '../lib/encrypt.js'
import { exchangeCode, fetchUserEmail } from '../lib/google.js'

const app = new Hono()

app.get('*', async (c) => {
  const origin = originFromRequest(c)
  const code = c.req.query('code')
  const state = c.req.query('state')
  const verifierCookie = getCookie(c, cookieName(VERIFIER_COOKIE, origin))
  const stateCookie = getCookie(c, cookieName(STATE_COOKIE, origin))

  c.header('Set-Cookie', clearCookieHeader(VERIFIER_COOKIE, origin), {
    append: true,
  })
  c.header('Set-Cookie', clearCookieHeader(STATE_COOKIE, origin), {
    append: true,
  })

  if (!code || !state || state !== stateCookie) {
    return c.text('Invalid or missing state.', 400)
  }
  if (!verifierCookie) {
    return c.redirect('/?connected=0', 302)
  }

  try {
    const tokens = await exchangeCode({
      code,
      verifier: verifierCookie,
      redirectUri: `${origin}/api/auth/callback`,
      clientId: googleClientId(),
      clientSecret: googleClientSecret(),
    })
    const refreshToken = tokens.refresh_token
    if (!refreshToken) {
      return c.redirect('/?connected=0', 302)
    }
    let email: string | null = null
    try {
      email = await fetchUserEmail({ accessToken: tokens.access_token })
    } catch {
      // Transient userinfo failure — still keep the refresh token; email is optional.
    }
    const sealed = seal(
      { refreshToken, email, createdAt: Date.now() },
      tokenEncKey(),
    )
    c.header(
      'Set-Cookie',
      setCookieHeader(REFRESH_TOKEN_COOKIE, sealed, origin),
      { append: true },
    )
    return c.redirect('/?connected=1', 302)
  } catch {
    return c.redirect('/?connected=0', 302)
  }
})

export default app
