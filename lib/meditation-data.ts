import type { Instruction as ImportedInstruction, SoundCue as ImportedSoundCue } from "./types"
import type { AmbientSound } from "./types"

export interface Instruction extends ImportedInstruction {
  // Additional properties can be added here if needed
}

export interface SoundCue extends ImportedSoundCue {
  // Additional properties can be added here if needed
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

export const AMBIENT_SOUNDS_LIBRARY: AmbientSound[] = [
  {
    id: "rain",
    name: "Rain",
    src: "synthetic:rain",
    noiseType: "white",
    filterType: "highpass",
    filterFrequency: 1000,
    lfoFrequency: 20,
    volume: 0.2,
  },
  {
    id: "waves",
    name: "Ocean Waves",
    src: "synthetic:waves",
    noiseType: "white",
    filterType: "lowpass",
    filterFrequency: 500,
    lfoFrequency: 0.2,
    volume: 0.25,
  },
  {
    id: "forest",
    name: "Forest",
    src: "synthetic:forest",
    noiseType: "brown",
    filterType: "lowpass",
    filterFrequency: 800,
    lfoFrequency: 0.5,
    volume: 0.2,
  },
  {
    id: "wind",
    name: "Wind",
    src: "synthetic:wind",
    noiseType: "white",
    filterType: "lowpass",
    filterFrequency: 400,
    lfoFrequency: 0.1,
    volume: 0.2,
  },
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
            audioContext.close()
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

// Generate realistic ambient sounds using Web Audio API
export async function generateAmbientSound(
  ambient: AmbientSound,
  audioContext: AudioContext | OfflineAudioContext,
  duration: number,
  volumeOverride?: number,
): Promise<void> {
  try {
    if (audioContext instanceof AudioContext && audioContext.state === "suspended") {
      await audioContext.resume()
    }

    const targetVolume = volumeOverride ?? ambient.volume ?? 0.2

    switch (ambient.id) {
      case "rain":
        await generateRainSound(audioContext, duration, targetVolume)
        break
      case "waves":
        await generateOceanWavesSound(audioContext, duration, targetVolume)
        break
      case "forest":
        await generateForestSound(audioContext, duration, targetVolume)
        break
      case "wind":
        await generateWindSound(audioContext, duration, targetVolume)
        break
      default:
        // Fallback to simple noise for other sounds
        await generateSimpleNoise(audioContext, duration, targetVolume, ambient)
        break
    }
  } catch (error) {
    console.error("Error generating ambient sound:", error)
    throw error
  }
}

// Realistic rain sound with random droplets
async function generateRainSound(
  audioContext: AudioContext | OfflineAudioContext,
  duration: number,
  volume: number,
): Promise<void> {
  const masterGain = audioContext.createGain()
  masterGain.gain.setValueAtTime(volume, 0)
  masterGain.connect(audioContext.destination)

  // Background rain hiss (filtered white noise)
  const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 2, audioContext.sampleRate)
  const noiseData = noiseBuffer.getChannelData(0)
  for (let i = 0; i < noiseData.length; i++) {
    noiseData[i] = (Math.random() * 2 - 1) * 0.3
  }

  const backgroundSource = audioContext.createBufferSource()
  backgroundSource.buffer = noiseBuffer
  backgroundSource.loop = true

  const backgroundFilter = audioContext.createBiquadFilter()
  backgroundFilter.type = "highpass"
  backgroundFilter.frequency.setValueAtTime(800, 0)
  backgroundFilter.Q.setValueAtTime(0.5, 0)

  const backgroundGain = audioContext.createGain()
  backgroundGain.gain.setValueAtTime(0.4, 0)

  backgroundSource.connect(backgroundFilter)
  backgroundFilter.connect(backgroundGain)
  backgroundGain.connect(masterGain)

  backgroundSource.start(0)
  backgroundSource.stop(duration)

  // Random droplets
  const dropletCount = Math.floor(duration * (50 + Math.random() * 100)) // 50-150 droplets per second
  for (let i = 0; i < dropletCount; i++) {
    const dropTime = Math.random() * duration
    const dropFreq = 800 + Math.random() * 2000 // 800-2800 Hz
    const dropDuration = 0.01 + Math.random() * 0.05 // 10-60ms
    const dropVolume = 0.1 + Math.random() * 0.3 // Varying intensity

    const dropOsc = audioContext.createOscillator()
    const dropGain = audioContext.createGain()
    const dropFilter = audioContext.createBiquadFilter()

    dropOsc.type = "sine"
    dropOsc.frequency.setValueAtTime(dropFreq, dropTime)

    dropFilter.type = "bandpass"
    dropFilter.frequency.setValueAtTime(dropFreq, dropTime)
    dropFilter.Q.setValueAtTime(2, dropTime)

    // Sharp attack, quick decay for droplet
    dropGain.gain.setValueAtTime(0, dropTime)
    dropGain.gain.linearRampToValueAtTime(dropVolume, dropTime + 0.001)
    dropGain.gain.exponentialRampToValueAtTime(0.001, dropTime + dropDuration)

    dropOsc.connect(dropFilter)
    dropFilter.connect(dropGain)
    dropGain.connect(masterGain)

    dropOsc.start(dropTime)
    dropOsc.stop(dropTime + dropDuration)
  }
}

// Realistic ocean waves with natural rhythm
async function generateOceanWavesSound(
  audioContext: AudioContext | OfflineAudioContext,
  duration: number,
  volume: number,
): Promise<void> {
  const masterGain = audioContext.createGain()
  masterGain.gain.setValueAtTime(volume, 0)
  masterGain.connect(audioContext.destination)

  // Base ocean noise
  const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 4, audioContext.sampleRate)
  const noiseData = noiseBuffer.getChannelData(0)
  for (let i = 0; i < noiseData.length; i++) {
    noiseData[i] = (Math.random() * 2 - 1) * 0.5
  }

  const baseSource = audioContext.createBufferSource()
  baseSource.buffer = noiseBuffer
  baseSource.loop = true

  const baseFilter = audioContext.createBiquadFilter()
  baseFilter.type = "lowpass"
  baseFilter.frequency.setValueAtTime(400, 0)
  baseFilter.Q.setValueAtTime(0.7, 0)

  baseSource.connect(baseFilter)
  baseFilter.connect(masterGain)

  baseSource.start(0)
  baseSource.stop(duration)

  // Wave swells with random timing
  const waveCount = Math.floor(duration / (3 + Math.random() * 4)) // Wave every 3-7 seconds
  for (let i = 0; i < waveCount; i++) {
    const waveTime = i * (duration / waveCount) + Math.random() * 2 - 1 // Add randomness
    const waveDuration = 2 + Math.random() * 3 // 2-5 second waves
    const waveIntensity = 0.3 + Math.random() * 0.4

    if (waveTime >= 0 && waveTime < duration - waveDuration) {
      // Wave approach (low frequency swell)
      const waveOsc = audioContext.createOscillator()
      const waveGain = audioContext.createGain()
      const waveFilter = audioContext.createBiquadFilter()

      waveOsc.type = "sine"
      waveOsc.frequency.setValueAtTime(60 + Math.random() * 40, waveTime) // 60-100 Hz

      waveFilter.type = "lowpass"
      waveFilter.frequency.setValueAtTime(200, waveTime)

      // Natural wave envelope
      waveGain.gain.setValueAtTime(0, waveTime)
      waveGain.gain.linearRampToValueAtTime(waveIntensity * 0.3, waveTime + waveDuration * 0.3)
      waveGain.gain.linearRampToValueAtTime(waveIntensity, waveTime + waveDuration * 0.6)
      waveGain.gain.exponentialRampToValueAtTime(0.001, waveTime + waveDuration)

      waveOsc.connect(waveFilter)
      waveFilter.connect(waveGain)
      waveGain.connect(masterGain)

      waveOsc.start(waveTime)
      waveOsc.stop(waveTime + waveDuration)

      // Wave crash (higher frequency burst)
      const crashTime = waveTime + waveDuration * 0.7
      const crashDuration = 0.5 + Math.random() * 0.5

      const crashSource = audioContext.createBufferSource()
      crashSource.buffer = noiseBuffer

      const crashFilter = audioContext.createBiquadFilter()
      crashFilter.type = "highpass"
      crashFilter.frequency.setValueAtTime(1000 + Math.random() * 1000, crashTime)

      const crashGain = audioContext.createGain()
      crashGain.gain.setValueAtTime(0, crashTime)
      crashGain.gain.linearRampToValueAtTime(waveIntensity * 0.6, crashTime + 0.1)
      crashGain.gain.exponentialRampToValueAtTime(0.001, crashTime + crashDuration)

      crashSource.connect(crashFilter)
      crashFilter.connect(crashGain)
      crashGain.connect(masterGain)

      crashSource.start(crashTime)
      crashSource.stop(crashTime + crashDuration)
    }
  }
}

// Realistic forest sounds with birds and rustling
async function generateForestSound(
  audioContext: AudioContext | OfflineAudioContext,
  duration: number,
  volume: number,
): Promise<void> {
  const masterGain = audioContext.createGain()
  masterGain.gain.setValueAtTime(volume, 0)
  masterGain.connect(audioContext.destination)

  // Background forest ambiance (brown noise)
  const ambianceBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 3, audioContext.sampleRate)
  const ambianceData = ambianceBuffer.getChannelData(0)
  let lastOut = 0
  for (let i = 0; i < ambianceData.length; i++) {
    const white = Math.random() * 2 - 1
    ambianceData[i] = lastOut = (lastOut + 0.02 * white) / 1.02
    ambianceData[i] *= 3.5 // Compensate for volume reduction
  }

  const ambianceSource = audioContext.createBufferSource()
  ambianceSource.buffer = ambianceBuffer
  ambianceSource.loop = true

  const ambianceFilter = audioContext.createBiquadFilter()
  ambianceFilter.type = "lowpass"
  ambianceFilter.frequency.setValueAtTime(800, 0)

  const ambianceGain = audioContext.createGain()
  ambianceGain.gain.setValueAtTime(0.3, 0)

  ambianceSource.connect(ambianceFilter)
  ambianceFilter.connect(ambianceGain)
  ambianceGain.connect(masterGain)

  ambianceSource.start(0)
  ambianceSource.stop(duration)

  // Random bird chirps
  const birdCount = Math.floor(duration * (0.1 + Math.random() * 0.3)) // 0.1-0.4 birds per second
  for (let i = 0; i < birdCount; i++) {
    const birdTime = Math.random() * duration
    const birdType = Math.floor(Math.random() * 3)

    if (birdType === 0) {
      // High chirp
      await createBirdChirp(audioContext, masterGain, birdTime, 2000 + Math.random() * 2000, 0.3 + Math.random() * 0.5)
    } else if (birdType === 1) {
      // Medium warble
      await createBirdWarble(audioContext, masterGain, birdTime, 800 + Math.random() * 800, 0.8 + Math.random() * 1.2)
    } else {
      // Low coo
      await createBirdCoo(audioContext, masterGain, birdTime, 300 + Math.random() * 400, 1.0 + Math.random() * 2.0)
    }
  }

  // Occasional rustling
  const rustleCount = Math.floor(duration * (0.05 + Math.random() * 0.1)) // Occasional rustles
  for (let i = 0; i < rustleCount; i++) {
    const rustleTime = Math.random() * duration
    const rustleDuration = 0.5 + Math.random() * 2.0

    const rustleSource = audioContext.createBufferSource()
    rustleSource.buffer = ambianceBuffer

    const rustleFilter = audioContext.createBiquadFilter()
    rustleFilter.type = "highpass"
    rustleFilter.frequency.setValueAtTime(2000 + Math.random() * 3000, rustleTime)

    const rustleGain = audioContext.createGain()
    rustleGain.gain.setValueAtTime(0, rustleTime)
    rustleGain.gain.linearRampToValueAtTime(0.2 + Math.random() * 0.3, rustleTime + 0.1)
    rustleGain.gain.exponentialRampToValueAtTime(0.001, rustleTime + rustleDuration)

    rustleSource.connect(rustleFilter)
    rustleFilter.connect(rustleGain)
    rustleGain.connect(masterGain)

    rustleSource.start(rustleTime)
    rustleSource.stop(rustleTime + rustleDuration)
  }
}

// Helper functions for bird sounds
async function createBirdChirp(
  audioContext: AudioContext | OfflineAudioContext,
  destination: AudioNode,
  startTime: number,
  frequency: number,
  duration: number,
): Promise<void> {
  const osc = audioContext.createOscillator()
  const gain = audioContext.createGain()

  osc.type = "sine"
  osc.frequency.setValueAtTime(frequency, startTime)
  osc.frequency.linearRampToValueAtTime(frequency * 1.5, startTime + duration * 0.3)
  osc.frequency.linearRampToValueAtTime(frequency * 0.8, startTime + duration)

  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(0.1, startTime + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

  osc.connect(gain)
  gain.connect(destination)

  osc.start(startTime)
  osc.stop(startTime + duration)
}

async function createBirdWarble(
  audioContext: AudioContext | OfflineAudioContext,
  destination: AudioNode,
  startTime: number,
  frequency: number,
  duration: number,
): Promise<void> {
  const osc = audioContext.createOscillator()
  const gain = audioContext.createGain()
  const lfo = audioContext.createOscillator()
  const lfoGain = audioContext.createGain()

  osc.type = "sine"
  osc.frequency.setValueAtTime(frequency, startTime)

  lfo.type = "sine"
  lfo.frequency.setValueAtTime(8 + Math.random() * 12, startTime) // 8-20 Hz warble
  lfoGain.gain.setValueAtTime(frequency * 0.1, startTime)

  lfo.connect(lfoGain)
  lfoGain.connect(osc.frequency)

  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(0.08, startTime + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

  osc.connect(gain)
  gain.connect(destination)

  osc.start(startTime)
  osc.stop(startTime + duration)
  lfo.start(startTime)
  lfo.stop(startTime + duration)
}

async function createBirdCoo(
  audioContext: AudioContext | OfflineAudioContext,
  destination: AudioNode,
  startTime: number,
  frequency: number,
  duration: number,
): Promise<void> {
  const osc = audioContext.createOscillator()
  const gain = audioContext.createGain()

  osc.type = "sine"
  osc.frequency.setValueAtTime(frequency, startTime)
  osc.frequency.linearRampToValueAtTime(frequency * 0.9, startTime + duration * 0.5)
  osc.frequency.linearRampToValueAtTime(frequency * 1.1, startTime + duration)

  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(0.06, startTime + 0.05)
  gain.gain.linearRampToValueAtTime(0.06, startTime + duration * 0.8)
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

  osc.connect(gain)
  gain.connect(destination)

  osc.start(startTime)
  osc.stop(startTime + duration)
}

// Realistic wind with turbulence and gusts
async function generateWindSound(
  audioContext: AudioContext | OfflineAudioContext,
  duration: number,
  volume: number,
): Promise<void> {
  const masterGain = audioContext.createGain()
  masterGain.gain.setValueAtTime(volume, 0)
  masterGain.connect(audioContext.destination)

  // Base wind (filtered white noise)
  const windBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 2, audioContext.sampleRate)
  const windData = windBuffer.getChannelData(0)
  for (let i = 0; i < windData.length; i++) {
    windData[i] = (Math.random() * 2 - 1) * 0.6
  }

  const windSource = audioContext.createBufferSource()
  windSource.buffer = windBuffer
  windSource.loop = true

  const windFilter = audioContext.createBiquadFilter()
  windFilter.type = "lowpass"
  windFilter.frequency.setValueAtTime(400, 0)

  const windGain = audioContext.createGain()
  windGain.gain.setValueAtTime(0.5, 0)

  // Add slow modulation for natural wind variation
  const windLfo = audioContext.createOscillator()
  const windLfoGain = audioContext.createGain()
  windLfo.type = "sine"
  windLfo.frequency.setValueAtTime(0.1 + Math.random() * 0.2, 0) // Very slow modulation
  windLfoGain.gain.setValueAtTime(0.3, 0)

  windLfo.connect(windLfoGain)
  windLfoGain.connect(windGain.gain)

  windSource.connect(windFilter)
  windFilter.connect(windGain)
  windGain.connect(masterGain)

  windSource.start(0)
  windSource.stop(duration)
  windLfo.start(0)
  windLfo.stop(duration)

  // Random gusts
  const gustCount = Math.floor(duration * (0.1 + Math.random() * 0.2)) // 0.1-0.3 gusts per second
  for (let i = 0; i < gustCount; i++) {
    const gustTime = Math.random() * duration
    const gustDuration = 1 + Math.random() * 3 // 1-4 second gusts
    const gustIntensity = 0.3 + Math.random() * 0.5

    const gustSource = audioContext.createBufferSource()
    gustSource.buffer = windBuffer

    const gustFilter = audioContext.createBiquadFilter()
    gustFilter.type = "lowpass"
    gustFilter.frequency.setValueAtTime(200 + Math.random() * 400, gustTime)

    const gustGain = audioContext.createGain()
    gustGain.gain.setValueAtTime(0, gustTime)
    gustGain.gain.linearRampToValueAtTime(gustIntensity, gustTime + gustDuration * 0.3)
    gustGain.gain.linearRampToValueAtTime(gustIntensity * 0.7, gustTime + gustDuration * 0.7)
    gustGain.gain.exponentialRampToValueAtTime(0.001, gustTime + gustDuration)

    gustSource.connect(gustFilter)
    gustFilter.connect(gustGain)
    gustGain.connect(masterGain)

    gustSource.start(gustTime)
    gustSource.stop(gustTime + gustDuration)
  }
}

// Fallback simple noise generator
async function generateSimpleNoise(
  audioContext: AudioContext | OfflineAudioContext,
  duration: number,
  volume: number,
  ambient: AmbientSound,
): Promise<void> {
  const bufferSize = Math.floor(duration * audioContext.sampleRate)
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }

  const source = audioContext.createBufferSource()
  source.buffer = buffer
  source.loop = true

  let lastNode: AudioNode = source

  if (ambient.filterType) {
    const filter = audioContext.createBiquadFilter()
    filter.type = ambient.filterType
    filter.frequency.setValueAtTime(ambient.filterFrequency || 1000, 0)
    lastNode.connect(filter)
    lastNode = filter
  }

  const gainNode = audioContext.createGain()
  gainNode.gain.setValueAtTime(volume, 0)
  lastNode.connect(gainNode)
  gainNode.connect(audioContext.destination)

  if (ambient.lfoFrequency) {
    const lfo = audioContext.createOscillator()
    const lfoGain = audioContext.createGain()
    lfo.frequency.setValueAtTime(ambient.lfoFrequency, 0)
    lfoGain.gain.setValueAtTime(volume, 0)
    lfo.connect(lfoGain)
    lfoGain.connect(gainNode.gain)
    lfo.start(0)
    lfo.stop(duration)
  }

  source.start(0)
  source.stop(duration)
}
