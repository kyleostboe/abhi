import type { Instruction as ImportedInstruction, SoundCue as ImportedSoundCue } from "./types"
import type { AmbientSound } from "./types"
import type { Meditation } from "@/lib/types"

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

// Generate looping ambient noise using Web Audio API
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

    // Master gain node for overall volume control
    const masterGain = audioContext.createGain()
    masterGain.gain.setValueAtTime(targetVolume, audioContext.currentTime)

    const panner = new StereoPannerNode(audioContext, { pan: 0 })
    masterGain.connect(panner)

    const panLfo = audioContext.createOscillator()
    const panLfoGain = audioContext.createGain()
    panLfo.type = "sine"
    panLfo.frequency.value = 0.03 + Math.random() * 0.02
    panLfoGain.gain.value = 0.5
    panLfo.connect(panLfoGain).connect(panner.pan)
    panLfo.start(0)
    panLfo.stop(duration)

    const dryGain = audioContext.createGain()
    dryGain.gain.value = 0.7

    const wetGain = audioContext.createGain()
    wetGain.gain.value = 0.3

    const reverb = audioContext.createConvolver()
    reverb.buffer = createSimpleReverbBuffer(audioContext, 2.5, 2)

    panner.connect(dryGain).connect(audioContext.destination)
    panner.connect(reverb).connect(wetGain).connect(audioContext.destination)

    switch (ambient.id) {
      case "rain":
        await generateHyperrealisticRain(audioContext, masterGain, duration)
        break
      case "waves":
        await generateHyperrealisticWaves(audioContext, masterGain, duration)
        break
      case "forest":
        await generateHyperrealisticForest(audioContext, masterGain, duration)
        break
      case "wind":
        await generateHyperrealisticWind(audioContext, masterGain, duration)
        break
      default:
        // Fallback to a simpler but improved noise generator
        await generateSimpleNoise(audioContext, masterGain, duration, ambient)
        break
    }
  } catch (error) {
    console.error(`Error generating ambient sound for ${ambient.id}:`, error)
    throw error
  }
}

// --- Hyperrealistic Soundscape Generators ---

async function generateHyperrealisticRain(
  audioContext: AudioContext | OfflineAudioContext,
  destination: AudioNode,
  duration: number,
): Promise<void> {
  // Layer 1: Background hiss/sheet of rain
  const hissBuffer = audioContext.createBuffer(2, audioContext.sampleRate * 2, audioContext.sampleRate)
  for (let channel = 0; channel < 2; channel++) {
    const data = hissBuffer.getChannelData(channel)
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1
    }
  }
  const hissSource = audioContext.createBufferSource()
  hissSource.buffer = hissBuffer
  hissSource.loop = true

  const hissFilter = audioContext.createBiquadFilter()
  hissFilter.type = "highpass"
  hissFilter.frequency.value = 1500
  hissFilter.Q.value = 0.7

  const hissGain = audioContext.createGain()
  hissGain.gain.value = 0.2

  hissSource.connect(hissFilter).connect(hissGain).connect(destination)

  // Layer 2: Stochastic individual droplets
  const dropletScheduler = () => {
    const now = audioContext.currentTime
    if (now > duration) return

    const dropTime = now + Math.random() * 0.2 // Schedule next drop within 200ms
    if (dropTime < duration) {
      createRaindrop(audioContext, destination, dropTime)
    }
    setTimeout(dropletScheduler, Math.random() * 100 + 20) // Next check in 20-120ms
  }

  // Start 5 concurrent schedulers for a denser, more random feel
  for (let i = 0; i < 5; i++) {
    dropletScheduler()
  }

  // Layer 3: Low-frequency rumble
  const rumbleBuffer = audioContext.createBuffer(2, audioContext.sampleRate * 3, audioContext.sampleRate)
  for (let channel = 0; channel < 2; channel++) {
    const data = rumbleBuffer.getChannelData(channel)
    let lastOut = 0
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1
      data[i] = (lastOut + 0.02 * white) / 1.02
      lastOut = data[i]
      data[i] *= 3.5
    }
  }
  const rumbleSource = audioContext.createBufferSource()
  rumbleSource.buffer = rumbleBuffer
  rumbleSource.loop = true

  const rumbleFilter = audioContext.createBiquadFilter()
  rumbleFilter.type = "lowpass"
  rumbleFilter.frequency.value = 120

  const rumbleGain = audioContext.createGain()
  rumbleGain.gain.value = 0.4

  const rumbleLfo = audioContext.createOscillator()
  rumbleLfo.type = "sine"
  rumbleLfo.frequency.value = 0.1
  const rumbleLfoGain = audioContext.createGain()
  rumbleLfoGain.gain.value = 0.2
  rumbleLfo.connect(rumbleLfoGain).connect(rumbleGain.gain)

  rumbleSource.connect(rumbleFilter).connect(rumbleGain).connect(destination)

  hissSource.start(0)
  rumbleSource.start(0)
  hissSource.stop(duration)
  rumbleSource.stop(duration)
}

function createRaindrop(audioContext: AudioContext | OfflineAudioContext, destination: AudioNode, time: number) {
  const freq = 1000 + Math.random() * 2000
  const pan = Math.random() * 2 - 1

  const panner = new StereoPannerNode(audioContext, { pan })

  const osc = audioContext.createOscillator()
  osc.type = "triangle"
  osc.frequency.value = freq

  const gain = audioContext.createGain()
  gain.gain.setValueAtTime(0, time)
  gain.gain.linearRampToValueAtTime(Math.random() * 0.3 + 0.1, time + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1 + Math.random() * 0.1)

  osc.connect(gain).connect(panner).connect(destination)
  osc.start(time)
  osc.stop(time + 0.2)
}

async function generateHyperrealisticWaves(
  audioContext: AudioContext | OfflineAudioContext,
  destination: AudioNode,
  duration: number,
): Promise<void> {
  // Base layer: Pink noise for a more natural ocean roar
  const bufferSize = audioContext.sampleRate * 4
  const pinkNoiseBuffer = audioContext.createBuffer(2, bufferSize, audioContext.sampleRate)
  for (let channel = 0; channel < 2; channel++) {
    const data = pinkNoiseBuffer.getChannelData(channel)
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.969 * b2 + white * 0.153852
      b3 = 0.8665 * b3 + white * 0.3104856
      b4 = 0.55 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.016898
      data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362
      data[i] *= 0.11 // (roughly) compensate for gain
      b6 = white * 0.115926
    }
  }

  const baseSource = audioContext.createBufferSource()
  baseSource.buffer = pinkNoiseBuffer
  baseSource.loop = true

  // Main wave modulation (volume)
  const waveGain = audioContext.createGain()
  waveGain.gain.value = 0.1 // Start low
  const lfo1 = audioContext.createOscillator()
  lfo1.type = "sine"
  lfo1.frequency.value = 0.1 + Math.random() * 0.05 // ~7-10s period
  const lfo1Gain = audioContext.createGain()
  lfo1Gain.gain.value = 0.3

  const lfo2 = audioContext.createOscillator()
  lfo2.type = "sine"
  lfo2.frequency.value = 0.18 + Math.random() * 0.05 // ~4-6s period
  const lfo2Gain = audioContext.createGain()
  lfo2Gain.gain.value = 0.2

  lfo1.connect(lfo1Gain).connect(waveGain.gain)
  lfo2.connect(lfo2Gain).connect(waveGain.gain)

  // Filter modulation for "whoosh"
  const waveFilter = audioContext.createBiquadFilter()
  waveFilter.type = "lowpass"
  waveFilter.Q.value = 2
  waveFilter.frequency.value = 400 // Base frequency
  const filterLfo = audioContext.createOscillator()
  filterLfo.type = "sine"
  filterLfo.frequency.value = 0.15
  const filterLfoGain = audioContext.createGain()
  filterLfoGain.gain.value = 800 // Modulate frequency by 800Hz

  filterLfo.connect(filterLfoGain).connect(waveFilter.frequency)

  // Foam layer (high-frequency, triggered by wave peaks)
  const foamSource = audioContext.createBufferSource()
  foamSource.buffer = pinkNoiseBuffer
  foamSource.loop = true
  const foamFilter = audioContext.createBiquadFilter()
  foamFilter.type = "highpass"
  foamFilter.frequency.value = 1000
  const foamGain = audioContext.createGain()
  foamGain.gain.value = 0 // Initially silent
  // Use the same LFOs but with a gain shaper to only activate on peaks
  const foamShaper = audioContext.createWaveShaper()
  const curve = new Float32Array(256)
  for (let i = 0; i < 256; i++) {
    const x = i / 128 - 1
    curve[i] = Math.max(0, x * x * x) * 0.8 // Activate on positive curve, sharp attack
  }
  foamShaper.curve = curve
  waveGain.connect(foamShaper).connect(foamGain.gain)

  // Connect graph
  baseSource.connect(waveGain).connect(waveFilter).connect(destination)
  foamSource.connect(foamFilter).connect(foamGain).connect(destination)

  // Start everything
  lfo1.start(0)
  lfo2.start(0)
  filterLfo.start(0)
  baseSource.start(0)
  foamSource.start(0)

  lfo1.stop(duration)
  lfo2.stop(duration)
  filterLfo.stop(duration)
  baseSource.stop(duration)
  foamSource.stop(duration)
}

async function generateHyperrealisticForest(
  audioContext: AudioContext | OfflineAudioContext,
  destination: AudioNode,
  duration: number,
): Promise<void> {
  // Layer 1: Gentle wind/leaf rustle
  const rustleBuffer = audioContext.createBuffer(2, audioContext.sampleRate * 3, audioContext.sampleRate)
  for (let channel = 0; channel < 2; channel++) {
    const data = rustleBuffer.getChannelData(channel)
    let lastOut = 0
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1
      data[i] = (lastOut + 0.02 * white) / 1.02
      lastOut = data[i]
    }
  }
  const rustleSource = audioContext.createBufferSource()
  rustleSource.buffer = rustleBuffer
  rustleSource.loop = true

  const rustleFilter = audioContext.createBiquadFilter()
  rustleFilter.type = "bandpass"
  rustleFilter.frequency.value = 1200
  rustleFilter.Q.value = 5

  const rustleGain = audioContext.createGain()
  rustleGain.gain.value = 0.15

  const rustleLfo = audioContext.createOscillator()
  rustleLfo.type = "sine"
  rustleLfo.frequency.value = 0.3
  const rustleLfoGain = audioContext.createGain()
  rustleLfoGain.gain.value = 0.05
  rustleLfo.connect(rustleLfoGain).connect(rustleGain.gain)

  rustleSource.connect(rustleFilter).connect(rustleGain).connect(destination)

  // Layer 2: Stochastic bird calls
  const birdScheduler = () => {
    const now = audioContext.currentTime
    if (now > duration) return

    const callTime = now + 2 + Math.random() * 5 // Next call in 2-7 seconds
    if (callTime < duration) {
      const pan = Math.random() * 1.6 - 0.8 // Pan between -0.8 and 0.8
      const freq = 1500 + Math.random() * 2000
      const type = Math.random()
      if (type < 0.5) {
        createBirdChirp(audioContext, destination, callTime, freq, 0.2 + Math.random() * 0.3, pan)
      } else {
        createBirdWarble(audioContext, destination, callTime, freq * 0.6, 0.5 + Math.random() * 0.5, pan)
      }
    }
    setTimeout(birdScheduler, (2 + Math.random() * 5) * 1000)
  }
  birdScheduler()

  // Layer 3: Insect/cicada drone
  const insectSource = audioContext.createBufferSource()
  insectSource.buffer = rustleBuffer // reuse buffer
  insectSource.loop = true

  const insectFilter = audioContext.createBiquadFilter()
  insectFilter.type = "bandpass"
  insectFilter.frequency.value = 4000
  insectFilter.Q.value = 15

  const insectGain = audioContext.createGain()
  insectGain.gain.value = 0.1

  const insectLfo = audioContext.createOscillator()
  insectLfo.type = "triangle"
  insectLfo.frequency.value = 8 // Fast tremolo
  const insectLfoGain = audioContext.createGain()
  insectLfoGain.gain.value = 0.05
  insectLfo.connect(insectLfoGain).connect(insectGain.gain)

  insectSource.connect(insectFilter).connect(insectGain).connect(destination)

  // Start sources
  rustleSource.start(0)
  rustleLfo.start(0)
  insectSource.start(0)
  insectLfo.start(0)

  rustleSource.stop(duration)
  rustleLfo.stop(duration)
  insectSource.stop(duration)
  insectLfo.stop(duration)
}

// Bird call helpers with panning
function createBirdChirp(
  audioContext: AudioContext | OfflineAudioContext,
  destination: AudioNode,
  time: number,
  freq: number,
  dur: number,
  pan: number,
) {
  const panner = new StereoPannerNode(audioContext, { pan })
  const osc = audioContext.createOscillator()
  osc.type = "sine"
  osc.frequency.setValueAtTime(freq, time)
  osc.frequency.exponentialRampToValueAtTime(freq * 1.2, time + dur * 0.5)
  osc.frequency.exponentialRampToValueAtTime(freq * 0.8, time + dur)

  const gain = audioContext.createGain()
  gain.gain.setValueAtTime(0, time)
  gain.gain.linearRampToValueAtTime(0.2, time + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, time + dur)

  osc.connect(gain).connect(panner).connect(destination)
  osc.start(time)
  osc.stop(time + dur)
}

function createBirdWarble(
  audioContext: AudioContext | OfflineAudioContext,
  destination: AudioNode,
  time: number,
  freq: number,
  dur: number,
  pan: number,
) {
  const panner = new StereoPannerNode(audioContext, { pan })
  const osc = audioContext.createOscillator()
  osc.type = "triangle"
  osc.frequency.value = freq

  const gain = audioContext.createGain()
  gain.gain.setValueAtTime(0, time)
  gain.gain.linearRampToValueAtTime(0.15, time + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.001, time + dur)

  const lfo = audioContext.createOscillator()
  lfo.type = "sine"
  lfo.frequency.value = 15 + Math.random() * 10
  const lfoGain = audioContext.createGain()
  lfoGain.gain.value = freq * 0.1

  lfo.connect(lfoGain).connect(osc.frequency)
  osc.connect(gain).connect(panner).connect(destination)

  osc.start(time)
  lfo.start(time)
  osc.stop(time + dur)
  lfo.stop(time + dur)
}

async function generateHyperrealisticWind(
  audioContext: AudioContext | OfflineAudioContext,
  destination: AudioNode,
  duration: number,
): Promise<void> {
  // Layer 1: Low-frequency howl (brown noise)
  const howlBuffer = audioContext.createBuffer(2, audioContext.sampleRate * 3, audioContext.sampleRate)
  for (let channel = 0; channel < 2; channel++) {
    const data = howlBuffer.getChannelData(channel)
    let lastOut = 0
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1
      data[i] = (lastOut + 0.02 * white) / 1.02
      lastOut = data[i]
      data[i] *= 3.5
    }
  }
  const howlSource = audioContext.createBufferSource()
  howlSource.buffer = howlBuffer
  howlSource.loop = true

  const howlFilter = audioContext.createBiquadFilter()
  howlFilter.type = "lowpass"
  howlFilter.frequency.value = 250
  howlFilter.Q.value = 2

  const howlGain = audioContext.createGain()
  howlGain.gain.value = 0.3

  const howlLfo = audioContext.createOscillator()
  howlLfo.type = "sine"
  howlLfo.frequency.value = 0.1
  const howlLfoGain = audioContext.createGain()
  howlLfoGain.gain.value = 0.2
  howlLfo.connect(howlLfoGain).connect(howlGain.gain)

  howlSource.connect(howlFilter).connect(howlGain).connect(destination)

  // Layer 2: Mid-frequency whoosh (pink noise)
  const whooshSource = audioContext.createBufferSource()
  const pinkNoiseBuffer = await (async () => {
    const bufferSize = audioContext.sampleRate * 4
    const buffer = audioContext.createBuffer(2, bufferSize, audioContext.sampleRate)
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel)
      let b0 = 0,
        b1 = 0,
        b2 = 0,
        b3 = 0,
        b4 = 0,
        b5 = 0,
        b6 = 0
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        b0 = 0.99886 * b0 + white * 0.0555179
        b1 = 0.99332 * b1 + white * 0.0750759
        b2 = 0.969 * b2 + white * 0.153852
        b3 = 0.8665 * b3 + white * 0.3104856
        b4 = 0.55 * b4 + white * 0.5329522
        b5 = -0.7616 * b5 - white * 0.016898
        data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362
        data[i] *= 0.11
        b6 = white * 0.115926
      }
    }
    return buffer
  })()
  whooshSource.buffer = pinkNoiseBuffer
  whooshSource.loop = true

  const whooshFilter = audioContext.createBiquadFilter()
  whooshFilter.type = "bandpass"
  whooshFilter.Q.value = 1.5
  whooshFilter.frequency.value = 800

  const whooshGain = audioContext.createGain()
  whooshGain.gain.value = 0.4

  const whooshLfo = audioContext.createOscillator()
  whooshLfo.type = "sine"
  whooshLfo.frequency.value = 0.25
  const whooshLfoGain = audioContext.createGain()
  whooshLfoGain.gain.value = 0.3
  whooshLfo.connect(whooshLfoGain).connect(whooshGain.gain)

  const whooshFilterLfo = audioContext.createOscillator()
  whooshFilterLfo.type = "sine"
  whooshFilterLfo.frequency.value = 0.4
  const whooshFilterLfoGain = audioContext.createGain()
  whooshFilterLfoGain.gain.value = 400
  whooshFilterLfo.connect(whooshFilterLfoGain).connect(whooshFilter.frequency)

  whooshSource.connect(whooshFilter).connect(whooshGain).connect(destination)

  // Layer 3: High-frequency whistle/hiss
  const whistleSource = audioContext.createBufferSource()
  whistleSource.buffer = howlBuffer // reuse buffer
  whistleSource.loop = true

  const whistleFilter = audioContext.createBiquadFilter()
  whistleFilter.type = "bandpass"
  whistleFilter.Q.value = 20 // High Q for whistle
  whistleFilter.frequency.value = 3000

  const whistleGain = audioContext.createGain()
  whistleGain.gain.value = 0.1

  const whistleLfo = audioContext.createOscillator()
  whistleLfo.type = "sine"
  whistleLfo.frequency.value = 0.08
  const whistleLfoGain = audioContext.createGain()
  whistleLfoGain.gain.value = 1500 // Wide sweep for frequency
  whistleLfo.connect(whistleLfoGain).connect(whistleFilter.frequency)

  whistleSource.connect(whistleFilter).connect(whistleGain).connect(destination)

  // Start all
  howlSource.start(0)
  howlLfo.start(0)
  whooshSource.start(0)
  whooshLfo.start(0)
  whooshFilterLfo.start(0)
  whistleSource.start(0)
  whistleLfo.start(0)

  howlSource.stop(duration)
  howlLfo.stop(duration)
  whooshSource.stop(duration)
  whooshLfo.stop(duration)
  whooshFilterLfo.stop(duration)
  whistleSource.stop(duration)
  whistleLfo.stop(duration)
}

// Fallback simple noise generator
async function generateSimpleNoise(
  audioContext: AudioContext | OfflineAudioContext,
  destination: AudioNode,
  duration: number,
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
  gainNode.gain.setValueAtTime(1.0, 0) // Volume is controlled by master gain
  lastNode.connect(gainNode)
  gainNode.connect(destination)

  if (ambient.lfoFrequency) {
    const lfo = audioContext.createOscillator()
    const lfoGain = audioContext.createGain()
    lfo.frequency.setValueAtTime(ambient.lfoFrequency, 0)
    lfoGain.gain.setValueAtTime(0.5, 0) // Modulate by 50%
    lfo.connect(lfoGain)
    lfoGain.connect(gainNode.gain)
    lfo.start(0)
    lfo.stop(duration)
  }

  source.start(0)
  source.stop(duration)
}

function createSimpleReverbBuffer(
  audioContext: AudioContext | OfflineAudioContext,
  duration = 2,
  decay = 2,
): AudioBuffer {
  const sampleRate = audioContext.sampleRate
  const length = sampleRate * duration
  const impulse = audioContext.createBuffer(2, length, sampleRate)
  for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
    const data = impulse.getChannelData(channel)
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay)
    }
  }
  return impulse
}

export const defaultMeditation: Meditation = {
  id: "default-meditation-1",
  title: "Default Focus Meditation",
  timeline: [
    {
      id: "event-1",
      type: "sound_cue",
      duration: 5000,
      soundCueName: "Bell",
      soundCueSrc: "/sounds/bell.mp3",
      volume: 0.8,
      startOffset: 0,
    },
    {
      id: "event-2",
      type: "ambient_sound",
      duration: 60000,
      ambientSoundName: "Forest Rain",
      ambientSoundSrc: "/sounds/forest-rain.mp3",
      volume: 0.5,
      startOffset: 0,
    },
    {
      id: "event-3",
      type: "guided_meditation",
      duration: 120000,
      script: "Focus on your breath. Inhale deeply, exhale slowly.",
      voice: "standard",
      startOffset: 0,
    },
    {
      id: "event-4",
      type: "sound_cue",
      duration: 5000,
      soundCueName: "Gong",
      soundCueSrc: "/sounds/gong.mp3",
      volume: 0.7,
      startOffset: 0,
    },
    {
      id: "event-5",
      type: "ambient_sound",
      duration: 30000,
      ambientSoundName: "Ocean Waves",
      ambientSoundSrc: "/sounds/ocean-waves.mp3",
      volume: 0.6,
      startOffset: 0,
    },
    {
      id: "event-6",
      type: "guided_meditation",
      duration: 90000,
      script: "Feel your body relax. Let go of any tension.",
      voice: "standard",
      startOffset: 0,
    },
    {
      id: "event-7",
      type: "sound_cue",
      duration: 5000,
      soundCueName: "Chimes",
      soundCueSrc: "/sounds/chimes.mp3",
      volume: 0.9,
      startOffset: 0,
    },
  ],
}
