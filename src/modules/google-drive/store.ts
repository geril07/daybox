import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import {
  buildSnapshot,
  commitSnapshotImport,
  prepareSnapshotImport,
} from '@/modules/data-portability'
import {
  createTokenClient,
  loadGoogleIdentityScript,
  type TokenResponse,
} from '@/shared/google-drive/client'
import {
  downloadDriveFile,
  findDriveRootFile,
  getUserEmail,
  uploadDriveRootFile,
} from '@/shared/google-drive/drive-api'
import { createValidatedRehydrate } from '@/shared/utils/persistence'

import { GoogleDriveAuthSchema, classifyDriveError } from './schema'
import type { BackupError, GoogleDriveAuth } from './types'

const BACKUP_FILENAME = 'daybox.json'
const BACKUP_FILE_SPACE = 'drive-root'
const TOKEN_SAFETY_MARGIN_MS = 60_000

type PersistedSlice = Partial<GoogleDriveAuth>

const PersistedSliceSchema = GoogleDriveAuthSchema.partial()

type RuntimeState = {
  status: 'idle' | 'connecting' | 'backing-up' | 'restoring'
  error: BackupError | null
}

interface GoogleDriveActions {
  connect: () => Promise<void>
  disconnect: () => void
  backup: () => Promise<
    { ok: true; warnings?: string[] } | { ok: false; error: BackupError }
  >
  restore: () => Promise<
    { ok: true; warnings?: string[] } | { ok: false; error: BackupError }
  >
  clearError: () => void
}

export type GoogleDriveStore = PersistedSlice &
  RuntimeState &
  GoogleDriveActions

const googleDriveInit: RuntimeState = {
  status: 'idle',
  error: null,
}

function isClientConfigured(): boolean {
  const id = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
  return Boolean(id && id.length > 0)
}

function hasFreshToken(
  state: PersistedSlice,
): state is PersistedSlice &
  Required<Pick<PersistedSlice, 'accessToken' | 'expiresAt'>> {
  return Boolean(
    state.accessToken &&
    state.expiresAt &&
    state.expiresAt > Date.now() + TOKEN_SAFETY_MARGIN_MS,
  )
}

async function ensureFreshToken(
  state: PersistedSlice,
  setPersisted: (partial: PersistedSlice) => void,
): Promise<string> {
  if (hasFreshToken(state)) {
    return state.accessToken
  }
  return new Promise<string>((resolve, reject) => {
    const onToken = (response: TokenResponse) => {
      setPersisted({
        accessToken: response.access_token,
        expiresAt: Date.now() + response.expires_in * 1000,
      })
      resolve(response.access_token)
    }
    const onError = (err: { type?: string; message?: string }) => {
      if (err.type === 'user_denied' || err.type === 'access_denied') {
        reject(new Error('denied'))
      } else {
        reject(new Error(err.message ?? 'OAuth error'))
      }
    }
    try {
      const client = createTokenClient({ onToken, onError })
      client.requestAccessToken({ prompt: '' })
    } catch (e) {
      reject(e)
    }
  })
}

export const useGoogleDriveStore = create<GoogleDriveStore>()(
  persist(
    (set, get) => ({
      ...googleDriveInit,

      clearError: () => set({ error: null }),

      connect: async () => {
        if (!isClientConfigured()) {
          set({ error: { kind: 'not-configured' } })
          return
        }
        set({ status: 'connecting', error: null })
        try {
          await loadGoogleIdentityScript()
          const token = await ensureFreshToken(get(), (p) => set(p))
          try {
            const email = await getUserEmail({ token })
            if (email) set({ email })
          } catch {
            set({})
          }
          set({ status: 'idle' })
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          if (message === 'denied') {
            set({ status: 'idle', error: { kind: 'denied' } })
          } else {
            set({ status: 'idle', error: classifyDriveError(err) })
          }
        }
      },

      disconnect: () => {
        set({
          accessToken: undefined,
          expiresAt: undefined,
          email: undefined,
          dayboxFileId: undefined,
          backupFileSpace: undefined,
          lastBackupAt: undefined,
          status: 'idle',
          error: null,
        })
      },

      backup: async () => {
        if (!isClientConfigured()) {
          const error: BackupError = { kind: 'not-configured' }
          set({ error })
          return { ok: false, error }
        }
        set({ status: 'backing-up', error: null })
        try {
          const token = await ensureFreshToken(get(), (p) => set(p))
          if (!get().email) {
            try {
              const email = await getUserEmail({ token })
              if (email) set({ email })
            } catch {
              set({})
            }
          }
          const snapshotResult = buildSnapshot()
          if (!snapshotResult.ok) {
            const error = {
              kind: 'unknown' as const,
              message: snapshotResult.reason,
            }
            set({ status: 'idle', error })
            return { ok: false, error }
          }
          const content = JSON.stringify(snapshotResult.value)
          let existingId =
            get().backupFileSpace === BACKUP_FILE_SPACE
              ? get().dayboxFileId
              : undefined
          if (!existingId) {
            existingId =
              (await findDriveRootFile({ token, name: BACKUP_FILENAME })) ??
              undefined
          }
          const { id } = await uploadDriveRootFile({
            token,
            name: BACKUP_FILENAME,
            content,
            existingId,
          })
          set({
            dayboxFileId: id,
            backupFileSpace: BACKUP_FILE_SPACE,
            lastBackupAt: new Date().toISOString(),
            status: 'idle',
          })
          return { ok: true }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          if (message === 'denied') {
            const error: BackupError = { kind: 'denied' }
            set({ status: 'idle', error })
            return { ok: false, error }
          }
          const error = classifyDriveError(err)
          set({ status: 'idle', error })
          return { ok: false, error }
        }
      },

      restore: async () => {
        if (!isClientConfigured()) {
          const error: BackupError = { kind: 'not-configured' }
          set({ error })
          return { ok: false, error }
        }
        set({ status: 'restoring', error: null })
        try {
          const token = await ensureFreshToken(get(), (p) => set(p))
          let fileId =
            get().backupFileSpace === BACKUP_FILE_SPACE
              ? get().dayboxFileId
              : undefined
          let discoveredFileId: string | undefined
          if (!fileId) {
            fileId =
              (await findDriveRootFile({ token, name: BACKUP_FILENAME })) ??
              undefined
            discoveredFileId = fileId
          }
          if (!fileId) {
            const error: BackupError = { kind: 'not-found' }
            set({ status: 'idle', error })
            return { ok: false, error }
          }
          const json = await downloadDriveFile({ token, id: fileId })
          const prepared = prepareSnapshotImport(json)
          if (!prepared.ok) {
            const error: BackupError = {
              kind: 'envelope',
              message: prepared.reason,
            }
            set({ status: 'idle', error })
            return { ok: false, error }
          }
          commitSnapshotImport(prepared.snapshot)
          set({
            status: 'idle',
            ...(discoveredFileId
              ? {
                  dayboxFileId: discoveredFileId,
                  backupFileSpace: BACKUP_FILE_SPACE,
                }
              : {}),
          })
          return { ok: true, warnings: prepared.warnings }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          if (message === 'denied') {
            const error: BackupError = { kind: 'denied' }
            set({ status: 'idle', error })
            return { ok: false, error }
          }
          const error = classifyDriveError(err)
          set({ status: 'idle', error })
          return { ok: false, error }
        }
      },
    }),
    {
      name: 'daybox-google-drive',
      partialize: (state: GoogleDriveStore) => ({
        accessToken: state.accessToken,
        expiresAt: state.expiresAt,
        email: state.email,
        dayboxFileId: state.dayboxFileId,
        backupFileSpace: state.backupFileSpace,
        lastBackupAt: state.lastBackupAt,
      }),
      version: 1,
      migrate: (persisted) => {
        if (!persisted || typeof persisted !== 'object') return persisted
        const state = persisted as PersistedSlice
        return {
          ...state,
          accessToken: undefined,
          expiresAt: undefined,
          dayboxFileId: undefined,
          backupFileSpace: undefined,
          lastBackupAt: undefined,
        }
      },
      onRehydrateStorage: createValidatedRehydrate<GoogleDriveStore>({
        name: 'daybox-google-drive',
        schema: PersistedSliceSchema,
        init: googleDriveInit,
      }),
    },
  ),
)
