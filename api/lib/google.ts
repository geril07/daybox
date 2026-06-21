import { createHash } from 'node:crypto'

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v2/userinfo'
const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke'
const SCOPE = 'https://www.googleapis.com/auth/drive.file openid email'

export interface BuildAuthUrlParams {
  origin: string
  verifier: string
  state: string
  clientId: string
}

export function buildAuthUrl({
  origin,
  verifier,
  state,
  clientId,
}: BuildAuthUrlParams): string {
  const redirectUri = `${origin}/api/auth/callback`
  const challenge = Buffer.from(
    createHash('sha256').update(verifier).digest(),
  ).toString('base64url')
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPE,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent',
  })
  return `${AUTH_ENDPOINT}?${params.toString()}`
}

export interface ExchangeCodeParams {
  code: string
  verifier: string
  redirectUri: string
  clientId: string
  clientSecret: string
}

export interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope?: string
}

export async function exchangeCode({
  code,
  verifier,
  redirectUri,
  clientId,
  clientSecret,
}: ExchangeCodeParams): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  })
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = (await res.json()) as
    | TokenResponse
    | { error: string; error_description?: string }
  if (!res.ok || 'error' in data) {
    throw new Error(
      `Token exchange failed: ${'error' in data ? data.error : res.status}`,
    )
  }
  return data
}

export interface RefreshAccessTokenParams {
  refreshToken: string
  clientId: string
  clientSecret: string
}

export async function refreshAccessToken({
  refreshToken,
  clientId,
  clientSecret,
}: RefreshAccessTokenParams): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  })
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = (await res.json()) as
    | TokenResponse
    | { error: string; error_description?: string }
  if (!res.ok || 'error' in data) {
    throw new Error(
      `Refresh failed: ${'error' in data ? data.error : res.status}`,
    )
  }
  return data
}

export interface RevokeTokenParams {
  token: string
}

export async function revokeToken({ token }: RevokeTokenParams): Promise<void> {
  await fetch(`${REVOKE_ENDPOINT}?token=${encodeURIComponent(token)}`, {
    method: 'POST',
  })
}

export interface FetchUserEmailParams {
  accessToken: string
}

export async function fetchUserEmail({
  accessToken,
}: FetchUserEmailParams): Promise<string | null> {
  const res = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return null
  const data = (await res.json()) as { email?: string }
  return data.email ?? null
}
