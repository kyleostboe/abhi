import type { Instruction as ImportedInstruction, SoundCue as ImportedSoundCue, AmbientSound } from "./types"
import { generateSimpleNoise } from "./noiseGenerators"

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
    text: 'Resting as the source of the "I" thought',
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

// Musical meditation notes grouped into pleasant octaves
export const MUSICAL_NOTES = {
  Beautiful: [
    { id: "note-c3", name: "C3", note: "C", octave: 3 },
    { id: "note-d3", name: "D3", note: "D", octave: 3 },
    { id: "note-e3", name: "E3", note: "E", octave: 3 },
    { id: "note-g3", name: "G3", note: "G", octave: 3 },
    { id: "note-a3", name: "A3", note: "A", octave: 3 },
    { id: "note-c4", name: "C4", note: "C", octave: 4 },
    { id: "note-d4", name: "D4", note: "D", octave: 4 },
    { id: "note-e4", name: "E4", note: "E", octave: 4 },
    { id: "note-g4", name: "G4", note: "G", octave: 4 },
    { id: "note-a4", name: "A4", note: "A", octave: 4 },
    { id: "note-c5", name: "C5", note: "C", octave: 5 },
    { id: "note-d5", name: "D5", note: "D", octave: 5 },
    { id: "note-e5", name: "E5", note: "E", octave: 5 },
    { id: "note-g5", name: "G5", note: "G", octave: 5 },
    { id: "note-a5", name: "A5", note: "A", octave: 5 },
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
  } finally {
    if (audioContext instanceof AudioContext && audioContext.state !== "closed") {
      audioContext.close()
    }
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
  rumbleFilter.frequency.value = 250
  rumbleFilter.Q.value = 2

  const rumbleGain = audioContext.createGain()
  rumbleGain.gain.value = 0.3

  const howlLfo = audioContext.createOscillator()
  howlLfo.type = "sine"
  howlLfo.frequency.value = 0.1
  const howlLfoGain = audioContext.createGain()
  howlLfoGain.gain.value = 0.2
  howlLfo.connect(howlLfoGain).connect(rumbleGain.gain)

  rumbleSource.connect(rumbleFilter).connect(rumbleGain).connect(destination)

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
  whistleSource.buffer = pinkNoiseBuffer // reuse buffer
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
  whooshSource.start(0)
  whooshLfo.start(0)
  whooshFilterLfo.start(0)
  whistleSource.start(0)
  whistleLfo.start(0)

  whooshSource.stop(duration)
  whooshLfo.stop(duration)
  whooshFilterLfo.stop(duration)
  whistleSource.stop(duration)
  whistleLfo.stop(duration)
}

async function generateHyperrealisticWaves(
  audioContext: AudioContext | OfflineAudioContext,
  destination: AudioNode,
  duration: number,
): Promise<void> {
  // Implementation for generateHyperrealisticWaves
}

async function generateHyperrealisticForest(
  audioContext: AudioContext | OfflineAudioContext,
  destination: AudioNode,
  duration: number,
): Promise<void> {
  // Implementation for generateHyperrealisticForest
}

async function generateHyperrealisticWind(
  audioContext: AudioContext | OfflineAudioContext,
  destination: AudioNode,
  duration: number,
): Promise<void> {
  // Implementation for generateHyperrealisticWind
}

function createRaindrop(
  audioContext: AudioContext | OfflineAudioContext,
  destination: AudioNode,
  dropTime: number,
): void {
  // Implementation for createRaindrop
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
