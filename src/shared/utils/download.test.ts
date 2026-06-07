import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { downloadAsFile } from './download'

type CreateObjectURL = typeof URL.createObjectURL
type RevokeObjectURL = typeof URL.revokeObjectURL

let createObjectURL: ReturnType<typeof vi.fn>
let revokeObjectURL: ReturnType<typeof vi.fn>
let originalCreate: CreateObjectURL
let originalRevoke: RevokeObjectURL

beforeEach(() => {
  createObjectURL = vi.fn()
  revokeObjectURL = vi.fn()
  originalCreate = URL.createObjectURL
  originalRevoke = URL.revokeObjectURL
  createObjectURL.mockImplementation(() => 'blob:mock-url')
  URL.createObjectURL = createObjectURL as unknown as CreateObjectURL
  URL.revokeObjectURL = revokeObjectURL as unknown as RevokeObjectURL
})

afterEach(() => {
  URL.createObjectURL = originalCreate
  URL.revokeObjectURL = originalRevoke
})

describe('downloadAsFile', () => {
  it('constructs a JSON Blob and triggers a download with the given filename', () => {
    const click = vi.fn()
    const a = {
      href: '',
      download: '',
      click,
    } as unknown as HTMLAnchorElement
    const createElement = vi
      .spyOn(document, 'createElement')
      .mockImplementation(() => a)

    const blobSpy = vi.spyOn(globalThis, 'Blob')

    downloadAsFile('{"hello":"world"}', 'daybox.json')

    expect(blobSpy).toHaveBeenCalledTimes(1)
    const [content, init] = blobSpy.mock.calls[0]
    expect(content).toEqual(['{"hello":"world"}'])
    expect(init).toEqual({ type: 'application/json' })

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(createElement).toHaveBeenCalledWith('a')
    expect(a.href).toBe('blob:mock-url')
    expect(a.download).toBe('daybox.json')
    expect(click).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')

    blobSpy.mockRestore()
    createElement.mockRestore()
  })
})
