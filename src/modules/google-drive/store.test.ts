import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildSnapshot } from '@/modules/data-portability'

import { useGoogleDriveStore } from './store'

const fetchMock = vi.fn()

function resetConnectedState(partial: { dayboxFileId?: string } = {}) {
  useGoogleDriveStore.setState({
    accessToken: 'tok',
    expiresAt: Date.now() + 60 * 60_000,
    email: 'me@example.com',
    dayboxFileId: partial.dayboxFileId,
    backupFileSpace: undefined,
    lastBackupAt: undefined,
    status: 'idle',
    error: null,
  })
}

beforeEach(() => {
  localStorage.clear()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  resetConnectedState()
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
})
