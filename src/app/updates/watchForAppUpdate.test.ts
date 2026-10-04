import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { watchForAppUpdate } from './watchForAppUpdate'

const fetchMock = vi.fn<typeof fetch>()
let stop: (() => void) | undefined

function respond(buildId: string) {
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ buildId })))
}

function visibility(value: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value,
  })
  document.dispatchEvent(new Event('visibilitychange'))
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
  visibility('visible')
})

afterEach(() => {
  stop?.()
  stop = undefined
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('app update detection', () => {
  it('compares opaque IDs, detects rollbacks, and clears an obsolete notice', async () => {
    const onVersion = vi.fn()
    respond('current')
    stop = watchForAppUpdate('current', onVersion)
    await vi.advanceTimersByTimeAsync(0)
    expect(onVersion).toHaveBeenLastCalledWith(null)
    expect(fetchMock).toHaveBeenCalledWith(
      '/version.json',
      expect.objectContaining({ cache: 'no-store' }),
    )

    respond('older-deployment')
    await vi.advanceTimersByTimeAsync(5 * 60_000)
    expect(onVersion).toHaveBeenLastCalledWith('older-deployment')

    respond('current')
    await vi.advanceTimersByTimeAsync(5 * 60_000)
    expect(onVersion).toHaveBeenLastCalledWith(null)
  })

  it('skips hidden tabs and rate-limits focus, visibility, and online checks', async () => {
    visibility('hidden')
    respond('next')
    stop = watchForAppUpdate('current', vi.fn())
    await vi.advanceTimersByTimeAsync(5 * 60_000)
    expect(fetchMock).not.toHaveBeenCalled()

    visibility('visible')
    await vi.advanceTimersByTimeAsync(0)
    window.dispatchEvent(new Event('focus'))
    window.dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(60_000)
    window.dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it.each([
    new Response('<html>SPA fallback</html>'),
    new Response(JSON.stringify({ buildId: '' })),
    new Response(JSON.stringify({ other: 'value' })),
    new Response('unavailable', { status: 503 }),
  ])(
    'ignores unusable metadata and recovers on the next check',
    async (response) => {
      const onVersion = vi.fn()
      fetchMock.mockResolvedValueOnce(response)
      stop = watchForAppUpdate('current', onVersion)
      await vi.advanceTimersByTimeAsync(0)
      expect(onVersion).not.toHaveBeenCalled()

      respond('next')
      await vi.advanceTimersByTimeAsync(5 * 60_000)
      expect(onVersion).toHaveBeenCalledWith('next')
    },
  )

  it('recovers after a network error without clearing an existing notice', async () => {
    const onVersion = vi.fn()
    fetchMock.mockRejectedValueOnce(new TypeError('offline'))
    stop = watchForAppUpdate('current', onVersion)
    await vi.advanceTimersByTimeAsync(0)
    expect(onVersion).not.toHaveBeenCalled()
    respond('next')
    await vi.advanceTimersByTimeAsync(5 * 60_000)
    expect(onVersion).toHaveBeenCalledWith('next')
    fetchMock.mockRejectedValueOnce(new TypeError('offline'))
    await vi.advanceTimersByTimeAsync(5 * 60_000)
    expect(onVersion).toHaveBeenCalledTimes(1)
  })

  it('aborts stalled requests and retries without overlapping requests', async () => {
    fetchMock.mockImplementationOnce(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          )
        }),
    )
    const onVersion = vi.fn()
    stop = watchForAppUpdate('current', onVersion)
    window.dispatchEvent(new Event('focus'))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(15_000)
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true)
    respond('next')
    await vi.advanceTimersByTimeAsync(5 * 60_000)
    expect(onVersion).toHaveBeenCalledWith('next')
  })

  it('aborts and ignores late results after cleanup', async () => {
    let resolve!: (response: Response) => void
    fetchMock.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done
      }),
    )
    const onVersion = vi.fn()
    stop = watchForAppUpdate('current', onVersion)
    stop()
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true)
    resolve(new Response(JSON.stringify({ buildId: 'next' })))
    await vi.advanceTimersByTimeAsync(10 * 60_000)
    window.dispatchEvent(new Event('focus'))
    visibility('visible')
    expect(onVersion).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
