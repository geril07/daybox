import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildSnapshot } from '@/modules/data-portability'

import { useGoogleDriveStore } from './store'

const serverAuth = vi.hoisted(() => ({
  startAuth: vi.fn(),
  refreshAccessToken: vi.fn(),
  disconnectAuth: vi.fn(),
  getAuthStatus: vi.fn(),
}))

vi.mock('@/shared/google-drive/server-auth', () => ({
  startAuth: serverAuth.startAuth,
  refreshAccessToken: serverAuth.refreshAccessToken,
  disconnectAuth: serverAuth.disconnectAuth,
  getAuthStatus: serverAuth.getAuthStatus,
}))

const fetchMock = vi.fn()

function resetConnectedState(
  partial: {
    accessToken?: string
    expiresAt?: number
    connected?: boolean
    email?: string | null
    dayboxFileId?: string
    backupFileSpace?: 'drive-root'
    lastBackupAt?: string
  } = {},
) {
  useGoogleDriveStore.setState({
    connected: partial.connected ?? true,
    email: partial.email ?? 'me@example.com',
    accessToken: partial.accessToken ?? 'tok',
    expiresAt: partial.expiresAt ?? Date.now() + 60 * 60_000,
    dayboxFileId: partial.dayboxFileId,
    backupFileSpace: partial.backupFileSpace,
    lastBackupAt: partial.lastBackupAt,
    status: 'idle',
    error: null,
  })
}

beforeEach(() => {
  localStorage.clear()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  serverAuth.startAuth.mockReset()
  serverAuth.refreshAccessToken.mockReset().mockResolvedValue({
    accessToken: 'new-token',
    expiresIn: 3600,
  })
  serverAuth.disconnectAuth.mockReset().mockResolvedValue(undefined)
  serverAuth.getAuthStatus.mockReset().mockResolvedValue({
    connected: false,
    email: null,
  })
  resetConnectedState()
})

describe('Google Drive store connect', () => {
  it('navigates to /api/auth/start', () => {
    useGoogleDriveStore.getState().connect()
    expect(serverAuth.startAuth).toHaveBeenCalledTimes(1)
  })
})

describe('Google Drive store disconnect', () => {
  it('calls server disconnect and clears all remembered Google Drive metadata', async () => {
    resetConnectedState({
      dayboxFileId: 'visible-id',
      backupFileSpace: 'drive-root',
      lastBackupAt: '2026-01-01T00:00:00.000Z',
    })

    await useGoogleDriveStore.getState().disconnect()

    expect(serverAuth.disconnectAuth).toHaveBeenCalledTimes(1)
    expect(useGoogleDriveStore.getState()).toMatchObject({
      accessToken: undefined,
      expiresAt: undefined,
      email: null,
      connected: false,
      dayboxFileId: undefined,
      backupFileSpace: undefined,
      lastBackupAt: undefined,
      status: 'idle',
      error: null,
    })
  })

  it('still clears local state when server disconnect fails', async () => {
    resetConnectedState({
      dayboxFileId: 'visible-id',
      backupFileSpace: 'drive-root',
      lastBackupAt: '2026-01-01T00:00:00.000Z',
    })
    serverAuth.disconnectAuth.mockRejectedValue(new Error('network'))

    await useGoogleDriveStore.getState().disconnect()

    expect(serverAuth.disconnectAuth).toHaveBeenCalledTimes(1)
    expect(useGoogleDriveStore.getState()).toMatchObject({
      connected: false,
      email: null,
      dayboxFileId: undefined,
      backupFileSpace: undefined,
      lastBackupAt: undefined,
    })
  })
})

describe('Google Drive store backup', () => {
  it('creates a visible root backup when no prior root file exists', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ files: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'new-root-id' }),
      })

    const result = await useGoogleDriveStore.getState().backup()

    expect(result).toEqual({ ok: true })
    expect(useGoogleDriveStore.getState().dayboxFileId).toBe('new-root-id')
    expect(useGoogleDriveStore.getState().backupFileSpace).toBe('drive-root')
    expect(useGoogleDriveStore.getState().lastBackupAt).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const [listUrl] = fetchMock.mock.calls[0]
    expect(listUrl).toContain('spaces=drive')
    expect(decodeURIComponent(listUrl as string)).toContain("'root' in parents")
    const [, uploadInit] = fetchMock.mock.calls[1]
    expect((uploadInit as RequestInit).method).toBe('POST')
  })

  it('updates the stored visible root file id on repeated backup', async () => {
    useGoogleDriveStore.setState({
      dayboxFileId: 'visible-id',
      backupFileSpace: 'drive-root',
    })
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200 })

    const result = await useGoogleDriveStore.getState().backup()

    expect(result).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/upload/drive/v3/files/visible-id')
    expect((init as RequestInit).method).toBe('PATCH')
    expect(useGoogleDriveStore.getState().dayboxFileId).toBe('visible-id')
    expect(useGoogleDriveStore.getState().backupFileSpace).toBe('drive-root')
  })

  it('finds and updates an existing root file when no id is stored', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ files: [{ id: 'found-root-id' }] }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200 })

    const result = await useGoogleDriveStore.getState().backup()

    expect(result).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const [patchUrl, patchInit] = fetchMock.mock.calls[1]
    expect(patchUrl).toContain('/upload/drive/v3/files/found-root-id')
    expect((patchInit as RequestInit).method).toBe('PATCH')
    expect(useGoogleDriveStore.getState().dayboxFileId).toBe('found-root-id')
    expect(useGoogleDriveStore.getState().backupFileSpace).toBe('drive-root')
  })

  it('does not patch an old unmarked appDataFolder id', async () => {
    resetConnectedState({ dayboxFileId: 'old-hidden-id' })
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ files: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'new-root-id' }),
      })

    const result = await useGoogleDriveStore.getState().backup()

    expect(result).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).not.toContain('old-hidden-id')
    expect(fetchMock.mock.calls[1][0]).not.toContain('old-hidden-id')
    expect(useGoogleDriveStore.getState().dayboxFileId).toBe('new-root-id')
    expect(useGoogleDriveStore.getState().backupFileSpace).toBe('drive-root')
  })

  it('refreshes an expired access token before backing up', async () => {
    resetConnectedState({
      accessToken: 'expired-token',
      expiresAt: Date.now() - 60_000,
    })
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ files: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'new-root-id' }),
      })

    const result = await useGoogleDriveStore.getState().backup()

    expect(result).toEqual({ ok: true })
    expect(serverAuth.refreshAccessToken).toHaveBeenCalledTimes(1)
    expect(useGoogleDriveStore.getState().accessToken).toBe('new-token')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const [, listInit] = fetchMock.mock.calls[0]
    expect((listInit as RequestInit).headers).toEqual({
      Authorization: 'Bearer new-token',
    })
  })

  it('keeps remembered metadata when server refresh fails', async () => {
    resetConnectedState({
      accessToken: 'expired-token',
      expiresAt: Date.now() - 60_000,
      dayboxFileId: 'visible-id',
      backupFileSpace: 'drive-root',
      lastBackupAt: '2026-01-01T00:00:00.000Z',
    })
    serverAuth.refreshAccessToken.mockRejectedValue(
      new Error('Refresh failed (401)'),
    )

    const result = await useGoogleDriveStore.getState().backup()

    expect(result).toEqual({ ok: false, error: { kind: 'token-expired' } })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(useGoogleDriveStore.getState()).toMatchObject({
      email: 'me@example.com',
      dayboxFileId: 'visible-id',
      backupFileSpace: 'drive-root',
      lastBackupAt: '2026-01-01T00:00:00.000Z',
      error: { kind: 'token-expired' },
    })
  })
})

describe('Google Drive store restore', () => {
  it('discovers and restores a visible root backup when no id is stored', async () => {
    const snapshotResult = buildSnapshot()
    const snapshotJson = JSON.stringify(
      snapshotResult.ok ? snapshotResult.value : {},
    )
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ files: [{ id: 'found-root-id' }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => snapshotJson,
      })

    const result = await useGoogleDriveStore.getState().restore()

    expect(result).toEqual({ ok: true, warnings: undefined })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toContain('spaces=drive')
    expect(fetchMock.mock.calls[1][0]).toContain(
      '/drive/v3/files/found-root-id',
    )
    expect(useGoogleDriveStore.getState().dayboxFileId).toBe('found-root-id')
    expect(useGoogleDriveStore.getState().backupFileSpace).toBe('drive-root')
  })

  it('returns not-found when no visible root backup exists', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ files: [] }),
    })

    const result = await useGoogleDriveStore.getState().restore()

    expect(result).toEqual({ ok: false, error: { kind: 'not-found' } })
    expect(useGoogleDriveStore.getState().error).toEqual({ kind: 'not-found' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toContain('spaces=drive')
  })

  it('does not download an old unmarked appDataFolder id during restore', async () => {
    resetConnectedState({ dayboxFileId: 'old-hidden-id' })
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ files: [] }),
    })

    const result = await useGoogleDriveStore.getState().restore()

    expect(result).toEqual({ ok: false, error: { kind: 'not-found' } })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).not.toContain('old-hidden-id')
  })

  it('refreshes an expired access token before restoring', async () => {
    const snapshotResult = buildSnapshot()
    const snapshotJson = JSON.stringify(
      snapshotResult.ok ? snapshotResult.value : {},
    )
    resetConnectedState({
      accessToken: 'expired-token',
      expiresAt: Date.now() - 60_000,
      dayboxFileId: 'visible-id',
      backupFileSpace: 'drive-root',
    })
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => snapshotJson,
    })

    const result = await useGoogleDriveStore.getState().restore()

    expect(result).toEqual({ ok: true, warnings: undefined })
    expect(serverAuth.refreshAccessToken).toHaveBeenCalledTimes(1)
    expect(useGoogleDriveStore.getState().accessToken).toBe('new-token')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, downloadInit] = fetchMock.mock.calls[0]
    expect((downloadInit as RequestInit).headers).toEqual({
      Authorization: 'Bearer new-token',
    })
  })

  it('keeps remembered metadata when server refresh fails', async () => {
    resetConnectedState({
      accessToken: 'expired-token',
      expiresAt: Date.now() - 60_000,
      dayboxFileId: 'visible-id',
      backupFileSpace: 'drive-root',
      lastBackupAt: '2026-01-01T00:00:00.000Z',
    })
    serverAuth.refreshAccessToken.mockRejectedValue(
      new Error('Refresh failed (401)'),
    )

    const result = await useGoogleDriveStore.getState().restore()

    expect(result).toEqual({ ok: false, error: { kind: 'token-expired' } })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(useGoogleDriveStore.getState()).toMatchObject({
      email: 'me@example.com',
      dayboxFileId: 'visible-id',
      backupFileSpace: 'drive-root',
      lastBackupAt: '2026-01-01T00:00:00.000Z',
      error: { kind: 'token-expired' },
    })
  })
})
