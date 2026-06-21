export interface AuthStatus {
  connected: boolean
  email: string | null
}

export interface RefreshResult {
  accessToken: string
  expiresIn: number
}

export function startAuth(): void {
  window.location.assign('/api/auth/start')
}

async function apiPost(path: string): Promise<Response> {
  return fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
  })
}

export async function refreshAccessToken(): Promise<RefreshResult> {
  const res = await apiPost('/api/auth/refresh')
  if (!res.ok) {
    throw new Error(`Refresh failed (${res.status})`)
  }
  return (await res.json()) as RefreshResult
}

export async function disconnectAuth(): Promise<void> {
  const res = await apiPost('/api/auth/disconnect')
  if (!res.ok) {
    throw new Error(`Disconnect failed (${res.status})`)
  }
}

export async function getAuthStatus(): Promise<AuthStatus> {
  const res = await fetch('/api/auth/status', {
    method: 'GET',
    credentials: 'same-origin',
  })
  if (!res.ok) {
    return { connected: false, email: null }
  }
  return (await res.json()) as AuthStatus
}
