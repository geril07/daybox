import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'

import { requestsUnloadConfirmation } from '@/test-utils/beforeUnload'

import { SidebarGroupItem } from './SidebarGroupItem'

afterEach(cleanup)

it.each(['Enter', 'Escape'])(
  'protects group rename until reverted or ended with %s',
  async (key) => {
    const user = userEvent.setup()
    const onRename = vi.fn()
    render(
      <SidebarGroupItem
        group={{
          id: 'work',
          name: 'Work',
          color: '#123456',
          createdAt: new Date().toISOString(),
        }}
        isActive={false}
        isLast={false}
        onSelect={vi.fn()}
        onRename={onRename}
        onSetColor={vi.fn()}
        onDelete={vi.fn()}
        onResolveAndDelete={vi.fn()}
      />,
    )
    expect(requestsUnloadConfirmation()).toBe(false)
    await user.hover(screen.getByRole('button', { name: 'Work' }))
    fireEvent.click(screen.getByRole('button', { name: 'Group actions' }))
    await user.click(screen.getByRole('menuitem', { name: 'Rename' }))
    const input = screen.getByDisplayValue('Work')
    expect(requestsUnloadConfirmation()).toBe(false)
    fireEvent.change(input, { target: { value: '' } })
    expect(requestsUnloadConfirmation()).toBe(true)
    fireEvent.change(input, { target: { value: 'Work' } })
    expect(requestsUnloadConfirmation()).toBe(false)
    fireEvent.change(input, { target: { value: 'Personal' } })
    expect(requestsUnloadConfirmation()).toBe(true)
    fireEvent.keyDown(input, { key })
    expect(requestsUnloadConfirmation()).toBe(false)
    if (key === 'Enter')
      expect(onRename).toHaveBeenCalledWith('work', 'Personal')
    else expect(onRename).not.toHaveBeenCalled()
  },
)
