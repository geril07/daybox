import { afterEach, expect, it, vi } from 'vitest'

import { timerStorage, useTimerStore } from '@/modules/timer'

import { reloadApp } from './reloadApp'

afterEach(() => {
  timerStorage.flush()
  vi.unstubAllGlobals()
})

it('flushes the latest timer state before reloading', () => {
  const reload = vi.fn(() => {
    const saved = JSON.parse(localStorage.getItem('daybox-timer') ?? '{}')
    expect(saved.state.elapsed).toBe(12_345)
  })
  vi.stubGlobal('location', { reload })
  useTimerStore.setState({ elapsed: 12_345 })
  reloadApp()
  expect(reload).toHaveBeenCalledTimes(1)
})
