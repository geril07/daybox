import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { installNarrowViewportMatchMediaStub } from '@/test-utils/matchMedia'

import { TabLabel } from './TabLabel'
import { tabs } from './plannerTabs'

afterEach(() => {
  cleanup()
})

describe('planner tabs', () => {
  it('keeps the full This Week label for the week tab data', () => {
    const weekTab = tabs.find((tab) => tab.value === 'week')

    expect(weekTab?.label).toBe('This Week')
  })

  it('renders Week as the narrow This Week label', () => {
    const restoreMatchMedia = installNarrowViewportMatchMediaStub()
    const weekTab = tabs.find((tab) => tab.value === 'week')

    render(<TabLabel tab={weekTab!} />)

    const fullLabel = screen.getByText('This Week')
    const shortLabel = screen.getByText('Week')

    expect(fullLabel.className).toContain('hidden sm:inline')
    expect(shortLabel.className).toContain('sm:hidden')

    restoreMatchMedia()
  })
})
