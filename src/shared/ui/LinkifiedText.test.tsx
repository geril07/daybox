import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { LinkifiedText } from './LinkifiedText'

afterEach(() => {
  cleanup()
})

describe('LinkifiedText', () => {
  it('renders URL as a link with correct attrs and surrounding text', () => {
    render(<LinkifiedText text="see https://example.com" />)

    const link = screen.getByRole('link', { name: 'https://example.com' })
    expect(link).toHaveAttribute('href', 'https://example.com/')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')

    expect(screen.getByText('see', { exact: false })).toBeInTheDocument()
  })

  it('no URL — no anchor rendered', () => {
    render(<LinkifiedText text="hello world" />)
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('javascript: is not rendered as link', () => {
    render(<LinkifiedText text="click javascript:alert(1) now" />)
    expect(screen.queryByRole('link')).toBeNull()
    expect(
      screen.getByText('click javascript:alert(1) now'),
    ).toBeInTheDocument()
  })
})
