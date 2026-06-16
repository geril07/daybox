import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useGroupStore } from '@/modules/groups'

import { Sidebar } from './Sidebar'
import { sidebarViews } from './sidebarViews'

beforeEach(() => {
  useGroupStore.setState({
    groups: [
      {
        id: 'default',
        name: 'General',
        color: 'oklch(0.545 0.185 28)',
        createdAt: new Date().toISOString(),
      },
    ],
    stickyGroupId: null,
  })
})

afterEach(() => {
  cleanup()
})

describe('sidebar views', () => {
  it('includes the five view items in expected order', () => {
    const labels = sidebarViews.map((v) => v.label)
    expect(labels).toEqual([
      'Today',
      'Tomorrow',
      'This Week',
      'Later',
      'Unscheduled',
    ])
  })

  it('each view has a unique value', () => {
    const values = sidebarViews.map((v) => v.value)
    expect(new Set(values).size).toBe(values.length)
  })
})

describe('Sidebar navigation', () => {
  it('renders the Views section with all five items', () => {
    render(
      <Sidebar
        selectedView="today"
        onSelectView={() => {}}
        selectedGroupId={null}
        onSelectGroup={() => {}}
      />,
    )

    for (const item of sidebarViews) {
      expect(screen.getByText(item.label)).toBeTruthy()
    }
  })

  it('highlights the active view', () => {
    const { rerender } = render(
      <Sidebar
        selectedView="today"
        onSelectView={() => {}}
        selectedGroupId={null}
        onSelectGroup={() => {}}
      />,
    )

    const todayBtn = screen.getByText('Today').closest('button')!
    expect(todayBtn.className).toContain('bg-muted')

    rerender(
      <Sidebar
        selectedView="tomorrow"
        onSelectView={() => {}}
        selectedGroupId={null}
        onSelectGroup={() => {}}
      />,
    )

    const tomorrowBtn = screen.getByText('Tomorrow').closest('button')!
    expect(tomorrowBtn.className).toContain('bg-muted')
  })

  it('hides the Groups section when only one group exists', () => {
    render(
      <Sidebar
        selectedView="today"
        onSelectView={() => {}}
        selectedGroupId={null}
        onSelectGroup={() => {}}
      />,
    )

    expect(screen.queryByText('Groups')).toBeNull()
    expect(screen.queryByText('All groups')).toBeNull()
  })

  it('shows the Groups section with All groups and user groups when two or more groups exist', () => {
    useGroupStore.setState({
      groups: [
        {
          id: 'default',
          name: 'General',
          color: 'oklch(0.545 0.185 28)',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'work',
          name: 'Work',
          color: 'oklch(0.7 0.15 200)',
          createdAt: new Date().toISOString(),
        },
      ],
    })

    render(
      <Sidebar
        selectedView="today"
        onSelectView={() => {}}
        selectedGroupId={null}
        onSelectGroup={() => {}}
      />,
    )

    expect(screen.getByText('Groups')).toBeTruthy()
    expect(screen.getByText('All groups')).toBeTruthy()
    expect(screen.getByText('General')).toBeTruthy()
    expect(screen.getByText('Work')).toBeTruthy()
  })

  it('highlights the active group lens', () => {
    useGroupStore.setState({
      groups: [
        {
          id: 'default',
          name: 'General',
          color: 'oklch(0.545 0.185 28)',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'work',
          name: 'Work',
          color: 'oklch(0.7 0.15 200)',
          createdAt: new Date().toISOString(),
        },
      ],
    })

    render(
      <Sidebar
        selectedView="today"
        onSelectView={() => {}}
        selectedGroupId="work"
        onSelectGroup={() => {}}
      />,
    )

    const allBtn = screen.getByText('All groups').closest('button')!
    const workBtn = screen.getByText('Work').closest('button')!

    // Active item: bg-muted + text-foreground (standalone, not pseudo-prefixed)
    // Inactive item: text-muted-foreground (and aria-expanded/hover variants only)
    expect(allBtn.className).toMatch(/(^|\s)text-muted-foreground($|\s)/)
    expect(workBtn.className).toMatch(/(^|\s)bg-muted($|\s)/)
    expect(workBtn.className).toMatch(/(^|\s)text-foreground($|\s)/)
  })

  it('calls onSelectView when a view item is clicked', async () => {
    const user = userEvent.setup()
    let selected = ''
    render(
      <Sidebar
        selectedView="today"
        onSelectView={(v) => {
          selected = v
        }}
        selectedGroupId={null}
        onSelectGroup={() => {}}
      />,
    )

    await user.click(screen.getByText('Unscheduled'))
    expect(selected).toBe('unscheduled')
  })

  it('calls onSelectGroup when a group item is clicked', async () => {
    const user = userEvent.setup()
    useGroupStore.setState({
      groups: [
        {
          id: 'default',
          name: 'General',
          color: 'oklch(0.545 0.185 28)',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'work',
          name: 'Work',
          color: 'oklch(0.7 0.15 200)',
          createdAt: new Date().toISOString(),
        },
      ],
    })

    let selected: string | null = 'initial'
    render(
      <Sidebar
        selectedView="today"
        onSelectView={() => {}}
        selectedGroupId={null}
        onSelectGroup={(id) => {
          selected = id
        }}
      />,
    )

    await user.click(screen.getByText('All groups'))
    expect(selected).toBe(null)

    await user.click(screen.getByText('Work'))
    expect(selected).toBe('work')
  })
})
