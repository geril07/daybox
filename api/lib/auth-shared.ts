export function tokenEncKey(): string {
  return process.env.TOKEN_ENC_KEY ?? ''
}

export function googleClientId(): string {
  return process.env.GOOGLE_CLIENT_ID ?? ''
}

export function googleClientSecret(): string {
  return process.env.GOOGLE_CLIENT_SECRET ?? ''
}

export function envOk(): boolean {
  const key = tokenEncKey()
  return Boolean(
    key && googleClientId() && googleClientSecret() && key.length === 64,
  )
}

export function originFromRequest(c: { req: { url: string } }): string {
  const reqUrl = new URL(c.req.url)
  return `${reqUrl.protocol}//${reqUrl.host}`
}
