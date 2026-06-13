import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  DriveApiError,
  downloadDriveFile,
  findDriveRootFile,
  getUserEmail,
  uploadDriveRootFile,
} from './drive-api'

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('uploadDriveRootFile', () => {
  it('POSTs a multipart request when no existingId is given', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: 'new-id' }),
    })

    const result = await uploadDriveRootFile({
      token: 'tok',
      name: 'daybox.json',
      content: '{"hello":"world"}',
    })

    expect(result.id).toBe('new-id')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/uploadType=multipart$/)
    expect((init as RequestInit).method).toBe('POST')
    const headers = (init as RequestInit).headers as Record<string, string>
    expect(headers['Content-Type']).toMatch(/^multipart\/related; boundary=/)
    expect(headers['Authorization']).toBe('Bearer tok')
    const body = (init as RequestInit).body as string
    expect(body).toContain('"name":"daybox.json"')
    expect(body).toContain('"parents":["root"]')
    expect(body).toContain('{"hello":"world"}')
  })

  it('PATCHes the file by id when existingId is given', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    })

    const result = await uploadDriveRootFile({
      token: 'tok',
      name: 'daybox.json',
      content: '{"hello":"world"}',
      existingId: 'existing-id',
    })

    expect(result.id).toBe('existing-id')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/upload/drive/v3/files/existing-id')
    expect(url).toContain('uploadType=media')
    expect((init as RequestInit).method).toBe('PATCH')
  })
})

describe('downloadDriveFile', () => {
  it('returns the file content on success', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '{"hello":"world"}',
    })

    const content = await downloadDriveFile({
      token: 'tok',
      id: 'file-id',
    })
    expect(content).toBe('{"hello":"world"}')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/files/file-id')
    expect(url).toContain('alt=media')
    expect((init as RequestInit).headers).toEqual({
      Authorization: 'Bearer tok',
    })
  })

  it('surfaces a DriveApiError on 404', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 })

    await expect(
      downloadDriveFile({ token: 'tok', id: 'missing' }),
    ).rejects.toBeInstanceOf(DriveApiError)
  })
})

describe('findDriveRootFile', () => {
  it('returns the first file id when present', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ files: [{ id: 'found-id' }] }),
    })

    const id = await findDriveRootFile({ token: 'tok', name: 'daybox.json' })
    expect(id).toBe('found-id')
    const [url] = fetchMock.mock.calls[0]
    expect(url).toContain('spaces=drive')
    expect(decodeURIComponent(url as string)).toContain("'root' in parents")
    expect(url).toMatch(/name(%3D|=)/)
  })

  it('returns null when no file matches', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ files: [] }),
    })

    const id = await findDriveRootFile({ token: 'tok', name: 'daybox.json' })
    expect(id).toBeNull()
  })
})

describe('getUserEmail', () => {
  it('returns the email on success', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ email: 'me@example.com' }),
    })

    const email = await getUserEmail({ token: 'tok' })
    expect(email).toBe('me@example.com')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('userinfo')
    expect((init as RequestInit).headers).toEqual({
      Authorization: 'Bearer tok',
    })
  })

  it('returns null when the response has no email', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    })
    const email = await getUserEmail({ token: 'tok' })
    expect(email).toBeNull()
  })
})
