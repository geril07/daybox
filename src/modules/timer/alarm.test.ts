import { beforeEach, describe, expect, it, vi } from 'vitest'

type AudioContextMockApi = {
  instances: Array<{
    state: AudioContextState
    resume: (...args: unknown[]) => unknown
    oscillators: Array<{
      frequency: {
        setValueAtTime: (...args: unknown[]) => unknown
      }
    }>
  }>
  initialState: AudioContextState
  resumeBehavior: 'resolve' | 'resolveSuspended' | 'reject' | 'pending'
  oscillatorBehavior: 'create' | 'throw'
  reset: () => void
  resolvePendingResumes: () => void
}

const getAudioContextMock = () => AudioContext as unknown as AudioContextMockApi

let alarm: typeof import('./alarm')

beforeEach(async () => {
  vi.resetModules()
  getAudioContextMock().reset()
  alarm = await import('./alarm')
})

describe('timer audio autoplay lifecycle', () => {
  it('drops an alarm before audio has been unlocked', () => {
    expect(alarm.playAlarm('bell', 0.5, 3)).toBe(false)
    expect(getAudioContextMock().instances).toHaveLength(0)
  })

  it('does not schedule an alarm while a context is still suspended', async () => {
    const mock = getAudioContextMock()
    mock.initialState = 'suspended'
    mock.resumeBehavior = 'pending'

    const unlocking = alarm.unlockAudio()
    const context = mock.instances[0]

    expect(context).toBeDefined()
    expect(alarm.playAlarm('bell', 0.5, 3)).toBe(false)
    expect(context?.oscillators).toHaveLength(0)

    mock.resolvePendingResumes()
    await expect(unlocking).resolves.toBe(true)
  })

  it('schedules configured alarm tones after a successful unlock', async () => {
    const mock = getAudioContextMock()
    mock.initialState = 'suspended'

    await expect(alarm.unlockAudio()).resolves.toBe(true)
    const context = mock.instances[0]

    expect(alarm.playAlarm('digital', 0.5, 2)).toBe(true)
    expect(context?.oscillators).toHaveLength(6)
  })

  it('drops alarms when resume is rejected', async () => {
    const mock = getAudioContextMock()
    mock.initialState = 'suspended'
    mock.resumeBehavior = 'reject'

    await expect(alarm.unlockAudio()).resolves.toBe(false)
    expect(alarm.playAlarm('bell', 0.5, 3)).toBe(false)
    expect(mock.instances[0]?.oscillators).toHaveLength(0)
  })

  it('can retry unlocking after a rejected resume', async () => {
    const mock = getAudioContextMock()
    mock.initialState = 'suspended'
    mock.resumeBehavior = 'reject'

    await expect(alarm.unlockAudio()).resolves.toBe(false)
    mock.resumeBehavior = 'resolve'

    await expect(alarm.unlockAudio()).resolves.toBe(true)
    expect(alarm.playAlarm('ping', 0.5, 1)).toBe(true)
    expect(mock.instances[0]?.oscillators).toHaveLength(1)
  })

  it('does not schedule audio when resume resolves but remains suspended', async () => {
    const mock = getAudioContextMock()
    mock.initialState = 'suspended'
    mock.resumeBehavior = 'resolveSuspended'

    await expect(alarm.unlockAudio()).resolves.toBe(false)
    expect(alarm.playAlarm('bell', 0.5, 3)).toBe(false)
    expect(mock.instances[0]?.oscillators).toHaveLength(0)
  })

  it('schedules only the current click after delayed unlock', async () => {
    const mock = getAudioContextMock()
    mock.initialState = 'suspended'
    mock.resumeBehavior = 'pending'

    alarm.playAlarm('bell', 0.5, 3)
    alarm.playStartClick()
    const context = mock.instances[0]

    expect(context?.oscillators).toHaveLength(0)

    mock.resolvePendingResumes()
    await vi.waitFor(() => {
      expect(context?.oscillators).toHaveLength(1)
    })
  })

  it('uses a descending sweep for the pause click', async () => {
    const mock = getAudioContextMock()
    await expect(alarm.unlockAudio()).resolves.toBe(true)

    alarm.playPauseClick()
    const context = mock.instances[0]
    await vi.waitFor(() => {
      expect(context?.oscillators).toHaveLength(1)
    })

    expect(
      context?.oscillators[0]?.frequency.setValueAtTime,
    ).toHaveBeenCalledWith(1200, 0)
  })

  it('returns false instead of throwing when graph creation fails', async () => {
    const mock = getAudioContextMock()
    await expect(alarm.unlockAudio()).resolves.toBe(true)
    mock.oscillatorBehavior = 'throw'

    expect(() => alarm.playAlarm('bell', 0.5, 1)).not.toThrow()
    expect(alarm.playAlarm('bell', 0.5, 1)).toBe(false)
  })
})
