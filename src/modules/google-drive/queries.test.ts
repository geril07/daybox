import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useIsConnected } from './queries'
import { useGoogleDriveStore } from './store'

beforeEach(() => {
  useGoogleDriveStore.setState({
    accessToken: undefined,
    expiresAt: undefined,
    email: undefined,
    dayboxFileId: undefined,
    backupFileSpace: undefined,
    lastBackupAt: undefined,
    status: 'idle',
    error: null,
  })
})

describe('useIsConnected', () => {
  it('returns false with no remembered Google Drive metadata', () => {
    const { result } = renderHook(() => useIsConnected())

    expect(result.current).toBe(false)
  })

  it('returns true when remembered metadata exists after token expiry', () => {
    useGoogleDriveStore.setState({
      accessToken: 'expired-token',
      expiresAt: Date.now() - 60_000,
      email: 'me@example.com',
    })

    const { result } = renderHook(() => useIsConnected())

    expect(result.current).toBe(true)
  })

  it('returns true for legacy states that only have an access token', () => {
    useGoogleDriveStore.setState({
      accessToken: 'legacy-token',
      expiresAt: Date.now() - 60_000,
    })

    const { result } = renderHook(() => useIsConnected())

    expect(result.current).toBe(true)
  })
})
