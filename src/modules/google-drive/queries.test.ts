import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useAccountEmail, useIsConnected } from './queries'
import { useGoogleDriveStore } from './store'

beforeEach(() => {
  useGoogleDriveStore.setState({
    connected: false,
    email: null,
    accessToken: undefined,
    expiresAt: undefined,
    dayboxFileId: undefined,
    backupFileSpace: undefined,
    lastBackupAt: undefined,
    status: 'idle',
    error: null,
  })
})

describe('useIsConnected', () => {
  it('returns false when not connected', () => {
    const { result } = renderHook(() => useIsConnected())

    expect(result.current).toBe(false)
  })

  it('returns true when the runtime connected flag is true', () => {
    useGoogleDriveStore.setState({
      connected: true,
      email: 'me@example.com',
    })

    const { result } = renderHook(() => useIsConnected())

    expect(result.current).toBe(true)
  })
})

describe('useAccountEmail', () => {
  it('returns the email from runtime state', () => {
    useGoogleDriveStore.setState({ email: 'me@example.com' })

    const { result } = renderHook(() => useAccountEmail())

    expect(result.current).toBe('me@example.com')
  })

  it('returns null when no email is set', () => {
    const { result } = renderHook(() => useAccountEmail())

    expect(result.current).toBeNull()
  })
})
