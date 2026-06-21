import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useGoogleDriveStore } from '../store'
import { GoogleDrivePanel } from './GoogleDrivePanel'

const connect = vi.fn()
const disconnect = vi.fn()
const backup = vi.fn()
const restore = vi.fn()
const clearError = vi.fn()
const hydrateFromStatus = vi.fn()

function setStoreState(partial: {
  connected?: boolean
  email?: string | null
  dayboxFileId?: string
  backupFileSpace?: 'drive-root'
  lastBackupAt?: string
  error?: ReturnType<typeof useGoogleDriveStore.getState>['error']
}) {
  useGoogleDriveStore.setState({
    connected: partial.connected ?? false,
    email: partial.email ?? null,
    dayboxFileId: partial.dayboxFileId,
    backupFileSpace: partial.backupFileSpace,
    lastBackupAt: partial.lastBackupAt,
    error: partial.error ?? null,
    status: 'idle',
  })
}

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
  useGoogleDriveStore.setState({
    connect: connect as never,
    disconnect: disconnect as never,
    backup: backup as never,
    restore: restore as never,
    clearError: clearError as never,
    hydrateFromStatus: hydrateFromStatus as never,
  })
  backup.mockReset().mockResolvedValue({ ok: true })
  restore.mockReset().mockResolvedValue({ ok: true })
  connect.mockReset()
  disconnect.mockReset()
  clearError.mockReset()
  hydrateFromStatus.mockReset()
})

afterEach(() => {
  cleanup()
})

describe('GoogleDrivePanel — disconnected', () => {
  it('shows the Connect button', () => {
    render(<GoogleDrivePanel />)
    expect(
      screen.getByRole('button', { name: /connect with google/i }),
    ).toBeTruthy()
  })

  it('explains that backups are visible in Drive root', () => {
    render(<GoogleDrivePanel />)
    expect(screen.getByText(/visible daybox\.json/i)).toBeTruthy()
    expect(screen.getByText(/google drive root/i)).toBeTruthy()
  })

  it('stays disconnected when no remembered metadata exists', () => {
    setStoreState({})

    render(<GoogleDrivePanel />)

    expect(
      screen.getByRole('button', { name: /connect with google/i }),
    ).toBeTruthy()
  })

  it('triggers connect on button click', async () => {
    const user = userEvent.setup()
    render(<GoogleDrivePanel />)
    const connectBtn = screen.getByRole('button', {
      name: /connect with google/i,
    })
    await user.click(connectBtn)
    expect(connect).toHaveBeenCalledTimes(1)
  })
})

describe('GoogleDrivePanel — connected, no backup', () => {
  beforeEach(() => {
    setStoreState({
      connected: true,
      email: 'me@example.com',
    })
  })

  it('enables Restore so it can discover a backup from another device', async () => {
    const user = userEvent.setup()
    render(<GoogleDrivePanel />)
    const restoreBtn = screen.getByRole('button', { name: /^Restore$/i })
    expect((restoreBtn as HTMLButtonElement).disabled).toBe(false)
    await user.click(restoreBtn)
    expect(await screen.findByText(/replace all current data/i)).toBeTruthy()
    expect(restore).not.toHaveBeenCalled()
  })

  it('shows the account email', () => {
    render(<GoogleDrivePanel />)
    expect(screen.getByText('me@example.com')).toBeTruthy()
    expect(screen.getByText(/visible daybox\.json/i)).toBeTruthy()
    expect(screen.getByText(/restore searches google drive root/i)).toBeTruthy()
  })
})

describe('GoogleDrivePanel — connected, with backup', () => {
  beforeEach(() => {
    setStoreState({
      connected: true,
      email: 'me@example.com',
      dayboxFileId: 'file-id',
      backupFileSpace: 'drive-root',
      lastBackupAt: new Date(Date.now() - 60_000).toISOString(),
    })
  })

  it('shows a confirmation dialog on Back up click and does not call backup immediately', async () => {
    const user = userEvent.setup()
    render(<GoogleDrivePanel />)
    const backupBtn = screen.getByRole('button', { name: /^Back up$/i })
    await user.click(backupBtn)
    expect(await screen.findByText(/overwrite your cloud backup/i)).toBeTruthy()
    expect(backup).not.toHaveBeenCalled()
  })

  it('calls backup only after confirming the dialog', async () => {
    const user = userEvent.setup()
    render(<GoogleDrivePanel />)
    const backupBtn = screen.getByRole('button', { name: /^Back up$/i })
    await user.click(backupBtn)
    await screen.findByText(/overwrite your cloud backup/i)
    const continueBtn = screen.getByRole('button', { name: /^Continue$/i })
    await user.click(continueBtn)
    expect(backup).toHaveBeenCalledTimes(1)
  })

  it('does not call backup when the dialog is cancelled', async () => {
    const user = userEvent.setup()
    render(<GoogleDrivePanel />)
    const backupBtn = screen.getByRole('button', { name: /^Back up$/i })
    await user.click(backupBtn)
    await screen.findByText(/overwrite your cloud backup/i)
    const cancelBtn = screen.getByRole('button', { name: /^Cancel$/i })
    await user.click(cancelBtn)
    expect(backup).not.toHaveBeenCalled()
  })

  it('gates restore on a confirmation dialog', async () => {
    const user = userEvent.setup()
    render(<GoogleDrivePanel />)
    const restoreBtn = screen.getByRole('button', { name: /^Restore$/i })
    expect((restoreBtn as HTMLButtonElement).disabled).toBe(false)
    await user.click(restoreBtn)
    expect(await screen.findByText(/replace all current data/i)).toBeTruthy()
    expect(restore).not.toHaveBeenCalled()
  })

  it('clears persisted state on Disconnect', async () => {
    const user = userEvent.setup()
    render(<GoogleDrivePanel />)
    const disconnectBtn = screen.getByRole('button', {
      name: /^Disconnect$/i,
    })
    await user.click(disconnectBtn)
    expect(disconnect).toHaveBeenCalledTimes(1)
  })

  it('shows an authorization message when token reacquisition is denied', () => {
    setStoreState({
      connected: true,
      email: 'me@example.com',
      error: { kind: 'denied' },
    })

    render(<GoogleDrivePanel />)

    expect(screen.getByText(/google authorization is required/i)).toBeTruthy()
  })

  it('shows an authorization message when the Drive API rejects a stale token', () => {
    setStoreState({
      connected: true,
      email: 'me@example.com',
      error: { kind: 'token-expired' },
    })

    render(<GoogleDrivePanel />)

    expect(screen.getByText(/google authorization is required/i)).toBeTruthy()
  })
})

describe('GoogleDrivePanel — connected, old hidden backup id', () => {
  beforeEach(() => {
    setStoreState({
      connected: true,
      email: 'me@example.com',
      dayboxFileId: 'old-hidden-file-id',
    })
  })

  it('enables Restore and treats an old unmarked appDataFolder id as a discovery case', () => {
    render(<GoogleDrivePanel />)
    const restoreBtn = screen.getByRole('button', { name: /^Restore$/i })
    expect((restoreBtn as HTMLButtonElement).disabled).toBe(false)
  })
})

describe('GoogleDrivePanel — not configured', () => {
  it('shows the not-configured message', () => {
    setStoreState({ error: { kind: 'not-configured' } })
    render(<GoogleDrivePanel />)
    expect(screen.getByText(/not configured for this build/i)).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: /connect with google/i }),
    ).toBeNull()
  })
})
