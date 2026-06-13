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

function setStoreState(partial: {
  accessToken?: string
  expiresAt?: number
  email?: string
  dayboxFileId?: string
  backupFileSpace?: 'drive-root'
  lastBackupAt?: string
  error?: ReturnType<typeof useGoogleDriveStore.getState>['error']
}) {
  useGoogleDriveStore.setState({
    accessToken: partial.accessToken,
    expiresAt: partial.expiresAt,
    email: partial.email,
    dayboxFileId: partial.dayboxFileId,
    backupFileSpace: partial.backupFileSpace,
    lastBackupAt: partial.lastBackupAt,
    error: partial.error ?? null,
    status: 'idle',
  })
}

beforeEach(() => {
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id')
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
  useGoogleDriveStore.setState({
    connect: connect as never,
    disconnect: disconnect as never,
    backup: backup as never,
    restore: restore as never,
    clearError: clearError as never,
  })
  backup.mockReset().mockResolvedValue({ ok: true })
  restore.mockReset().mockResolvedValue({ ok: true })
  connect.mockReset()
  disconnect.mockReset()
  clearError.mockReset()
})

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
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
})

describe('GoogleDrivePanel — connected, no backup', () => {
  beforeEach(() => {
    setStoreState({
      accessToken: 'tok',
      expiresAt: Date.now() + 60 * 60_000,
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
      accessToken: 'tok',
      expiresAt: Date.now() + 60 * 60_000,
      email: 'me@example.com',
      dayboxFileId: 'file-id',
      backupFileSpace: 'drive-root',
      lastBackupAt: new Date(Date.now() - 60_000).toISOString(),
    })
  })

  it('calls backup on Back up click and updates lastBackupAt display', async () => {
    const user = userEvent.setup()
    render(<GoogleDrivePanel />)
    const backupBtn = screen.getByRole('button', { name: /^Back up$/i })
    await user.click(backupBtn)
    expect(backup).toHaveBeenCalledTimes(1)
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
})

describe('GoogleDrivePanel — connected, old hidden backup id', () => {
  beforeEach(() => {
    setStoreState({
      accessToken: 'tok',
      expiresAt: Date.now() + 60 * 60_000,
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
