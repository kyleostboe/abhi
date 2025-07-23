import type { Instruction as ImportedInstruction, SoundCue as ImportedSoundCue } from "./types"
import type { AmbientSound } from "./types"

export interface Instruction extends ImportedInstruction {
  // Additional properties can be added here if needed
}

export interface SoundCue extends ImportedSoundCue {
  frequency?: number
  duration?: number
  waveform?: OscillatorType
  harmonics?: number[]
  attackDuration?: number
  releaseDuration?: number
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
    id: "sound1",
    name: "Singing Bowl (Short)",
    src: "/sounds/singing-bowl-short.mp3",
  },
  {
    id: "sound2",
    name: "Gentle Chime",
    src: "/sounds/chime-gentle.mp3",
  },
  {
    id: "sound3",
    name: "Soft Gong",
    src: "/sounds/soft-gong.mp3",
  },
  {
    id: "sound4",
    name: "Short Bell",
    src: "/sounds/short-bell.mp3",
  },
  {
    id: "sound5",
    name: "Clear Tone",
    src: "/sounds/clear-tone.mp3",
  },
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

export const AMBIENT_SOUNDS_LIBRARY: AmbientSound[] = [
  {
    id: "synthetic_rain",
    name: "Synthetic Rain",
    src: "synthetic:rain",
    noiseType: "white",
    filterType: "lowpass",
    filterFrequency: 2000,
    lfoFrequency: 0.5,
    volume: 0.15,
    minDelay: 50, // ms
    maxDelay: 300, // ms
    dropDuration: 100, // ms
    dropFrequencyRange: [1000, 3000], // Hz
    dropDecay: 0.05, // seconds
  },
  {
    id: "synthetic_waves",
    name: "Synthetic Ocean Waves",
    src: "synthetic:waves",
    noiseType: "brown",
    filterType: "lowpass",
    filterFrequency: 800,
    lfoFrequency: 0.05, // Slower LFO for wave swell
    volume: 0.2,
    waveCrashFrequency: 0.02, // Average 1 crash every 50 seconds
    waveCrashDuration: 2000, // ms
    waveCrashVolumeMultiplier: 1.5,
  },
  {
    id: "synthetic_forest",
    name: "Synthetic Forest",
    src: "synthetic:forest",
    noiseType: "brown",
    filterType: "lowpass",
    filterFrequency: 600,
    lfoFrequency: 0.1, // Gentle wind
    volume: 0.15,
    birdChirpFrequency: 0.01, // Average 1 chirp every 100 seconds
    birdChirpDuration: 200, // ms
    birdChirpFrequencyRange: [2000, 5000], // Hz
  },
  {
    id: "synthetic_wind",
    name: "Synthetic Wind",
    src: "synthetic:wind",
    noiseType: "white",
    filterType: "bandpass",
    filterFrequency: 300,
    filterQ: 1,
    lfoFrequency: 0.08, // Varying wind intensity
    lfoDepth: 0.5, // How much LFO affects gain
    volume: 0.2,
  },
  { id: "file_rain", name: "Rain (File)", src: "/sounds/rain.mp3" },
  { id: "file_forest", name: "Forest Birds (File)", src: "/sounds/forest.mp3" },
  { id: "file_ocean", name: "Ocean Waves (File)", src: "/sounds/ocean.mp3" },
  { id: "file_river", name: "Gentle River (File)", src: "/sounds/river.mp3" },
  { id: "synthetic_white_noise", name: "White Noise (Synthetic)", src: "synthetic:white-noise", noiseType: "white" },
  { id: "synthetic_pink_noise", name: "Pink Noise (Synthetic)", src: "synthetic:pink-noise", noiseType: "pink" },
  { id: "synthetic_brown_noise", name: "Brown Noise (Synthetic)", src: "synthetic:brown-noise", noiseType: "brown" },
]

export const NOTE_FREQUENCIES = {
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

// Function to generate synthetic sounds using Web Audio API
export async function generateSyntheticSound(
  soundCue: SoundCue,
  audioContext: AudioContext | OfflineAudioContext,
): Promise<void> {
  try {
    // Resume context if suspended (only for AudioContext, not OfflineAudioContext)
    if (audioContext instanceof AudioContext && audioContext.state === "suspended") {
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

    // Clean up (only for AudioContext, not OfflineAudioContext as it's managed by render)
    if (audioContext instanceof AudioContext) {
      setTimeout(
        () => {
          try {
            // Check if context is still active before closing
            if (audioContext.state !== "closed") {
              audioContext.close()
            }
          } catch (e) {
            console.warn("Error closing audio context:", e)
          }
        },
        totalSoundDurationSeconds * 1000 + 100,
      )
    }
  } catch (error) {
    console.error("Error generating synthetic sound:", error)
    throw error
  }
}

// Generate looping ambient noise using Web Audio API
export async function generateAmbientSound(
  ambient: AmbientSound,
  audioContext: AudioContext | OfflineAudioContext,
  duration: number, // Duration in seconds for the generated buffer
  volumeOverride?: number,
): Promise<AudioBufferSourceNode | null> {
  try {
    if (audioContext instanceof AudioContext && audioContext.state === "suspended") {
      await audioContext.resume()
    }

    const now = audioContext.currentTime
    const targetVolume = volumeOverride ?? ambient.volume ?? 0.2

    const masterGain = audioContext.createGain()
    masterGain.gain.setValueAtTime(targetVolume, now)
    masterGain.connect(audioContext.destination)

    let sourceNode: AudioBufferSourceNode | null = null

    if (ambient.src === "synthetic:rain") {
      // Rain: stochastic individual drops
      const createRaindrop = () => {
        if (!audioContext) return // Context might be closed during long ambient playback

        const dropGain = audioContext.createGain()
        dropGain.connect(masterGain) // Connect to master gain for overall volume control
        dropGain.gain.setValueAtTime(0, audioContext.currentTime)
        dropGain.gain.linearRampToValueAtTime(
          (Math.random() * 0.3 + 0.7) * targetVolume,
          audioContext.currentTime + 0.01,
        ) // Randomize volume
        dropGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + (ambient.dropDecay || 0.05)) // Fast decay

        const oscillator = audioContext.createOscillator()
        oscillator.type = "sine" // Simple sine for a 'plink'
        oscillator.frequency.setValueAtTime(
          ambient.dropFrequencyRange
            ? Math.random() * (ambient.dropFrequencyRange[1] - ambient.dropFrequencyRange[0]) +
                ambient.dropFrequencyRange[0]
            : 2000 + Math.random() * 1000, // Randomize frequency
          audioContext.currentTime,
        )
        oscillator.connect(dropGain)
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + (ambient.dropDecay || 0.05) + 0.01) // Stop slightly after decay

        // Add a subtle noise component for realism
        const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.1, audioContext.sampleRate)
        const noiseData = noiseBuffer.getChannelData(0)
        for (let i = 0; i < noiseBuffer.length; i++) {
          noiseData[i] = Math.random() * 2 - 1
        }
        const noiseSource = audioContext.createBufferSource()
        noiseSource.buffer = noiseBuffer
        const noiseGain = audioContext.createGain()
        noiseGain.gain.setValueAtTime(0.05 * targetVolume, audioContext.currentTime) // Low volume noise
        noiseSource.connect(noiseGain)
        noiseGain.connect(masterGain)
        noiseSource.start(audioContext.currentTime)
        noiseSource.stop(audioContext.currentTime + 0.1)
      }

      const scheduleRaindrop = () => {
        if (!audioContext || audioContext.state === "closed") return
        createRaindrop()
        const delay = Math.random() * ((ambient.maxDelay || 300) - (ambient.minDelay || 50)) + (ambient.minDelay || 50)
        setTimeout(scheduleRaindrop, delay)
      }
      scheduleRaindrop() // Start the rain
    } else if (ambient.src === "synthetic:waves") {
      // Ocean Waves: layered noise with LFOs and randomized crashes
      const createNoiseBuffer = (type: "white" | "pink" | "brown", lengthSeconds: number) => {
        const bufferSize = audioContext.sampleRate * lengthSeconds
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate)
        const data = buffer.getChannelData(0)

        if (type === "white") {
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1
          }
        } else if (type === "pink") {
          let b0, b1, b2, b3, b4, b5, b6
          b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1
            b0 = 0.99886 * b0 + white * 0.0555179
            b1 = 0.99332 * b1 + white * 0.0750759
            b2 = 0.969 * b2 + white * 0.153852
            b3 = 0.8665 * b3 + white * 0.3104856
            b4 = 0.55 * b4 + white * 0.5329522
            b5 = -0.7616 * b5 - white * 0.016898
            data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362
            b6 = white * 0.115926
          }
        } else if (type === "brown") {
          let lastOut = 0.0
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1
            data[i] = (lastOut + 0.02 * white) / 1.02
            lastOut = data[i]
            data[i] *= 3.5 // (roughly) compensate for gain
          }
        }
        return buffer
      }

      // Base wave rumble (brown noise, lowpass filtered)
      const rumbleSource = audioContext.createBufferSource()
      rumbleSource.buffer = createNoiseBuffer("brown", duration)
      rumbleSource.loop = true
      const rumbleFilter = audioContext.createBiquadFilter()
      rumbleFilter.type = "lowpass"
      rumbleFilter.frequency.setValueAtTime(200, now)
      rumbleSource.connect(rumbleFilter)
      rumbleFilter.connect(masterGain)
      rumbleSource.start(now)

      // Wave whoosh (white noise, lowpass filtered with LFO on gain)
      const whooshSource = audioContext.createBufferSource()
      whooshSource.buffer = createNoiseBuffer("white", duration)
      whooshSource.loop = true
      const whooshFilter = audioContext.createBiquadFilter()
      whooshFilter.type = "lowpass"
      whooshFilter.frequency.setValueAtTime(ambient.filterFrequency || 800, now)
      whooshSource.connect(whooshFilter)

      const whooshGain = audioContext.createGain()
      whooshGain.gain.setValueAtTime(0.5 * targetVolume, now) // Base volume for whoosh
      whooshFilter.connect(whooshGain)
      whooshGain.connect(masterGain)

      const lfo = audioContext.createOscillator()
      lfo.type = "sine"
      lfo.frequency.setValueAtTime(ambient.lfoFrequency || 0.05, now) // Slow swell
      const lfoGain = audioContext.createGain()
      lfoGain.gain.setValueAtTime(0.5 * targetVolume, now) // LFO depth
      lfo.connect(lfoGain)
      lfoGain.connect(whooshGain.gain) // Modulate whoosh gain
      lfo.start(now)

      whooshSource.start(now)

      // Random wave crashes
      const scheduleWaveCrash = () => {
        if (!audioContext || audioContext.state === "closed") return
        const crashDelay = (1 / (ambient.waveCrashFrequency || 0.02)) * 1000 * (0.5 + Math.random()) // Randomize delay
        setTimeout(() => {
          if (!audioContext || audioContext.state === "closed") return
          const crashGain = audioContext.createGain()
          crashGain.connect(masterGain)
          crashGain.gain.setValueAtTime(0, audioContext.currentTime)
          crashGain.gain.linearRampToValueAtTime(
            (ambient.waveCrashVolumeMultiplier || 1.5) * targetVolume,
            audioContext.currentTime + 0.1,
          )
          crashGain.gain.exponentialRampToValueAtTime(
            0.001,
            audioContext.currentTime + (ambient.waveCrashDuration || 2000) / 1000,
          )

          const crashNoiseSource = audioContext.createBufferSource()
          crashNoiseSource.buffer = createNoiseBuffer("white", (ambient.waveCrashDuration || 2000) / 1000)
          const crashFilter = audioContext.createBiquadFilter()
          crashFilter.type = "bandpass"
          crashFilter.frequency.setValueAtTime(500, audioContext.currentTime)
          crashFilter.Q.setValueAtTime(0.5, audioContext.currentTime)
          crashNoiseSource.connect(crashFilter)
          crashFilter.connect(crashGain)
          crashNoiseSource.start(audioContext.currentTime)
          crashNoiseSource.stop(audioContext.currentTime + (ambient.waveCrashDuration || 2000) / 1000)

          scheduleWaveCrash()
        }, crashDelay)
      }
      scheduleWaveCrash()

      sourceNode = rumbleSource // Return one of the main sources for control
    } else if (ambient.src === "synthetic:forest") {
      // Forest: base wind with occasional bird chirps
      const createNoiseBuffer = (type: "white" | "pink" | "brown", lengthSeconds: number) => {
        const bufferSize = audioContext.sampleRate * lengthSeconds
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate)
        const data = buffer.getChannelData(0)

        if (type === "white") {
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1
          }
        } else if (type === "pink") {
          let b0, b1, b2, b3, b4, b5, b6
          b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1
            b0 = 0.99886 * b0 + white * 0.0555179
            b1 = 0.99332 * b1 + white * 0.0750759
            b2 = 0.969 * b2 + white * 0.153852
            b3 = 0.8665 * b3 + white * 0.3104856
            b4 = 0.55 * b4 + white * 0.5329522
            b5 = -0.7616 * b5 - white * 0.016898
            data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362
            b6 = white * 0.115926
          }
        } else if (type === "brown") {
          let lastOut = 0.0
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1
            data[i] = (lastOut + 0.02 * white) / 1.02
            lastOut = data[i]
            data[i] *= 3.5 // (roughly) compensate for gain
          }
        }
        return buffer
      }

      // Base forest ambience (brown noise, lowpass filtered, gentle LFO)
      const forestSource = audioContext.createBufferSource()
      forestSource.buffer = createNoiseBuffer("brown", duration)
      forestSource.loop = true
      const forestFilter = audioContext.createBiquadFilter()
      forestFilter.type = "lowpass"
      forestFilter.frequency.setValueAtTime(ambient.filterFrequency || 600, now)
      forestSource.connect(forestFilter)

      const forestGain = audioContext.createGain()
      forestGain.gain.setValueAtTime(targetVolume, now)
      forestFilter.connect(forestGain)
      forestGain.connect(masterGain)

      const lfo = audioContext.createOscillator()
      lfo.type = "sine"
      lfo.frequency.setValueAtTime(ambient.lfoFrequency || 0.1, now)
      const lfoGain = audioContext.createGain()
      lfoGain.gain.setValueAtTime(0.2 * targetVolume, now) // Subtle gain modulation for wind
      lfo.connect(lfoGain)
      lfoGain.connect(forestGain.gain)
      lfo.start(now)

      forestSource.start(now)

      // Occasional bird chirps
      const createChirp = () => {
        if (!audioContext || audioContext.state === "closed") return
        const chirpOsc = audioContext.createOscillator()
        chirpOsc.type = "sine"
        chirpOsc.frequency.setValueAtTime(
          ambient.birdChirpFrequencyRange
            ? Math.random() * (ambient.birdChirpFrequencyRange[1] - ambient.birdChirpFrequencyRange[0]) +
                ambient.birdChirpFrequencyRange[0]
            : 3000 + Math.random() * 2000,
          audioContext.currentTime,
        )
        const chirpGain = audioContext.createGain()
        chirpGain.gain.setValueAtTime(0, audioContext.currentTime)
        chirpGain.gain.linearRampToValueAtTime(0.5 * targetVolume, audioContext.currentTime + 0.01)
        chirpGain.gain.exponentialRampToValueAtTime(
          0.001,
          audioContext.currentTime + (ambient.birdChirpDuration || 200) / 1000,
        )
        chirpOsc.connect(chirpGain)
        chirpGain.connect(masterGain)
        chirpOsc.start(audioContext.currentTime)
        chirpOsc.stop(audioContext.currentTime + (ambient.birdChirpDuration || 200) / 1000 + 0.01)
      }

      const scheduleChirp = () => {
        if (!audioContext || audioContext.state === "closed") return
        const delay = (1 / (ambient.birdChirpFrequency || 0.01)) * 1000 * (0.5 + Math.random())
        setTimeout(() => {
          if (!audioContext || audioContext.state === "closed") return
          createChirp()
          scheduleChirp()
        }, delay)
      }
      scheduleChirp()

      sourceNode = forestSource
    } else if (ambient.src === "synthetic:wind") {
      // Wind: filtered white noise with dynamic LFOs
      const bufferSize = audioContext.sampleRate * duration
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1
      }

      const source = audioContext.createBufferSource()
      source.buffer = buffer
      source.loop = true

      const filter = audioContext.createBiquadFilter()
      filter.type = ambient.filterType || "bandpass"
      filter.frequency.setValueAtTime(ambient.filterFrequency || 300, now)
      filter.Q.setValueAtTime(ambient.filterQ || 1, now)
      source.connect(filter)

      const gainNode = audioContext.createGain()
      gainNode.gain.setValueAtTime(targetVolume, now)
      filter.connect(gainNode)
      gainNode.connect(masterGain)

      // LFO for gain modulation (wind gusts)
      const lfoGainOsc = audioContext.createOscillator()
      lfoGainOsc.type = "sine"
      lfoGainOsc.frequency.setValueAtTime(ambient.lfoFrequency || 0.08, now)
      const lfoGainAmount = audioContext.createGain()
      lfoGainAmount.gain.setValueAtTime(ambient.lfoDepth || 0.5, now) // Depth of modulation
      lfoGainOsc.connect(lfoGainAmount)
      lfoGainAmount.connect(gainNode.gain) // Modulate the main gain
      lfoGainOsc.start(now)

      // LFO for filter frequency modulation (wind character change)
      const lfoFilterOsc = audioContext.createOscillator()
      lfoFilterOsc.type = "sine"
      lfoFilterOsc.frequency.setValueAtTime((ambient.lfoFrequency || 0.08) * 1.5, now) // Slightly different frequency
      const lfoFilterAmount = audioContext.createGain()
      lfoFilterAmount.gain.setValueAtTime(ambient.filterFrequency ? ambient.filterFrequency * 0.5 : 150, now) // Depth of frequency modulation
      lfoFilterOsc.connect(lfoFilterAmount)
      lfoFilterAmount.connect(filter.frequency) // Modulate filter frequency
      lfoFilterOsc.start(now)

      source.start(now)
      sourceNode = source
    } else {
      // Default noise types (white, pink, brown)
      const bufferSize = audioContext.sampleRate * duration
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate)
      const data = buffer.getChannelData(0)

      if (ambient.noiseType === "white") {
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1
        }
      } else if (ambient.noiseType === "pink") {
        let b0, b1, b2, b3, b4, b5, b6
        b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1
          b0 = 0.99886 * b0 + white * 0.0555179
          b1 = 0.99332 * b1 + white * 0.0750759
          b2 = 0.969 * b2 + white * 0.153852
          b3 = 0.8665 * b3 + white * 0.3104856
          b4 = 0.55 * b4 + white * 0.5329522
          b5 = -0.7616 * b5 - white * 0.016898
          data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362
          b6 = white * 0.115926
        }
      } else if (ambient.noiseType === "brown") {
        let lastOut = 0.0
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1
          data[i] = (lastOut + 0.02 * white) / 1.02
          lastOut = data[i]
          data[i] *= 3.5 // (roughly) compensate for gain
        }
      }

      const source = audioContext.createBufferSource()
      source.buffer = buffer
      source.loop = true

      let lastNode: AudioNode = source

      if (ambient.filterType) {
        const filter = audioContext.createBiquadFilter()
        filter.type = ambient.filterType
        filter.frequency.setValueAtTime(ambient.filterFrequency || 1000, now)
        if (ambient.filterQ) {
          filter.Q.setValueAtTime(ambient.filterQ, now)
        }
        lastNode.connect(filter)
        lastNode = filter
      }

      if (ambient.lfoFrequency) {
        const lfo = audioContext.createOscillator()
        const lfoGain = audioContext.createGain()
        lfo.frequency.setValueAtTime(ambient.lfoFrequency, now)
        lfoGain.gain.setValueAtTime(ambient.lfoDepth ?? targetVolume, now) // LFO depth
        lfo.connect(lfoGain)
        lfoGain.connect(masterGain.gain) // Modulate master gain
        lfo.start(now)
        lfo.stop(now + duration)
      }

      lastNode.connect(masterGain)
      source.start(now)
      sourceNode = source
    }

    return sourceNode
  } catch (error) {
    console.error("Error generating ambient sound:", error)
    throw error
  }
}
