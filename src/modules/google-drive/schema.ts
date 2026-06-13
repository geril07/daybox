import { z } from 'zod'

import { DriveApiError } from '@/shared/google-drive/drive-api'

export const GoogleDriveAuthSchema = z.object({
  accessToken: z.string(),
  expiresAt: z.number().int().positive(),
  email: z.string().email().optional(),
  dayboxFileId: z.string().optional(),
  backupFileSpace: z.literal('drive-root').optional(),
  lastBackupAt: z.string().optional(),
})

export const BackupErrorSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('not-configured') }),
  z.object({
    kind: z.literal('script-load'),
    message: z.string(),
  }),
  z.object({
    kind: z.literal('network'),
    status: z.number().optional(),
    message: z.string(),
  }),
  z.object({
    kind: z.literal('not-found'),
  }),
  z.object({
    kind: z.literal('envelope'),
    message: z.string(),
  }),
  z.object({
    kind: z.literal('token-expired'),
  }),
  z.object({
    kind: z.literal('denied'),
  }),
  z.object({
    kind: z.literal('unknown'),
    message: z.string(),
  }),
])

export function classifyDriveError(
  err: unknown,
): z.infer<typeof BackupErrorSchema> {
  if (err instanceof DriveApiError) {
    if (err.status === 404) return { kind: 'not-found' }
    if (err.status === 401) return { kind: 'token-expired' }
    return { kind: 'network', status: err.status, message: err.message }
  }
  if (err instanceof Error) {
    const message = err.message
    if (message.toLowerCase().includes('identity services')) {
      return { kind: 'script-load', message }
    }
    if (message.toLowerCase().includes('vite_google_client_id')) {
      return { kind: 'not-configured' }
    }
    return { kind: 'unknown', message }
  }
  return { kind: 'unknown', message: String(err) }
}
