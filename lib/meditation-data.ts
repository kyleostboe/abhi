// Moved from app/labs/lib/meditation-data.ts
export interface Instruction {
  id: string
  text: string
  category: string
}

export interface SoundCue {
  id: string
  name: string
  src: string // Path to audio file or synthetic: prefix
  frequency?: number
  duration?: number // in milliseconds (total sound length)
  waveform?: OscillatorType
  harmonics?: number[]
  attackDuration?: number // in seconds
  releaseDuration?: number // in seconds
}

export const INSTRUCTIONS_LIBRARY: Instruction[] = [
  // Metta (Loving Kindness) Instructions
  {
    id: "metta-1",
    text: "May I/you/we be safe",
    category: "Metta",
  },
  {
    id: "metta-2",
    text: "May I/you/we be filled with happiness",
    category: "Metta",
  },
  {
    id: "metta-3",
    text: "May I/you/we be peaceful",
    category: "Metta",
  },
  {
    id: "metta-4",
    text: "May I/you/we live with ease and kindness",
    category: "Metta",
  },
  {
    id: "metta-5",
    text: "May I/you/we be healthy",
    category: "Metta",
  },
  {
    id: "metta-6",
    text: "May I/you/we be strong",
    category: "Metta",
  },
  {
    id: "metta-7",
    text: "May I/you/we be free from suffering",
    category: "Metta",
  },
  {
    id: "metta-8",
    text: "May I/you/we be filled with loving kindness",
    category: "Metta",
  },
  {
    id: "metta-9",
    text: "May I/you/we accept myself/yourself/ourselves as I am/you are/we are",
    category: "Metta",
  },
  {
    id: "metta-10",
    text: "May I/you/we forgive myself/yourself/ourselves",
    category: "Metta",
  },
  // Mindfulness Instructions
  {
    id: "mindfulness-1",
    text: "Breathing in, I know I am breathing in",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-2",
    text: "Breathing out, I know I am breathing out",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-3",
    text: "Long breath, I know it is long",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-4",
    text: "Short breath, I know it is short",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-5",
    text: "Breathing in, I calm my body",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-6",
    text: "I am aware of my whole body",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-7",
    text: "I release tension from my body",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-8",
    text: "Thinking, thinking",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-9",
    text: "Feeling this emotion",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-10",
    text: "Hearing sounds",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-11",
    text: "Seeing what appears",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-12",
    text: "Noticing bodily sensations",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-13",
    text: "This too shall pass",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-14",
    text: "Watching thoughts arise",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-15",
    text: "Watching thoughts pass away",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-16",
    text: "Resting in spacious awareness",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-17",
    text: "Here, now, this moment",
    category: "Mindfulness",
  },
  // Nonduality Instructions
  {
    id: "nonduality-1",
    text: "Who is aware of this awareness?",
    category: "Nonduality",
  },
  {
    id: "nonduality-2",
    text: "Tat tvam asi - Thou art That",
    category: "Nonduality",
  },
  {
    id: "nonduality-3",
    text: "All is Consciousness appearing as the many",
    category: "Nonduality",
  },
  {
    id: "nonduality-4",
    text: "The seer, seeing, and seen are one",
    category: "Nonduality",
  },
  {
    id: "nonduality-5",
    text: "Pure being-consciousness-bliss (sat-chit-ananda)",
    category: "Nonduality",
  },
  {
    id: "nonduality-6",
    text: "I am Shiva - pure consciousness at rest",
    category: "Nonduality",
  },
  {
    id: "nonduality-7",
    text: "I am Shakti - consciousness in movement",
    category: "Nonduality",
  },
  {
    id: "nonduality-8",
    text: "Everything arises within me as me",
    category: "Nonduality",
  },
  {
    id: "nonduality-9",
    text: "No coming, no going - only being",
    category: "Nonduality",
  },
  {
    id: "nonduality-10",
    text: "The heart is the supreme abode",
    category: "Nonduality",
  },
  {
    id: "nonduality-11",
    text: "Pratyabhijna - recognizing what I already am",
    category: "Nonduality",
  },
  {
    id: "nonduality-12",
    text: 'Resting as the source of the "I" thought',
    category: "Nonduality",
  },
  // Body Scan Instructions
  {
    id: "body-scan-1",
    text: "Awareness at the crown of my head",
    category: "Body Scan",
  },
  {
    id: "body-scan-2",
    text: "Softening my forehead",
    category: "Body Scan",
  },
  {
    id: "body-scan-3",
    text: "Relaxing around my eyes",
    category: "Body Scan",
  },
  {
    id: "body-scan-4",
    text: "Unclenching my jaw",
    category: "Body Scan",
  },
  {
    id: "body-scan-5",
    text: "Releasing tension from my neck",
    category: "Body Scan",
  },
  {
    id: "body-scan-6",
    text: "Dropping my shoulders",
    category: "Body Scan",
  },
  {
    id: "body-scan-7",
    text: "Arms heavy and relaxed",
    category: "Body Scan",
  },
  {
    id: "body-scan-8",
    text: "Hands soft and open",
    category: "Body Scan",
  },
  {
    id: "body-scan-9",
    text: "Heart space open and free",
    category: "Body Scan",
  },
  {
    id: "body-scan-10",
    text: "Belly soft and natural",
    category: "Body Scan",
  },
  {
    id: "body-scan-11",
    text: "Spine long and supported",
    category: "Body Scan",
  },
  {
    id: "body-scan-12",
    text: "Hips heavy and grounded",
    category: "Body Scan",
  },
  {
    id: "body-scan-13",
    text: "Legs relaxed and still",
    category: "Body Scan",
  },
  {
    id: "body-scan-14",
    text: "Feet connected to earth",
    category: "Body Scan",
  },
  {
    id: "body-scan-15",
    text: "Whole body at peace",
    category: "Body Scan",
  },
  // Concentration Instructions
  {
    id: "concentration-1",
    text: "One breath, complete attention",
    category: "Concentration",
  },
  {
    id: "concentration-2",
    text: "In breath, counting one",
    category: "Concentration",
  },
  {
    id: "concentration-3",
    text: "Out breath, counting two",
    category: "Concentration",
  },
  {
    id: "concentration-4",
    text: "Air touching my nostrils",
    category: "Concentration",
  },
  {
    id: "concentration-5",
    text: "Belly rising and falling",
    category: "Concentration",
  },
  {
    id: "concentration-6",
    text: "Resting in the pause between breaths",
    category: "Concentration",
  },
  {
    id: "concentration-7",
    text: "Gently returning to my anchor",
    category: "Concentration",
  },
  // Gratitude Instructions
  {
    id: "gratitude-1",
    text: "Grateful for this breath",
    category: "Gratitude",
  },
  {
    id: "gratitude-2",
    text: "Thankful for my body",
    category: "Gratitude",
  },
  {
    id: "gratitude-3",
    text: "Grateful for this moment",
    category: "Gratitude",
  },
  {
    id: "gratitude-4",
    text: "Thankful to be alive",
    category: "Gratitude",
  },
  {
    id: "gratitude-5",
    text: "Grateful for all my teachers",
    category: "Gratitude",
  },
  // Forgiveness Instructions
  {
    id: "forgiveness-1",
    text: "I forgive myself completely",
    category: "Forgiveness",
  },
  {
    id: "forgiveness-2",
    text: "I forgive all who have hurt me",
    category: "Forgiveness",
  },
  {
    id: "forgiveness-3",
    text: "I release all past mistakes",
    category: "Forgiveness",
  },
  {
    id: "forgiveness-4",
    text: "I am free from resentment",
    category: "Forgiveness",
  },
  // Transition Instructions
  {
    id: "transitions-1",
    text: "I am ready to begin",
    category: "Transitions",
  },
  {
    id: "transitions-2",
    text: "Settling into stillness",
    category: "Transitions",
  },
  {
    id: "transitions-3",
    text: "Going deeper within",
    category: "Transitions",
  },
  {
    id: "transitions-4",
    text: "Preparing for the next phase",
    category: "Transitions",
  },
  {
    id: "transitions-5",
    text: "Gently returning to awareness",
    category: "Transitions",
  },
  {
    id: "transitions-6",
    text: "This meditation is complete",
    category: "Transitions",
  },
  {
    id: "transitions-7",
    text: "Carrying this peace forward",
    category: "Transitions",
  },
]

export const SOUND_CUES_LIBRARY: SoundCue[] = [
  {
    id: "singing_bowl",
    name: "Singing Bowl",
    src: "synthetic:singing_bowl",
    frequency: 432,
    duration: 2500, // Total sound length in ms
    waveform: "sine",
    harmonics: [864, 1296, 1728], // More harmonics for richness
    attackDuration: 0.1, // 100ms attack
    releaseDuration: 2.0, // 2000ms release
  },
  {
    id: "gentle_chime",
    name: "Gentle Chime",
    src: "synthetic:chime_gentle",
    frequency: 1200, // Higher pitch
    duration: 700, // Total sound length in ms
    waveform: "triangle", // Softer than square, sharper than sine
    attackDuration: 0.01, // 10ms attack
    releaseDuration: 0.5, // 500ms release
  },
  {
    id: "soft_gong",
    name: "Soft Gong",
    src: "synthetic:soft_gong",
    frequency: 180, // Lower, deeper tone
    duration: 3000, // Total sound length in ms
    waveform: "sine",
    harmonics: [360, 540, 720], // For depth
    attackDuration: 0.2, // 200ms attack
    releaseDuration: 2.5, // 2500ms release
  },
  {
    id: "short_bell",
    name: "Short Bell",
    src: "synthetic:short_bell",
    frequency: 1500, // High, clear ring
    duration: 500, // Total sound length in ms
    waveform: "square", // Sharper, more metallic
    attackDuration: 0.005, // 5ms attack
    releaseDuration: 0.2, // 200ms release
  },
  {
    id: "clear_tone",
    name: "Clear Tone",
    src: "synthetic:clear_tone",
    frequency: 528,
    duration: 1500, // Total sound length in ms
    waveform: "sine",
    attackDuration: 0.05, // 50ms attack
    releaseDuration: 1.0, // 1000ms release
  },
]

// Musical Meditation System - Instructions encoded as memorable melodies
export interface MusicalInstruction {
  id: string
  text: string
  category: string
  note: string // Musical note (A, B, C, D, E, F, G)
  octave: number // 3, 4, 5 for different ranges
  duration: number // Quarter note = 1, half note = 2, etc.
}

// Musical note frequencies (simplified to just pure tones)
const NOTE_FREQUENCIES = {
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196.0,
  A3: 220.0,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
  A5: 880.0,
  B5: 987.77,
}

// Musical meditation notes organized by category
export const MUSICAL_NOTES = {
  Metta: [
    { id: "metta-c4", name: "C4", note: "C", octave: 4 },
    { id: "metta-e4", name: "E4", note: "E", octave: 4 },
    { id: "metta-g4", name: "G4", note: "G", octave: 4 },
    { id: "metta-c5", name: "C5", note: "C", octave: 5 },
  ],
  Mindfulness: [
    { id: "mind-a4", name: "A4", note: "A", octave: 4 },
    { id: "mind-c5", name: "C5", note: "C", octave: 5 },
    { id: "mind-d5", name: "D5", note: "D", octave: 5 },
    { id: "mind-a4-return", name: "A4 (return)", note: "A", octave: 4 },
  ],
  Nonduality: [
    { id: "non-g3", name: "G3", note: "G", octave: 3 },
    { id: "non-d4", name: "D4", note: "D", octave: 4 },
    { id: "non-g4", name: "G4", note: "G", octave: 4 },
  ],
  "Body Scan": [
    { id: "body-g5", name: "G5", note: "G", octave: 5 },
    { id: "body-f5", name: "F5", note: "F", octave: 5 },
    { id: "body-e5", name: "E5", note: "E", octave: 5 },
    { id: "body-d5", name: "D5", note: "D", octave: 5 },
    { id: "body-c5", name: "C5", note: "C", octave: 5 },
    { id: "body-b4", name: "B4", note: "B", octave: 4 },
    { id: "body-a4", name: "A4", note: "A", octave: 4 },
  ],
}

// Play a single musical note
export async function playNote(note: string, octave: number): Promise<void> {
  const noteKey = `${note}${octave}` as keyof typeof NOTE_FREQUENCIES
  const frequency = NOTE_FREQUENCIES[noteKey]

  if (!frequency) {
    console.warn(`Unknown note: ${noteKey}`)
    return
  }
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

  if (audioContext.state === "suspended") {
    await audioContext.resume()
  }
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  // Pure sine wave for clean, beautiful tones
  oscillator.type = "sine"
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)

  // Connect: oscillator -> gain -> destination
  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  // Note duration in seconds
  const noteDurationSeconds = 0.8
  const now = audioContext.currentTime

  // Gentle envelope for smooth, meditation-friendly tones
  gainNode.gain.setValueAtTime(0, now)
  gainNode.gain.exponentialRampToValueAtTime(0.2, now + 0.05) // Gentle attack
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + noteDurationSeconds) // Smooth release

  oscillator.start(now)
  oscillator.stop(now + noteDurationSeconds)

  // Clean up
  setTimeout(
    () => {
      try {
        audioContext.close()
      } catch (e) {
        console.warn("Error closing audio context:", e)
      }
    },
    noteDurationSeconds * 1000 + 100,
  )
}

// Function to generate synthetic sounds using Web Audio API
export async function generateSyntheticSound(soundCue: SoundCue): Promise<void> {
  try {
    // Create audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

    // Resume context if suspended
    if (audioContext.state === "suspended") {
      await audioContext.resume()
    }

    const totalSoundDurationSeconds = (soundCue.duration || 1000) / 1000 // Convert to seconds
    const frequency = soundCue.frequency || 440
    const waveform = soundCue.waveform || "sine"
    const attackDuration = soundCue.attackDuration || 0.01 // Default 10ms
    const releaseDuration = soundCue.releaseDuration || 0.5 // Default 500ms

    // Create oscillator
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    // Connect nodes
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    // Set oscillator properties
    oscillator.type = waveform
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)

    // Create envelope (Attack, Sustain, Release)
    const now = audioContext.currentTime
    const peakVolume = 0.5 // Max volume
    const endVolume = 0.001 // Near silence

    // Attack phase
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(peakVolume, now + attackDuration)

    // Sustain phase (hold peak volume until release starts)
    const sustainStart = now + attackDuration
    const releaseStart = now + totalSoundDurationSeconds - releaseDuration

    if (releaseStart > sustainStart) {
      // If there's a distinct sustain phase
      gainNode.gain.linearRampToValueAtTime(peakVolume, releaseStart)
    } else {
      // If attack + release is longer than or equal to total duration,
      // start release immediately after attack (or even during attack if attackDuration is long)
      gainNode.gain.linearRampToValueAtTime(
        peakVolume,
        Math.max(now + attackDuration, now + totalSoundDurationSeconds - releaseDuration),
      )
    }

    // Release phase
    gainNode.gain.exponentialRampToValueAtTime(endVolume, now + totalSoundDurationSeconds)

    // Add harmonics if specified
    if (soundCue.harmonics) {
      soundCue.harmonics.forEach((harmonic, index) => {
        const harmonicOsc = audioContext.createOscillator()
        const harmonicGain = audioContext.createGain()

        harmonicOsc.connect(harmonicGain)
        harmonicGain.connect(audioContext.destination)

        harmonicOsc.type = waveform
        harmonicOsc.frequency.setValueAtTime(harmonic, audioContext.currentTime)

        // Harmonics are quieter and follow a similar envelope
        const harmonicVolume = (peakVolume * 0.2) / (index + 1) // Reduce volume for higher harmonics

        harmonicGain.gain.setValueAtTime(0, now)
        harmonicGain.gain.linearRampToValueAtTime(harmonicVolume, now + attackDuration)

        if (releaseStart > sustainStart) {
          harmonicGain.gain.linearRampToValueAtTime(harmonicVolume, releaseStart)
        } else {
          harmonicGain.gain.linearRampToValueAtTime(
            harmonicVolume,
            Math.max(now + attackDuration, now + totalSoundDurationSeconds - releaseDuration),
          )
        }
        harmonicGain.gain.exponentialRampToValueAtTime(endVolume, now + totalSoundDurationSeconds)

        harmonicOsc.start(now)
        harmonicOsc.stop(now + totalSoundDurationSeconds)
      })
    }

    // Start and stop the oscillator
    oscillator.start(now)
    oscillator.stop(now + totalSoundDurationSeconds)

    // Clean up after sound finishes
    setTimeout(
      () => {
        try {
          audioContext.close()
        } catch (e) {
          console.warn("Error closing audio context:", e)
        }
      },
      totalSoundDurationSeconds * 1000 + 100, // Add a small buffer
    )
  } catch (error) {
    console.error("Error generating synthetic sound:", error)
    throw error
  }
}
