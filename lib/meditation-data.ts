import type { Instruction, SoundCue, AmbientSound } from "./types"
import { getAudioContext } from "./audio-utils"

export const INSTRUCTIONS_LIBRARY: Instruction[] = [
  {
    id: "instruction-1",
    category: "Mindfulness",
    text: "Bring your attention to your breath. Notice the sensation of the air entering and leaving your body.",
  },
  {
    id: "instruction-2",
    category: "Mindfulness",
    text: "Observe your thoughts without judgment. Let them come and go like clouds in the sky.",
  },
  {
    id: "instruction-3",
    category: "Mindfulness",
    text: "Gently bring your awareness to sounds around you. Listen without labeling or reacting.",
  },
  {
    id: "instruction-4",
    category: "Mindfulness",
    text: "Feel the contact points of your body with the surface beneath you. Ground yourself in the present moment.",
  },
  {
    id: "instruction-5",
    category: "Mindfulness",
    text: "Notice any sensations in your body. Acknowledge them with kindness and curiosity.",
  },
  {
    id: "instruction-6",
    category: "Compassion",
    text: "Bring to mind someone you care about. Wish them well-being and happiness.",
  },
  {
    id: "instruction-7",
    category: "Compassion",
    text: "Extend feelings of kindness to yourself. May you be free from suffering.",
  },
  {
    id: "instruction-8",
    category: "Compassion",
    text: "Now, extend these wishes of well-being to all beings, everywhere.",
  },
  {
    id: "instruction-9",
    category: "Body Scan",
    text: "Shift your attention to your toes. Notice any sensations there.",
  },
  {
    id: "instruction-10",
    category: "Body Scan",
    text: "Move your awareness up to your legs. Feel the weight and presence of your lower body.",
  },
  {
    id: "instruction-11",
    category: "Body Scan",
    text: "Bring your attention to your abdomen. Notice the gentle rise and fall with each breath.",
  },
  {
    id: "instruction-12",
    category: "Body Scan",
    text: "Scan your chest and heart area. Feel the rhythm of your breath and heartbeat.",
  },
  {
    id: "instruction-13",
    category: "Body Scan",
    text: "Direct your awareness to your arms and hands. Notice any tingling or warmth.",
  },
  {
    id: "instruction-14",
    category: "Body Scan",
    text: "Finally, bring your attention to your head and face. Relax your jaw and soften your eyes.",
  },
  {
    id: "instruction-15",
    category: "Visualization",
    text: "Imagine a peaceful place in nature. Engage all your senses in this visualization.",
  },
  {
    id: "instruction-16",
    category: "Visualization",
    text: "Visualize a warm, golden light filling your body, bringing comfort and healing.",
  },
  {
    id: "instruction-17",
    category: "Visualization",
    text: "Picture yourself as a strong, stable mountain, unmoving amidst changing weather.",
  },
  {
    id: "instruction-18",
    category: "Movement",
    text: "Gently stretch your neck from side to side, releasing any tension.",
  },
  {
    id: "instruction-19",
    category: "Movement",
    text: "Roll your shoulders slowly, feeling the movement in your upper back.",
  },
  {
    id: "instruction-20",
    category: "Movement",
    text: "Take a deep, conscious sigh, letting go of any remaining stress.",
  },
]

export const SOUND_CUES_LIBRARY: SoundCue[] = [
  { id: "singing-bowl", name: "Singing Bowl", src: "synthetic:singing-bowl" },
  { id: "chime", name: "Chime", src: "synthetic:chime" },
  { id: "gong", name: "Gong", src: "synthetic:gong" },
  { id: "bell", name: "Bell", src: "synthetic:bell" },
  { id: "water-drop", name: "Water Drop", src: "synthetic:water-drop" },
  { id: "soft-whoosh", name: "Soft Whoosh", src: "synthetic:soft-whoosh" },
  { id: "gentle-pluck", name: "Gentle Pluck", src: "synthetic:gentle-pluck" },
  { id: "deep-hum", name: "Deep Hum", src: "synthetic:deep-hum" },
]

export const AMBIENT_SOUNDS_LIBRARY: AmbientSound[] = [
  { id: "rain", name: "Gentle Rain", src: "synthetic:rain", volume: 0.4 },
  { id: "forest", name: "Forest Birds", src: "synthetic:forest", volume: 0.3 },
  { id: "ocean", name: "Ocean Waves", src: "synthetic:ocean", volume: 0.5 },
  { id: "crickets", name: "Night Crickets", src: "synthetic:crickets", volume: 0.3 },
  { id: "wind", name: "Soft Wind", src: "synthetic:wind", volume: 0.2 },
  { id: "stream", name: "Mountain Stream", src: "synthetic:stream", volume: 0.45 },
  { id: "thunderstorm", name: "Distant Thunderstorm", src: "synthetic:thunderstorm", volume: 0.55 },
]

export const NOTE_FREQUENCIES = {
  C4: 261.63,
  "C#4": 277.18,
  D4: 293.66,
  "D#4": 311.13,
  E4: 329.63,
  F4: 349.23,
  "F#4": 369.99,
  G4: 392.0,
  "G#4": 415.3,
  A4: 440.0,
  "A#4": 466.16,
  B4: 493.88,
  C5: 523.25,
  "C#5": 554.37,
  D5: 587.33,
  "D#5": 622.25,
  E5: 659.25,
  F5: 698.46,
  "F#5": 739.99,
  G5: 783.99,
  "G#5": 830.61,
  A5: 880.0,
  "A#5": 932.33,
  B5: 987.77,
} as const

export const MUSICAL_NOTES = {
  octave4: [
    { id: "note-c4", name: "C4", note: "C", octave: 4 },
    { id: "note-d4", name: "D4", note: "D", octave: 4 },
    { id: "note-e4", name: "E4", note: "E", octave: 4 },
    { id: "note-f4", name: "F4", note: "F", octave: 4 },
    { id: "note-g4", name: "G4", note: "G", octave: 4 },
    { id: "note-a4", name: "A4", note: "A", octave: 4 },
    { id: "note-b4", name: "B4", note: "B", octave: 4 },
  ],
  octave5: [
    { id: "note-c5", name: "C5", note: "C", octave: 5 },
    { id: "note-d5", name: "D5", note: "D", octave: 5 },
    { id: "note-e5", name: "E5", note: "E", octave: 5 },
    { id: "note-f5", name: "F5", note: "F", octave: 5 },
    { id: "note-g5", name: "G5", note: "G", octave: 5 },
    { id: "note-a5", name: "A5", note: "A", octave: 5 },
    { id: "note-b5", name: "B5", note: "B", octave: 5 },
  ],
}

// Function to generate synthetic sounds
export async function generateSyntheticSound(
  soundCue: SoundCue,
  audioContext: AudioContext | OfflineAudioContext,
): Promise<void> {
  const isOffline = audioContext instanceof OfflineAudioContext
  const sampleRate = audioContext.sampleRate
  const duration = 1.5 // seconds
  const numSamples = sampleRate * duration
  const buffer = audioContext.createBuffer(1, numSamples, sampleRate)
  const data = buffer.getChannelData(0)

  const createOscillator = (
    freq: number,
    type: OscillatorType,
    attack: number,
    decay: number,
    sustain: number,
    release: number,
    peakVolume: number,
  ) => {
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.type = type
    oscillator.frequency.setValueAtTime(freq, audioContext.currentTime)

    // Connect to gain node, then to destination
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    // ADSR envelope
    gainNode.gain.setValueAtTime(0, audioContext.currentTime)
    gainNode.gain.linearRampToValueAtTime(peakVolume, audioContext.currentTime + attack)
    gainNode.gain.linearRampToValueAtTime(peakVolume * sustain, audioContext.currentTime + attack + decay)
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration - release)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + duration)

    return { oscillator, gainNode }
  }

  switch (soundCue.id) {
    case "singing-bowl": {
      const freq = 220 // A3
      const overtone1 = freq * 2.005 // Slightly detuned octave
      const overtone2 = freq * 3.01 // Slightly detuned fifth
      const overtone3 = freq * 4.02 // Slightly detuned double octave

      const primary = createOscillator(freq, "sine", 0.1, 0.5, 0.8, 0.8, 0.6)
      const ov1 = createOscillator(overtone1, "sine", 0.1, 0.5, 0.7, 0.8, 0.4)
      const ov2 = createOscillator(overtone2, "sine", 0.1, 0.5, 0.6, 0.8, 0.2)
      const ov3 = createOscillator(overtone3, "sine", 0.1, 0.5, 0.5, 0.8, 0.1)

      // If offline, ensure all sources are connected to the offline context's destination
      if (isOffline) {
        primary.gainNode.connect(audioContext.destination)
        ov1.gainNode.connect(audioContext.destination)
        ov2.gainNode.connect(audioContext.destination)
        ov3.gainNode.connect(audioContext.destination)
      }
      break
    }
    case "chime": {
      const freq = 880 // A5
      const attack = 0.02
      const decay = 0.3
      const sustain = 0.1
      const release = 0.5
      const peakVolume = 0.7

      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.type = "triangle"
      oscillator.frequency.setValueAtTime(freq, audioContext.currentTime)

      const filter = audioContext.createBiquadFilter()
      filter.type = "highpass"
      filter.frequency.setValueAtTime(1000, audioContext.currentTime)
      filter.Q.setValueAtTime(10, audioContext.currentTime)

      oscillator.connect(filter)
      filter.connect(gainNode)
      gainNode.connect(audioContext.destination)

      gainNode.gain.setValueAtTime(0, audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(peakVolume, audioContext.currentTime + attack)
      gainNode.gain.linearRampToValueAtTime(peakVolume * sustain, audioContext.currentTime + attack + decay)
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration - release)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + duration)
      break
    }
    case "gong": {
      const fundamentalFreq = 50 // Hz
      const numOscillators = 10
      const peakVolume = 0.5

      for (let i = 0; i < numOscillators; i++) {
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.type = "sine"
        oscillator.frequency.setValueAtTime(
          fundamentalFreq * (i + 1) * (1 + Math.random() * 0.05),
          audioContext.currentTime,
        ) // Slightly detune overtones

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        gainNode.gain.setValueAtTime(0, audioContext.currentTime)
        gainNode.gain.linearRampToValueAtTime(peakVolume / (i + 1), audioContext.currentTime + 0.5) // Fade in
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration) // Long decay

        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + duration)
      }
      break
    }
    case "bell": {
      const freq = 1000 // Hz
      const attack = 0.01
      const decay = 0.2
      const sustain = 0.05
      const release = 0.3
      const peakVolume = 0.8

      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.type = "sine"
      oscillator.frequency.setValueAtTime(freq, audioContext.currentTime)

      const filter = audioContext.createBiquadFilter()
      filter.type = "lowpass"
      filter.frequency.setValueAtTime(2000, audioContext.currentTime)
      filter.Q.setValueAtTime(5, audioContext.currentTime)

      oscillator.connect(filter)
      filter.connect(gainNode)
      gainNode.connect(audioContext.destination)

      gainNode.gain.setValueAtTime(0, audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(peakVolume, audioContext.currentTime + attack)
      gainNode.gain.linearRampToValueAtTime(peakVolume * sustain, audioContext.currentTime + attack + decay)
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration - release)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + duration)
      break
    }
    case "water-drop": {
      const freq = 600 // Hz
      const attack = 0.01
      const decay = 0.1
      const release = 0.3
      const peakVolume = 0.6

      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.type = "sine"
      oscillator.frequency.setValueAtTime(freq, audioContext.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(freq * 0.5, audioContext.currentTime + decay) // Pitch bend

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      gainNode.gain.setValueAtTime(0, audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(peakVolume, audioContext.currentTime + attack)
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + decay + release)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + duration)
      break
    }
    case "soft-whoosh": {
      const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * duration, audioContext.sampleRate)
      const output = noiseBuffer.getChannelData(0)
      for (let i = 0; i < noiseBuffer.length; i++) {
        output[i] = Math.random() * 2 - 1 // White noise
      }

      const source = audioContext.createBufferSource()
      source.buffer = noiseBuffer
      source.loop = false

      const filter = audioContext.createBiquadFilter()
      filter.type = "lowpass"
      filter.frequency.setValueAtTime(100, audioContext.currentTime)
      filter.frequency.linearRampToValueAtTime(5000, audioContext.currentTime + duration * 0.7)
      filter.Q.setValueAtTime(1, audioContext.currentTime)

      const gainNode = audioContext.createGain()
      gainNode.gain.setValueAtTime(0, audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.1)
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration)

      source.connect(filter)
      filter.connect(gainNode)
      gainNode.connect(audioContext.destination)

      source.start(audioContext.currentTime)
      source.stop(audioContext.currentTime + duration)
      break
    }
    case "gentle-pluck": {
      const freq = 440 // A4
      const attack = 0.005
      const decay = 0.3
      const release = 0.5
      const peakVolume = 0.7

      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.type = "triangle"
      oscillator.frequency.setValueAtTime(freq, audioContext.currentTime)

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      gainNode.gain.setValueAtTime(0, audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(peakVolume, audioContext.currentTime + attack)
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + attack + decay + release)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + duration)
      break
    }
    case "deep-hum": {
      const freq = 80 // E2
      const attack = 0.5
      const decay = 0.5
      const sustain = 0.8
      const release = 0.5
      const peakVolume = 0.4

      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.type = "sine"
      oscillator.frequency.setValueAtTime(freq, audioContext.currentTime)

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      gainNode.gain.setValueAtTime(0, audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(peakVolume, audioContext.currentTime + attack)
      gainNode.gain.linearRampToValueAtTime(peakVolume * sustain, audioContext.currentTime + attack + decay)
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration - release)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + duration)
      break
    }
    default:
      console.warn("Unknown synthetic sound cue:", soundCue.id)
      break
  }
}

export async function generateAmbientSound(
  ambientSound: AmbientSound,
  audioContext: AudioContext | OfflineAudioContext,
  totalDuration: number,
  volume: number,
): Promise<void> {
  const isOffline = audioContext instanceof OfflineAudioContext
  const sampleRate = audioContext.sampleRate

  const createNoiseBuffer = (durationSeconds: number) => {
    const buffer = audioContext.createBuffer(1, sampleRate * durationSeconds, sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1 // White noise
    }
    return buffer
  }

  const createOscillator = (freq: number, type: OscillatorType, gain: number) => {
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(freq, audioContext.currentTime)
    gainNode.gain.setValueAtTime(gain, audioContext.currentTime)
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    return { oscillator, gainNode }
  }

  switch (ambientSound.id) {
    case "rain": {
      const noise = createNoiseBuffer(totalDuration)
      const source = audioContext.createBufferSource()
      source.buffer = noise
      source.loop = true

      const filter = audioContext.createBiquadFilter()
      filter.type = "lowpass"
      filter.frequency.setValueAtTime(2000, audioContext.currentTime) // Adjust for rain sound
      filter.Q.setValueAtTime(0.5, audioContext.currentTime)

      const gainNode = audioContext.createGain()
      gainNode.gain.setValueAtTime(volume, audioContext.currentTime)

      source.connect(filter)
      filter.connect(gainNode)
      gainNode.connect(audioContext.destination)

      source.start(0)
      source.stop(totalDuration)
      break
    }
    case "forest": {
      // Simulate birds with short, high-pitched chirps
      const birdChirp = () => {
        const chirpFreq = 2000 + Math.random() * 3000 // 2kHz to 5kHz
        const chirpDuration = 0.1 + Math.random() * 0.2 // 0.1 to 0.3 seconds
        const chirpVolume = volume * (0.5 + Math.random() * 0.5)

        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.type = "sine"
        oscillator.frequency.setValueAtTime(chirpFreq, audioContext.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(chirpFreq * 0.8, audioContext.currentTime + chirpDuration)

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        gainNode.gain.setValueAtTime(0, audioContext.currentTime)
        gainNode.gain.linearRampToValueAtTime(chirpVolume, audioContext.currentTime + 0.01)
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + chirpDuration)

        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + chirpDuration)
      }

      // Schedule chirps throughout the duration
      let currentTime = 0
      while (currentTime < totalDuration) {
        const delay = 2 + Math.random() * 8 // Chirp every 2-10 seconds
        if (isOffline) {
          // For offline context, schedule at specific times
          const scheduledTime = audioContext.currentTime + currentTime
          const chirpOscillator = audioContext.createOscillator()
          const chirpGain = audioContext.createGain()
          chirpOscillator.type = "sine"
          chirpOscillator.frequency.setValueAtTime(2000 + Math.random() * 3000, scheduledTime)
          chirpOscillator.frequency.exponentialRampToValueAtTime(
            (2000 + Math.random() * 3000) * 0.8,
            scheduledTime + 0.2,
          )
          chirpOscillator.connect(chirpGain)
          chirpGain.connect(audioContext.destination)
          chirpGain.gain.setValueAtTime(0, scheduledTime)
          chirpGain.gain.linearRampToValueAtTime(volume * (0.5 + Math.random() * 0.5), scheduledTime + 0.01)
          chirpGain.gain.exponentialRampToValueAtTime(0.001, scheduledTime + 0.3)
          chirpOscillator.start(scheduledTime)
          chirpOscillator.stop(scheduledTime + 0.3)
        } else {
          // For live context, use setTimeout
          setTimeout(birdChirp, currentTime * 1000)
        }
        currentTime += delay
      }
      break
    }
    case "ocean": {
      const noise = createNoiseBuffer(totalDuration)
      const source = audioContext.createBufferSource()
      source.buffer = noise
      source.loop = true

      const filter = audioContext.createBiquadFilter()
      filter.type = "bandpass"
      filter.frequency.setValueAtTime(500, audioContext.currentTime)
      filter.Q.setValueAtTime(0.5, audioContext.currentTime)

      const gainNode = audioContext.createGain()
      gainNode.gain.setValueAtTime(volume, audioContext.currentTime)

      source.connect(filter)
      filter.connect(gainNode)
      gainNode.connect(audioContext.destination)

      source.start(0)
      source.stop(totalDuration)
      break
    }
    case "crickets": {
      // Simulate crickets with short, high-pitched pulses
      const cricketChirp = () => {
        const chirpFreq = 4000 + Math.random() * 1000 // 4kHz to 5kHz
        const chirpDuration = 0.05 // seconds
        const chirpVolume = volume * (0.6 + Math.random() * 0.4)

        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.type = "square"
        oscillator.frequency.setValueAtTime(chirpFreq, audioContext.currentTime)

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        gainNode.gain.setValueAtTime(0, audioContext.currentTime)
        gainNode.gain.linearRampToValueAtTime(chirpVolume, audioContext.currentTime + 0.005)
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + chirpDuration)

        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + chirpDuration)
      }

      let currentTime = 0
      while (currentTime < totalDuration) {
        const delay = 0.5 + Math.random() * 2 // Chirp every 0.5-2.5 seconds
        if (isOffline) {
          const scheduledTime = audioContext.currentTime + currentTime
          const chirpOscillator = audioContext.createOscillator()
          const chirpGain = audioContext.createGain()
          chirpOscillator.type = "square"
          chirpOscillator.frequency.setValueAtTime(4000 + Math.random() * 1000, scheduledTime)
          chirpOscillator.connect(chirpGain)
          chirpGain.connect(audioContext.destination)
          chirpGain.gain.setValueAtTime(0, scheduledTime)
          chirpGain.gain.linearRampToValueAtTime(volume * (0.6 + Math.random() * 0.4), scheduledTime + 0.005)
          chirpGain.gain.exponentialRampToValueAtTime(0.001, scheduledTime + 0.05)
          chirpOscillator.start(scheduledTime)
          chirpOscillator.stop(scheduledTime + 0.05)
        } else {
          setTimeout(cricketChirp, currentTime * 1000)
        }
        currentTime += delay
      }
      break
    }
    case "wind": {
      const noise = createNoiseBuffer(totalDuration)
      const source = audioContext.createBufferSource()
      source.buffer = noise
      source.loop = true

      const filter = audioContext.createBiquadFilter()
      filter.type = "bandpass"
      filter.frequency.setValueAtTime(1000, audioContext.currentTime)
      filter.Q.setValueAtTime(0.8, audioContext.currentTime)

      const gainNode = audioContext.createGain()
      gainNode.gain.setValueAtTime(volume, audioContext.currentTime)

      source.connect(filter)
      filter.connect(gainNode)
      gainNode.connect(audioContext.destination)

      source.start(0)
      source.stop(totalDuration)
      break
    }
    case "stream": {
      const noise = createNoiseBuffer(totalDuration)
      const source = audioContext.createBufferSource()
      source.buffer = noise
      source.loop = true

      const filter = audioContext.createBiquadFilter()
      filter.type = "lowpass"
      filter.frequency.setValueAtTime(1500, audioContext.currentTime)
      filter.Q.setValueAtTime(0.7, audioContext.currentTime)

      const gainNode = audioContext.createGain()
      gainNode.gain.setValueAtTime(volume, audioContext.currentTime)

      source.connect(filter)
      filter.connect(gainNode)
      gainNode.connect(audioContext.destination)

      source.start(0)
      source.stop(totalDuration)
      break
    }
    case "thunderstorm": {
      const noise = createNoiseBuffer(totalDuration)
      const source = audioContext.createBufferSource()
      source.buffer = noise
      source.loop = true

      const filter = audioContext.createBiquadFilter()
      filter.type = "lowpass"
      filter.frequency.setValueAtTime(500, audioContext.currentTime)
      filter.Q.setValueAtTime(0.3, audioContext.currentTime)

      const gainNode = audioContext.createGain()
      gainNode.gain.setValueAtTime(volume, audioContext.currentTime)

      source.connect(filter)
      filter.connect(gainNode)
      gainNode.connect(audioContext.destination)

      source.start(0)
      source.stop(totalDuration)

      // Simulate thunder claps
      const thunderClap = () => {
        const clapNoise = createNoiseBuffer(1.5) // Short burst of noise for clap
        const clapSource = audioContext.createBufferSource()
        clapSource.buffer = clapNoise

        const clapFilter = audioContext.createBiquadFilter()
        clapFilter.type = "bandpass"
        clapFilter.frequency.setValueAtTime(100, audioContext.currentTime)
        clapFilter.Q.setValueAtTime(0.1, audioContext.currentTime)

        const clapGain = audioContext.createGain()
        clapGain.gain.setValueAtTime(0, audioContext.currentTime)
        clapGain.gain.linearRampToValueAtTime(volume * 0.8, audioContext.currentTime + 0.01)
        clapGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1.5)

        clapSource.connect(clapFilter)
        clapFilter.connect(clapGain)
        clapGain.connect(audioContext.destination)

        clapSource.start(audioContext.currentTime)
        clapSource.stop(audioContext.currentTime + 1.5)
      }

      let thunderTime = 0
      while (thunderTime < totalDuration) {
        const delay = 10 + Math.random() * 20 // Thunder every 10-30 seconds
        if (isOffline) {
          const scheduledTime = audioContext.currentTime + thunderTime
          const clapNoise = audioContext.createBuffer(1, sampleRate * 1.5, sampleRate)
          const output = clapNoise.getChannelData(0)
          for (let i = 0; i < clapNoise.length; i++) {
            output[i] = Math.random() * 2 - 1
          }
          const clapSource = audioContext.createBufferSource()
          clapSource.buffer = clapNoise

          const clapFilter = audioContext.createBiquadFilter()
          clapFilter.type = "bandpass"
          clapFilter.frequency.setValueAtTime(100, scheduledTime)
          clapFilter.Q.setValueAtTime(0.1, scheduledTime)

          const clapGain = audioContext.createGain()
          clapGain.gain.setValueAtTime(0, scheduledTime)
          clapGain.gain.linearRampToValueAtTime(volume * 0.8, scheduledTime + 0.01)
          clapGain.gain.exponentialRampToValueAtTime(0.001, scheduledTime + 1.5)

          clapSource.connect(clapFilter)
          clapFilter.connect(clapGain)
          clapGain.connect(audioContext.destination)

          clapSource.start(scheduledTime)
          clapSource.stop(scheduledTime + 1.5)
        } else {
          setTimeout(thunderClap, thunderTime * 1000)
        }
        thunderTime += delay
      }
      break
    }
    default:
      console.warn("Unknown ambient sound:", ambientSound.id)
      break
  }
}
