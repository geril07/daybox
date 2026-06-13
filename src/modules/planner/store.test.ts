import { describe, it, expect, beforeEach } from 'vitest'

import { usePlannerStore } from './store'

beforeEach(() => {
  localStorage.clear()
  usePlannerStore.setState({
    weekStartDay: 1,
    browseDate: null,
  })
})

describe('Planner Store', () => {
  describe('defaults', () => {
    it('defaults weekStartDay to 1 (Monday)', () => {
      expect(usePlannerStore.getState().weekStartDay).toBe(1)
    })

    it('defaults browseDate to null', () => {
      expect(usePlannerStore.getState().browseDate).toBeNull()
    })
  })

  describe('setWeekStartDay', () => {
    it('sets the week start day', () => {
      usePlannerStore.getState().setWeekStartDay(0)
      expect(usePlannerStore.getState().weekStartDay).toBe(0)
    })

    it('accepts each valid day value', () => {
      for (const day of [0, 1, 2, 3, 4, 5, 6] as const) {
        usePlannerStore.getState().setWeekStartDay(day)
        expect(usePlannerStore.getState().weekStartDay).toBe(day)
      }
    })
  })

  describe('setBrowseDate', () => {
    it('sets the browse date', () => {
      usePlannerStore.getState().setBrowseDate('2026-06-15')
      expect(usePlannerStore.getState().browseDate).toBe('2026-06-15')
    })

    it('clears the browse date when passed null', () => {
      usePlannerStore.setState({ browseDate: '2026-06-15' })
      usePlannerStore.getState().setBrowseDate(null)
      expect(usePlannerStore.getState().browseDate).toBeNull()
    })
  })

  describe('stepBrowseDate', () => {
    it('steps forward by one day from the current browseDate', () => {
      usePlannerStore.setState({ browseDate: '2026-06-10' })
      usePlannerStore.getState().stepBrowseDate(1)
      expect(usePlannerStore.getState().browseDate).toBe('2026-06-11')
    })

    it('steps backward by one day from the current browseDate', () => {
      usePlannerStore.setState({ browseDate: '2026-06-10' })
      usePlannerStore.getState().stepBrowseDate(-1)
      expect(usePlannerStore.getState().browseDate).toBe('2026-06-09')
    })

    it('uses today as base when browseDate is null', () => {
      usePlannerStore.setState({ browseDate: null })
      usePlannerStore.getState().stepBrowseDate(1)
      const result = usePlannerStore.getState().browseDate
      expect(result).not.toBeNull()
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })
})
