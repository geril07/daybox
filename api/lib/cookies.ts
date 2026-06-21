import { randomBytes } from 'node:crypto'

export const REFRESH_TOKEN_COOKIE = '__Host-db_rt'
export const VERIFIER_COOKIE = '__Host-db_v'
export const STATE_COOKIE = '__Host-db_s'

export const PKCE_MAX_AGE_SECONDS = 600

export interface CookieOptions {
  httpOnly: true
  secure: boolean
  sameSite: 'Lax'
  path: '/'
  maxAge: number
}

export function isHttpOrigin(origin: string): boolean {
  try {
    return new URL(origin).protocol === 'http:'
  } catch {
    return false
  }
}

export function cookieName(prefixedName: string, origin: string): string {
  return isHttpOrigin(origin)
    ? prefixedName.replace(/^__Host-/, '')
    : prefixedName
}

export function buildCookieOptions(
  origin: string,
  maxAge: number,
): CookieOptions {
  return {
    httpOnly: true,
    secure: !isHttpOrigin(origin),
    sameSite: 'Lax',
    path: '/',
    maxAge,
  }
}

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60

export function setCookieHeader(
  name: string,
  value: string,
  origin: string,
  maxAge = ONE_YEAR_SECONDS,
): string {
  const opts = buildCookieOptions(origin, maxAge)
  const resolved = cookieName(name, origin)
  const parts = [
    `${resolved}=${value}`,
    `HttpOnly`,
    `Path=${opts.path}`,
    `SameSite=${opts.sameSite}`,
    `Max-Age=${opts.maxAge}`,
  ]
  if (opts.secure) parts.push('Secure')
  return parts.join('; ')
}

export function clearCookieHeader(name: string, origin: string): string {
  return setCookieHeader(name, '', origin, 0)
}

export function generateVerifier(): string {
  return randomBytes(32).toString('base64url')
}

export function generateState(): string {
  return randomBytes(16).toString('base64url')
}
