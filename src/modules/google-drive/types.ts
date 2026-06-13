import type { z } from 'zod'

import type { BackupErrorSchema, GoogleDriveAuthSchema } from './schema'

export type GoogleDriveAuth = z.infer<typeof GoogleDriveAuthSchema>
export type BackupError = z.infer<typeof BackupErrorSchema>
