import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useLayoutSnap } from './motion'

describe('useLayoutSnap', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns snapLayout=false initially', () => {
    const { result } = renderHook(() => useLayoutSnap())
    expect(result.current.snapLayout).toBe(false)
    expect(typeof result.current.snap).toBe('function')
  })

  it('flips snapLayout to true when snap is called', () => {
    const { result } = renderHook(() => useLayoutSnap())
    act(() => {
      result.current.snap(() => {})
    })
    expect(result.current.snapLayout).toBe(true)
  })

  it('runs the applyChange callback inside flushSync', () => {
    const applyChange = vi.fn()
    const { result } = renderHook(() => useLayoutSnap())
    act(() => {
      result.current.snap(applyChange)
    })
    expect(applyChange).toHaveBeenCalledTimes(1)
  })

  it('resets snapLayout to false after a frame', async () => {
    const { result } = renderHook(() => useLayoutSnap())
    act(() => {
      result.current.snap(() => {})
    })
    expect(result.current.snapLayout).toBe(true)
    await act(async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 50))
    })
    expect(result.current.snapLayout).toBe(false)
  })

  it('cancels the reset rAF on unmount', () => {
    const cancelSpy = vi.spyOn(globalThis, 'cancelAnimationFrame')
    const { result, unmount } = renderHook(() => useLayoutSnap())
    act(() => {
      result.current.snap(() => {})
    })
    cancelSpy.mockClear()
    unmount()
    expect(cancelSpy).toHaveBeenCalled()
  })

  it('a second snap call during the snap window does not nest rAFs', () => {
    const applyChange = vi.fn()
    const { result } = renderHook(() => useLayoutSnap())
    act(() => {
      result.current.snap(applyChange)
    })
    expect(applyChange).toHaveBeenCalledTimes(1)
    expect(result.current.snapLayout).toBe(true)
    act(() => {
      result.current.snap(applyChange)
    })
    expect(applyChange).toHaveBeenCalledTimes(2)
    expect(result.current.snapLayout).toBe(true)
  })
})
