import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'

import {
  REFRESH_TOKEN_COOKIE,
  VERIFIER_COOKIE,
  STATE_COOKIE,
  PKCE_MAX_AGE_SECONDS,
  clearCookieHeader,
  cookieName,
  generateState,
  generateVerifier,
  setCookieHeader,
} from '../lib/cookies.js'
import { open, seal } from '../lib/encrypt.js'
import {
  buildAuthUrl,
  exchangeCode,
  fetchUserEmail,
  refreshAccessToken,
  revokeToken,
} from '../lib/google.js'

function tokenEncKey(): string {
  return process.env.TOKEN_ENC_KEY ?? ''
}

function googleClientId(): string {
  return process.env.GOOGLE_CLIENT_ID ?? ''
}

function googleClientSecret(): string {
  return process.env.GOOGLE_CLIENT_SECRET ?? ''
}

function envOk(): boolean {
  const key = tokenEncKey()
  return Boolean(
    key && googleClientId() && googleClientSecret() && key.length === 64,
  )
}

function originFromRequest(c: { req: { url: string } }): string {
  const reqUrl = new URL(c.req.url)
  return `${reqUrl.protocol}//${reqUrl.host}`
}

const app = new Hono()

app.get('/start', (c) => {
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

app.get('/callback', async (c) => {
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

app.post('/refresh', async (c) => {
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

app.post('/disconnect', async (c) => {
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

app.get('/status', (c) => {
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
