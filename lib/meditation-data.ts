import type { Instruction as ImportedInstruction, SoundCue as ImportedSoundCue } from "./types"
import type { AmbientSound } from "./types"
import * as Tone from "tone"

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

// Function to generate synthetic sounds using Tone.js
export async function generateSyntheticSound(
  soundCue: SoundCue,
  audioContext: AudioContext | OfflineAudioContext,
): Promise<void> {
  try {
    console.log(`[v0] Generating synthetic sound with Tone.js: ${soundCue.id}`)

    // Initialize Tone.js if not already done
    if (Tone.context.state !== "running") {
      console.log("[v0] Starting Tone.js context...")
      await Tone.start()
    }

    const totalSoundDurationSeconds = (soundCue.duration || 1000) / 1000
    const frequency = soundCue.frequency || 440
    const attackDuration = soundCue.attackDuration || 0.1
    const releaseDuration = soundCue.releaseDuration || 0.8

    let synth: Tone.Synth | Tone.FMSynth | Tone.MetalSynth | Tone.NoiseSynth

    // Choose appropriate Tone.js synthesizer based on sound characteristics
    if (soundCue.id.includes("bell") || soundCue.id.includes("singing_bowl")) {
      console.log(`[v0] Using FMSynth for bell sound: ${soundCue.id}`)
      // Use FMSynth for bell-like sounds
      synth = new Tone.FMSynth({
        harmonicity: 3.01,
        modulationIndex: 14,
        oscillator: { type: "sine" },
        envelope: {
          attack: attackDuration,
          decay: 0.2,
          sustain: 0.1,
          release: releaseDuration,
        },
        modulation: { type: "square" },
        modulationEnvelope: {
          attack: 0.01,
          decay: 0.2,
          sustain: 0,
          release: 0.2,
        },
      }).toDestination()
    } else if (soundCue.id.includes("chime")) {
      console.log(`[v0] Using MetalSynth for chime sound: ${soundCue.id}`)
      // Use MetalSynth for chime sounds
      synth = new Tone.MetalSynth({
        frequency: frequency,
        envelope: {
          attack: attackDuration,
          decay: 0.4,
          release: releaseDuration,
        },
        harmonicity: 5.1,
        modulationIndex: 32,
        resonance: 4000,
        octaves: 1.5,
      }).toDestination()
    } else if (soundCue.id.includes("wood")) {
      console.log(`[v0] Using NoiseSynth for wood sound: ${soundCue.id}`)
      // Use NoiseSynth for wood block sounds
      synth = new Tone.NoiseSynth({
        noise: { type: "brown" },
        envelope: {
          attack: attackDuration,
          decay: 0.1,
          sustain: 0,
          release: 0.1,
        },
      }).toDestination()
    } else {
      console.log(`[v0] Using regular Synth for sound: ${soundCue.id}`)
      // Use regular Synth for other sounds with pleasant envelope
      synth = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: {
          attack: attackDuration,
          decay: 0.2,
          sustain: 0.3,
          release: releaseDuration,
        },
      }).toDestination()
    }

    // Set volume to reasonable level
    synth.volume.value = Tone.gainToDb(0.5)

    // Play the sound
    if (synth instanceof Tone.NoiseSynth) {
      synth.triggerAttackRelease(totalSoundDurationSeconds)
      console.log(`[v0] Triggered NoiseSynth for ${totalSoundDurationSeconds}s`)
    } else {
      synth.triggerAttackRelease(frequency, totalSoundDurationSeconds)
      console.log(`[v0] Triggered synth at ${frequency}Hz for ${totalSoundDurationSeconds}s`)
    }

    // Clean up after sound finishes
    setTimeout(
      () => {
        synth.dispose()
        console.log(`[v0] Disposed Tone.js synth for ${soundCue.id}`)
      },
      (totalSoundDurationSeconds + 1) * 1000,
    )
  } catch (error) {
    console.error(`[v0] Error generating synthetic sound with Tone.js for ${soundCue.id}:`, error)
    throw error
  }
}

// Function to generate ambient sounds using Tone.js
export async function generateAmbientSound(
  ambient: AmbientSound,
  audioContext: AudioContext | OfflineAudioContext,
  duration: number,
  volumeOverride?: number,
): Promise<void> {
  try {
    // Initialize Tone.js if not already done
    if (Tone.context.state !== "running") {
      await Tone.start()
    }

    const targetVolume = volumeOverride ?? ambient.volume ?? 0.2

    let noise: Tone.Noise
    let filter: Tone.Filter
    let reverb: Tone.Reverb

    // Create appropriate noise type
    const noiseType = ambient.noiseType || "white"
    noise = new Tone.Noise(noiseType)

    // Create filter based on ambient sound type
    if (ambient.id === "rain") {
      filter = new Tone.Filter({
        frequency: 2000,
        type: "highpass",
        rolloff: -12,
      })
      reverb = new Tone.Reverb({
        decay: 2,
        wet: 0.3,
      })
    } else if (ambient.id === "waves") {
      filter = new Tone.Filter({
        frequency: 400,
        type: "lowpass",
        rolloff: -24,
      })
      reverb = new Tone.Reverb({
        decay: 4,
        wet: 0.5,
      })
    } else if (ambient.id === "forest") {
      filter = new Tone.Filter({
        frequency: 800,
        type: "bandpass",
        Q: 2,
      })
      reverb = new Tone.Reverb({
        decay: 3,
        wet: 0.4,
      })
    } else if (ambient.id === "wind") {
      filter = new Tone.Filter({
        frequency: 300,
        type: "lowpass",
        rolloff: -12,
      })
      reverb = new Tone.Reverb({
        decay: 1.5,
        wet: 0.2,
      })
    } else {
      // Default filter
      filter = new Tone.Filter({
        frequency: ambient.filterFrequency || 1000,
        type: ambient.filterType || "lowpass",
      })
      reverb = new Tone.Reverb({
        decay: 2,
        wet: 0.3,
      })
    }

    // Create LFO for modulation if specified
    let lfo: Tone.LFO | undefined
    if (ambient.lfoFrequency) {
      lfo = new Tone.LFO({
        frequency: ambient.lfoFrequency,
        type: "sine",
        amplitude: 0.3,
      })
      lfo.connect(filter.frequency)
      lfo.start()
    }

    // Connect the chain: noise -> filter -> reverb -> destination
    noise.chain(filter, reverb, Tone.Destination)

    // Set volume
    noise.volume.value = Tone.gainToDb(targetVolume)

    // Start the noise
    noise.start()

    // Stop after duration and clean up
    setTimeout(() => {
      noise.stop()
      setTimeout(() => {
        noise.dispose()
        filter.dispose()
        reverb.dispose()
        if (lfo) lfo.dispose()
      }, 100)
    }, duration * 1000)
  } catch (error) {
    console.error(`Error generating ambient sound for ${ambient.id} with Tone.js:`, error)
    throw error
  }
}
