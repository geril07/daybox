import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import {
  buildSnapshot,
  commitSnapshotImport,
  prepareSnapshotImport,
} from '@/modules/data-portability'
import {
  downloadDriveFile,
  findDriveRootFile,
  uploadDriveRootFile,
} from '@/shared/google-drive/drive-api'
import {
  disconnectAuth,
  refreshAccessToken,
  startAuth,
} from '@/shared/google-drive/server-auth'
import { createValidatedRehydrate } from '@/shared/utils/persistence'

import { GoogleDriveAuthSchema, classifyDriveError } from './schema'
import type { BackupError, GoogleDriveAuth } from './types'

const BACKUP_FILENAME = 'daybox.json'
const BACKUP_FILE_SPACE = 'drive-root'
const TOKEN_SAFETY_MARGIN_MS = 60_000

type PersistedSlice = GoogleDriveAuth

const PersistedSliceSchema = GoogleDriveAuthSchema

type RuntimeState = {
  status: 'idle' | 'connecting' | 'backing-up' | 'restoring'
  error: BackupError | null
  connected: boolean
  email: string | null
  accessToken: string | undefined
  expiresAt: number | undefined
}

interface GoogleDriveActions {
  connect: () => void
  disconnect: () => Promise<void>
  backup: () => Promise<
    { ok: true; warnings?: string[] } | { ok: false; error: BackupError }
  >
  restore: () => Promise<
    { ok: true; warnings?: string[] } | { ok: false; error: BackupError }
  >
  clearError: () => void
  hydrateFromStatus: (status: {
    connected: boolean
    email: string | null
  }) => void
}

export type GoogleDriveStore = PersistedSlice &
  RuntimeState &
  GoogleDriveActions

const googleDriveInit: RuntimeState = {
  status: 'idle',
  error: null,
  connected: false,
  email: null,
  accessToken: undefined,
  expiresAt: undefined,
}

async function ensureActionToken(
  get: () => GoogleDriveStore,
  set: (partial: Partial<GoogleDriveStore>) => void,
): Promise<string> {
  const state = get()
  if (
    state.accessToken &&
    state.expiresAt &&
    state.expiresAt > Date.now() + TOKEN_SAFETY_MARGIN_MS
  ) {
    return state.accessToken
  }
  const { accessToken, expiresIn } = await refreshAccessToken()
  set({
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000,
  })
  return accessToken
}

export const useGoogleDriveStore = create<GoogleDriveStore>()(
  persist(
    (set, get) => ({
      ...googleDriveInit,

      clearError: () => set({ error: null }),

      hydrateFromStatus: ({ connected, email }) => {
        set({ connected, email })
      },

      connect: () => {
        set({ status: 'connecting', error: null })
        startAuth()
      },

      disconnect: async () => {
        try {
          await disconnectAuth()
        } catch (err) {
          // Best-effort: still clear local state even if server-side revoke failed.
          console.warn('Disconnect failed on server:', err)
        }
        set({
          accessToken: undefined,
          expiresAt: undefined,
          email: null,
          dayboxFileId: undefined,
          backupFileSpace: undefined,
          lastBackupAt: undefined,
          connected: false,
          status: 'idle',
          error: null,
        })
      },

      backup: async () => {
        set({ status: 'backing-up', error: null })
        try {
          const token = await ensureActionToken(get, set)
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
          const error = classifyDriveError(err)
          set({ status: 'idle', error })
          return { ok: false, error }
        }
      },

      restore: async () => {
        set({ status: 'restoring', error: null })
        try {
          const token = await ensureActionToken(get, set)
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
          const error = classifyDriveError(err)
          set({ status: 'idle', error })
          return { ok: false, error }
        }
      },
    }),
    {
      name: 'daybox-google-drive',
      partialize: (state: GoogleDriveStore) => ({
        dayboxFileId: state.dayboxFileId,
        backupFileSpace: state.backupFileSpace,
        lastBackupAt: state.lastBackupAt,
      }),
      version: 2,
      migrate: (persisted) => {
        if (!persisted || typeof persisted !== 'object') return persisted
        const state = persisted as PersistedSlice
        return {
          dayboxFileId: state.dayboxFileId,
          backupFileSpace: state.backupFileSpace,
          lastBackupAt: state.lastBackupAt,
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
