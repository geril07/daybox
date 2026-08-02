import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { App } from './App'

const serverAuth = vi.hoisted(() => ({
  getAuthStatus: vi.fn(),
}))

type AudioContextMockApi = {
  instances: unknown[]
  reset: () => void
}

const getAudioContextMock = () => AudioContext as unknown as AudioContextMockApi

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
  getAudioContextMock().reset()
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

  it('does not unlock audio for untrusted synthetic interactions', () => {
    render(<App />)

    fireEvent(window, new Event('pointerdown'))
    fireEvent(window, new KeyboardEvent('keydown', { key: 'a' }))

    expect(getAudioContextMock().instances).toHaveLength(0)
  })

  it('unlocks audio for a trusted pointer interaction', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    render(<App />)

    const pointerListener = addEventListenerSpy.mock.calls.find(
      ([type]) => type === 'pointerdown',
    )?.[1]
    expect(pointerListener).toEqual(expect.any(Function))
    ;(pointerListener as EventListener)({ isTrusted: true } as Event)

    expect(getAudioContextMock().instances).toHaveLength(1)
  })
})
