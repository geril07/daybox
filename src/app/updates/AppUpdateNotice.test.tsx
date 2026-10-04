import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppUpdateNotice } from './AppUpdateNotice'
import { reloadApp } from './reloadApp'
import { watchForAppUpdate } from './watchForAppUpdate'

vi.mock('./watchForAppUpdate', () => ({ watchForAppUpdate: vi.fn() }))
vi.mock('./reloadApp', () => ({ reloadApp: vi.fn() }))

let announce: (buildId: string | null) => void
const stop = vi.fn()

beforeEach(() => {
  sessionStorage.clear()
  vi.clearAllMocks()
  vi.stubEnv('PROD', true)
  vi.mocked(watchForAppUpdate).mockImplementation((_id, callback) => {
    announce = callback
    return stop
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
})

describe('app update notice', () => {
  it('does not check for deployments in development', () => {
    vi.stubEnv('PROD', false)
    render(<AppUpdateNotice />)
    expect(watchForAppUpdate).not.toHaveBeenCalled()
  })

  it('shows one notice without taking focus or reloading; only Reload triggers reload', async () => {
    const user = userEvent.setup()
    render(
      <StrictMode>
        <button>Current task</button>
        <AppUpdateNotice />
      </StrictMode>,
    )
    const current = screen.getByRole('button', { name: 'Current task' })
    current.focus()
    act(() => announce('build-b'))
    expect(await screen.findByRole('button', { name: 'Reload' })).toBeVisible()
    expect(current).toHaveFocus()
    expect(reloadApp).not.toHaveBeenCalled()
    act(() => announce('build-b'))
    expect(screen.getAllByRole('button', { name: 'Reload' })).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Reload' }))
    expect(reloadApp).toHaveBeenCalledTimes(1)
  })

  it('remembers Later across remounts in this tab, but shows a different build', async () => {
    const user = userEvent.setup()
    const view = render(<AppUpdateNotice />)
    act(() => announce('build-b'))
    await user.click(await screen.findByRole('button', { name: 'Later' }))
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Reload' }),
      ).not.toBeInTheDocument(),
    )
    expect(reloadApp).not.toHaveBeenCalled()
    view.unmount()

    render(<AppUpdateNotice />)
    act(() => announce('build-b'))
    expect(
      screen.queryByRole('button', { name: 'Reload' }),
    ).not.toBeInTheDocument()
    act(() => announce('build-c'))
    expect(await screen.findByRole('button', { name: 'Reload' })).toBeVisible()
  })

  it('replaces pending builds and clears the notice when the deployment matches again', async () => {
    render(<AppUpdateNotice />)
    act(() => announce('build-b'))
    act(() => announce('build-c'))
    expect(screen.getAllByRole('button', { name: 'Reload' })).toHaveLength(1)
    act(() => announce(null))
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Reload' }),
      ).not.toBeInTheDocument(),
    )
    expect(reloadApp).not.toHaveBeenCalled()
  })

  it('does not auto-dismiss while idle', async () => {
    vi.useFakeTimers()
    try {
      render(<AppUpdateNotice />)
      act(() => announce('build-b'))
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60_000)
      })
      expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
      expect(reloadApp).not.toHaveBeenCalled()
      fireEvent.click(screen.getByRole('button', { name: 'Later' }))
    } finally {
      cleanup()
      vi.useRealTimers()
    }
  })
})
