const GIS_SRC = 'https://accounts.google.com/gsi/client'
const GIS_SCOPE = 'https://www.googleapis.com/auth/drive.appdata'

export type TokenResponse = {
  access_token: string
  expires_in: number
  token_type: string
  scope?: string
}

export type TokenError = {
  type: string
  message?: string
}

export interface TokenClientCallbacks {
  onToken: (response: TokenResponse) => void
  onError: (error: TokenError) => void
}

interface GoogleAccountsOauth2 {
  initTokenClient: (config: {
    client_id: string
    scope: string
    callback: (response: TokenResponse | TokenError) => void
    error_callback?: (error: TokenError) => void
  }) => TokenClient
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: GoogleAccountsOauth2
      }
    }
  }
}

export interface TokenClient {
  requestAccessToken: (overrides?: { prompt?: string }) => void
}

function getOauth2(): GoogleAccountsOauth2 {
  const oauth2 = window.google?.accounts?.oauth2
  if (!oauth2) {
    throw new Error('Google Identity Services failed to load.')
  }
  return oauth2
}

export function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('No window object available.'))
  }
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve()
  }
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GIS_SRC}"]`,
    )
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener(
        'error',
        () => reject(new Error('Failed to load Google Identity Services.')),
        { once: true },
      )
      return
    }
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.defer = true
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener(
      'error',
      () => reject(new Error('Failed to load Google Identity Services.')),
      { once: true },
    )
    document.head.appendChild(script)
  })
}

export function createTokenClient({
  onToken,
  onError,
}: TokenClientCallbacks): TokenClient {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
  if (!clientId) {
    throw new Error('VITE_GOOGLE_CLIENT_ID is not configured.')
  }
  const oauth2 = getOauth2()
  return oauth2.initTokenClient({
    client_id: clientId,
    scope: GIS_SCOPE,
    callback: (response) => {
      if ('access_token' in response) {
        onToken(response)
      } else {
        onError(response)
      }
    },
    error_callback: onError,
  })
}
