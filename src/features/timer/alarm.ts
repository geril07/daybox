type SoundName = 'bell' | 'digital' | 'gentle' | 'ping'

const audioContext = new AudioContext()

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType,
  volume: number,
  delay: number,
): void {
  const osc = audioContext.createOscillator()
  const gain = audioContext.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(frequency, audioContext.currentTime + delay)
  gain.gain.setValueAtTime(volume, audioContext.currentTime + delay)
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + delay + duration)
  osc.connect(gain)
  gain.connect(audioContext.destination)
  osc.start(audioContext.currentTime + delay)
  osc.stop(audioContext.currentTime + delay + duration)
}

const soundDefinitions: Record<SoundName, { freqs: number[]; duration: number; type: OscillatorType }> = {
  bell: { freqs: [880, 1100], duration: 0.15, type: 'sine' },
  digital: { freqs: [660, 880, 1100], duration: 0.08, type: 'square' },
  gentle: { freqs: [440, 660], duration: 0.3, type: 'sine' },
  ping: { freqs: [1320], duration: 0.2, type: 'sine' },
}

export function playAlarm(sound: SoundName, volume: number, repeat: number): void {
  const def = soundDefinitions[sound]
  for (let r = 0; r < repeat; r++) {
    const baseDelay = r * 0.35
    def.freqs.forEach((freq, i) => {
      playTone(freq, def.duration, def.type, volume, baseDelay + i * 0.12)
    })
  }
}
