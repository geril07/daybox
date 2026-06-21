import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { App } from './App'

const serverAuth = vi.hoisted(() => ({
  getAuthStatus: vi.fn(),
}))

vi.mock('@/shared/google-drive/server-auth', () => ({
  startAuth: vi.fn(),
  refreshAccessToken: vi.fn(),
  disconnectAuth: vi.fn(),
  getAuthStatus: serverAuth.getAuthStatus,
}))

vi.mock('@/modules/google-drive', () => ({
  useGoogleDriveStore: {
    getState: vi.fn(() => ({ hydrateFromStatus: vi.fn() })),
    setState: vi.fn(),
  },
  GoogleDrivePanel: () => null,
}))

beforeEach(() => {
  cleanup()
  serverAuth.getAuthStatus.mockReset().mockResolvedValue({
    connected: false,
    email: null,
  })
})

afterEach(() => {
  cleanup()
  window.history.replaceState(null, '', '/')
})

describe('App shell boot hydration', () => {
  it('calls getAuthStatus on mount and hydrates the store', async () => {
    serverAuth.getAuthStatus.mockResolvedValue({
      connected: true,
      email: 'me@example.com',
    })
    render(<App />)

    await waitFor(() => {
      expect(serverAuth.getAuthStatus).toHaveBeenCalledTimes(1)
    })
  })

  it('clears the connected query param and re-fetches status', async () => {
    window.history.replaceState(null, '', '/?connected=1')
    serverAuth.getAuthStatus.mockResolvedValue({
      connected: true,
      email: 'me@example.com',
    })

    render(<App />)

    await waitFor(() => {
      expect(window.location.search).toBe('')
    })
    expect(serverAuth.getAuthStatus).toHaveBeenCalledTimes(1)
  })

  it('clears the failed connected query param', async () => {
    window.history.replaceState(null, '', '/?connected=0')

    render(<App />)

    await waitFor(() => {
      expect(window.location.search).toBe('')
    })
  })
})
