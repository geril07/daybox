const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files'
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files'
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

export class DriveApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'DriveApiError'
    this.status = status
  }
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` }
}

export interface UploadAppDataFileParams {
  token: string
  name: string
  content: string
  existingId?: string
}

export interface UploadAppDataFileResult {
  id: string
}

export async function uploadAppDataFile({
  token,
  name,
  content,
  existingId,
}: UploadAppDataFileParams): Promise<UploadAppDataFileResult> {
  if (existingId) {
    const url = `${DRIVE_UPLOAD_URL}/${existingId}?uploadType=media`
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      body: content,
    })
    if (!res.ok) {
      throw new DriveApiError(
        `Failed to update file on Drive (${res.status})`,
        res.status,
      )
    }
    return { id: existingId }
  }
  const boundary = `-------daybox${Date.now()}`
  const delimiter = `\r\n--${boundary}\r\n`
  const closeDelim = `\r\n--${boundary}--`
  const metadata = { name, parents: ['appDataFolder'] }
  const body =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    content +
    closeDelim
  const res = await fetch(`${DRIVE_UPLOAD_URL}?uploadType=multipart`, {
    method: 'POST',
    headers: {
      ...authHeaders(token),
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  })
  if (!res.ok) {
    throw new DriveApiError(
      `Failed to upload file to Drive (${res.status})`,
      res.status,
    )
  }
  const data = (await res.json()) as { id?: string }
  if (!data.id) {
    throw new DriveApiError('Drive response did not include a file id.', 0)
  }
  return { id: data.id }
}

export interface DownloadAppDataFileParams {
  token: string
  id: string
}

export async function downloadAppDataFile({
  token,
  id,
}: DownloadAppDataFileParams): Promise<string> {
  const res = await fetch(`${DRIVE_FILES_URL}/${id}?alt=media`, {
    headers: authHeaders(token),
  })
  if (!res.ok) {
    throw new DriveApiError(
      `Failed to download file from Drive (${res.status})`,
      res.status,
    )
  }
  return res.text()
}

export interface FindAppDataFileParams {
  token: string
  name: string
}

export async function findAppDataFile({
  token,
  name,
}: FindAppDataFileParams): Promise<string | null> {
  const q = encodeURIComponent(
    `name='${name.replace(/'/g, "\\'")}' and 'appDataFolder' in parents and trashed=false`,
  )
  const res = await fetch(
    `${DRIVE_FILES_URL}?spaces=appDataFolder&q=${q}&fields=files(id)`,
    { headers: authHeaders(token) },
  )
  if (!res.ok) {
    throw new DriveApiError(
      `Failed to list Drive appDataFolder (${res.status})`,
      res.status,
    )
  }
  const data = (await res.json()) as { files?: { id: string }[] }
  return data.files?.[0]?.id ?? null
}

export interface GetUserEmailParams {
  token: string
}

export async function getUserEmail({
  token,
}: GetUserEmailParams): Promise<string | null> {
  const res = await fetch(USERINFO_URL, { headers: authHeaders(token) })
  if (!res.ok) {
    throw new DriveApiError(
      `Failed to fetch user info (${res.status})`,
      res.status,
    )
  }
  const data = (await res.json()) as { email?: string }
  return data.email ?? null
}
