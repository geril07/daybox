import { describe, it, expect, beforeEach, vi } from 'vitest'

import { usePlannerStore } from './store'

beforeEach(() => {
  localStorage.clear()
  usePlannerStore.setState({
    weekStartDay: 1,
    browseDate: null,
    dayStartMinutes: 0,
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

    it('defaults dayStartMinutes to midnight', () => {
      expect(usePlannerStore.getState().dayStartMinutes).toBe(0)
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

  describe('setDayStartMinutes', () => {
    it('sets a valid minute-of-day value', () => {
      usePlannerStore.getState().setDayStartMinutes(150)
      expect(usePlannerStore.getState().dayStartMinutes).toBe(150)
    })

    it('rejects invalid minute-of-day values', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      usePlannerStore.getState().setDayStartMinutes(1440)
      expect(usePlannerStore.getState().dayStartMinutes).toBe(0)
      expect(warn).toHaveBeenCalledOnce()
      warn.mockRestore()
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

  describe('rehydration', () => {
    it('keeps old planner preferences and defaults the missing day start', async () => {
      localStorage.setItem(
        'daybox-planner',
        JSON.stringify({
          state: { weekStartDay: 0, browseDate: '2026-06-15' },
        }),
      )

      await usePlannerStore.persist.rehydrate()

      expect(usePlannerStore.getState().weekStartDay).toBe(0)
      expect(usePlannerStore.getState().browseDate).toBe('2026-06-15')
      expect(usePlannerStore.getState().dayStartMinutes).toBe(0)
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

    it('uses the effective planner date when browseDate is null', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 5, 10, 2, 0))
      usePlannerStore.setState({ browseDate: null, dayStartMinutes: 150 })

      usePlannerStore.getState().stepBrowseDate(1)

      expect(usePlannerStore.getState().browseDate).toBe('2026-06-10')
      vi.useRealTimers()
    })
  })
})
