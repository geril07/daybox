import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, expect, it } from 'vitest'

import { requestsUnloadConfirmation } from '@/test-utils/beforeUnload'

import { SidebarAddGroupInput } from './SidebarAddGroupInput'

afterEach(cleanup)

function GroupEditor() {
  const [open, setOpen] = useState(true)
  return <SidebarAddGroupInput open={open} onClose={() => setOpen(false)} />
}

it.each(['Enter', 'Escape'])(
  'clears the warning after group creation ends with %s',
  (key) => {
    render(<GroupEditor />)
    const input = screen.getByPlaceholderText('Add group...')
    expect(requestsUnloadConfirmation()).toBe(false)
    fireEvent.change(input, { target: { value: ' ' } })
    expect(requestsUnloadConfirmation()).toBe(false)
    fireEvent.change(input, { target: { value: 'New group' } })
    expect(requestsUnloadConfirmation()).toBe(true)
    fireEvent.keyDown(input, { key })
    expect(requestsUnloadConfirmation()).toBe(false)
  },
)
