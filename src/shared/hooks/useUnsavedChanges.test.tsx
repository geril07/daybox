import { cleanup, renderHook } from '@testing-library/react'
import { StrictMode, type ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { requestsUnloadConfirmation } from '@/test-utils/beforeUnload'

import { useUnsavedChanges } from './useUnsavedChanges'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('useUnsavedChanges', () => {
  it('attaches a warning only while dirty and removes it on cleanup', () => {
    const { rerender, unmount } = renderHook(
      (dirty) => useUnsavedChanges(dirty),
      { initialProps: false },
    )
    expect(requestsUnloadConfirmation()).toBe(false)
    rerender(true)
    expect(requestsUnloadConfirmation()).toBe(true)
    rerender(false)
    expect(requestsUnloadConfirmation()).toBe(false)
    rerender(true)
    unmount()
    expect(requestsUnloadConfirmation()).toBe(false)
  })

  it('shares one listener and keeps protecting other dirty editors', () => {
    const add = vi.spyOn(window, 'addEventListener')
    const remove = vi.spyOn(window, 'removeEventListener')
    const first = renderHook((dirty) => useUnsavedChanges(dirty), {
      initialProps: true,
    })
    const second = renderHook(() => useUnsavedChanges(true))
    expect(
      add.mock.calls.filter(([event]) => event === 'beforeunload'),
    ).toHaveLength(1)
    first.rerender(false)
    first.unmount()
    expect(requestsUnloadConfirmation()).toBe(true)
    expect(
      remove.mock.calls.filter(([event]) => event === 'beforeunload'),
    ).toHaveLength(0)
    second.unmount()
    expect(requestsUnloadConfirmation()).toBe(false)
    expect(
      remove.mock.calls.filter(([event]) => event === 'beforeunload'),
    ).toHaveLength(1)
  })

  it('does not leave a stale registration after Strict Mode setup and cleanup', () => {
    const { unmount } = renderHook(() => useUnsavedChanges(true), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <StrictMode>{children}</StrictMode>
      ),
    })
    expect(requestsUnloadConfirmation()).toBe(true)
    unmount()
    expect(requestsUnloadConfirmation()).toBe(false)
  })
})
