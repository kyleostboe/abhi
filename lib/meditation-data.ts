import type { Instruction as ImportedInstruction, SoundCue as ImportedSoundCue } from "./types"
import type { AmbientSound } from "./types"

export interface Instruction extends ImportedInstruction {
  // Additional properties can be added here if needed
}

export interface SoundCue extends ImportedSoundCue {
  // Additional properties can be added here if needed
}

const ToneNS = typeof window !== "undefined" && (window as any).Tone ? (window as any).Tone : null
let ToneLib = ToneNS

async function ensureTone() {
  if (ToneLib) return ToneLib
  const mod = await import("tone")
  ToneLib = mod
  return ToneLib
}

export const NOTES = [
  "C4",
  "D4",
  "E4",
  "F4",
  "G4",
  "A4",
  "B4",
  "C5",
  "D5",
  "E5",
  "F5",
  "G5",
  "A5",
  "B5",
  "C6",
  "D6",
  "E6",
  "F6",
  "G6",
  "A6",
]

let sampler = null
let reverb = null
let isLoading = false
let isLoaded = false

export async function startAudio() {
  const Tone = await ensureTone()

  if (Tone.context.state === "closed") {
    console.log("[v0] AudioContext is closed, creating new context...")
    // Dispose existing context and create new one
    Tone.context.dispose()
    await Tone.setContext(new AudioContext())
  }

  // Start the audio context
  if (Tone.context.state !== "running") {
    console.log("[v0] Starting Tone.js audio context...")
    await Tone.start()
  }
}

export async function loadPiano({ wet = 0.18, decay = 2.8 } = {}) {
  if (isLoading || isLoaded) return // Prevent multiple loading attempts

  isLoading = true
  const Tone = await ensureTone()

  try {
    await startAudio()

    if (sampler) {
      sampler.dispose()
      sampler = null
    }
    if (reverb) {
      reverb.dispose()
      reverb = null
    }

    // Light room reverb for realism
    reverb = new Tone.Reverb({ wet, decay, preDelay: 0.01 }).toDestination()
    await reverb.generate()

    sampler = new Tone.Sampler({
      urls: {
        A0: "A0.mp3",
        C1: "C1.mp3",
        "D#1": "Ds1.mp3",
        "F#1": "Fs1.mp3",
        A1: "A1.mp3",
        C2: "C2.mp3",
        "D#2": "Ds2.mp3",
        "F#2": "Fs2.mp3",
        A2: "A2.mp3",
        C3: "C3.mp3",
        "D#3": "Ds3.mp3",
        "F#3": "Fs3.mp3",
        A3: "A3.mp3",
        C4: "C4.mp3",
        "D#4": "Ds4.mp3",
        "F#4": "Fs4.mp3",
        A4: "A4.mp3",
        C5: "C5.mp3",
        "D#5": "Ds5.mp3",
        "F#5": "Fs5.mp3",
        A5: "A5.mp3",
        C6: "C6.mp3",
        "D#6": "Ds6.mp3",
        "F#6": "Fs6.mp3",
        A6: "A6.mp3",
        C7: "C7.mp3",
        "D#7": "Ds7.mp3",
        "F#7": "Fs7.mp3",
        A7: "A7.mp3",
        C8: "C8.mp3",
      },
      release: 1.2,
      baseUrl: "https://tonejs.github.io/audio/salamander/",
    }).connect(reverb)

    await new Promise((resolve) => {
      const checkLoaded = () => {
        if (sampler.loaded) {
          resolve(true)
        } else {
          setTimeout(checkLoaded, 100)
        }
      }
      checkLoaded()
    })

    isLoaded = true
    console.log("[v0] Piano sampler fully loaded and ready")
  } catch (error) {
    console.error("[v0] Error loading piano:", error)
    isLoaded = false
    throw error
  } finally {
    isLoading = false
  }
}

export async function playNote(noteOrIndex: string | number, seconds = 0.45, velocity = 0.9) {
  try {
    await startAudio()

    if (!isLoaded) {
      console.log("[v0] Piano not loaded, initializing...")
      await loadPiano()
    }

    if (!sampler || !sampler.loaded) {
      throw new Error("Piano sampler is not loaded")
    }

    const Tone = ToneLib
    const note =
      typeof noteOrIndex === "number" ? NOTES[Math.max(0, Math.min(NOTES.length - 1, noteOrIndex))] : noteOrIndex

    console.log(`[v0] Playing piano note: ${note}`)
    sampler.triggerAttackRelease(note, seconds, Tone.now(), velocity)
  } catch (error) {
    console.error("[v0] Error playing piano note:", error)
    isLoaded = false
    throw error
  }
}

export function playPianoNote(note: string, duration = 0.45, velocity = 0.9) {
  return playNote(note, duration, velocity)
}

export function disposePiano() {
  if (sampler) {
    sampler.dispose()
    sampler = null
  }
  if (reverb) {
    reverb.dispose()
    reverb = null
  }
}

export const SOUND_CUES_LIBRARY: SoundCue[] = []

export const SOUNDS = [
  "Bright handbell",
  "Low bowl bell",
  "Soft temple bell",
  "High chime",
  "Chime double",
  "Chime triple up",
  "Chime triple down",
  "Fifth-dyad bell",
  "Octave bell",
  "Shimmer arpeggio",
  "Tam-tam soft",
  "Wind gong",
  "Nipple gong",
  "Opera gong",
  "Woodblock tok",
  "Bamboo click",
  "Rim knock",
  "Pink swell",
  "Whoosh",
  "Water drop",
]

export function playSound(name: string) {
  const t = ToneLib.now()
  switch (name) {
    // ——— BELLS & CHIMES ———
    case "Bright handbell":
      // Placeholder for bell sound
      break
    case "Low bowl bell":
      // Placeholder for bell sound
      break
    case "Soft temple bell":
      // Placeholder for bell sound
      break
    case "High chime":
      // Placeholder for bell sound
      break
    case "Chime double":
      // Placeholder for bell sound
      break
    case "Chime triple up":
      // Placeholder for bell sound
      break
    case "Chime triple down":
      // Placeholder for bell sound
      break
    case "Fifth-dyad bell":
      // Placeholder for bell sound
      break
    case "Octave bell":
      // Placeholder for bell sound
      break
    case "Shimmer arpeggio":
      // Placeholder for bell sound
      break

    // ——— GONGS ———
    case "Tam-tam soft":
      // Placeholder for gong sound
      break
    case "Wind gong":
      // Placeholder for gong sound
      break
    case "Nipple gong":
      // Placeholder for gong sound
      break
    case "Opera gong":
      // Placeholder for gong sound
      break

    // ——— WOOD ———
    case "Woodblock tok":
      // Placeholder for wood sound
      break
    case "Bamboo click":
      // Placeholder for wood sound
      break
    case "Rim knock":
      // Placeholder for wood sound
      break

    // ——— AIR / NATURE ———
    case "Pink swell":
      // Placeholder for air/nature sound
      break
    case "Whoosh":
      // Placeholder for air/nature sound
      break
    case "Water drop":
      // Placeholder for air/nature sound
      break

    default:
      console.warn(`Unknown sound "${name}". Available:`, SOUNDS)
  }
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
    text: "Recognizing what I already am",
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
  C6: 1046.5,
  D6: 1174.66,
  E6: 1318.51,
  F6: 1396.91,
  G6: 1567.98,
  A6: 1760.0,
  C7: 1046.5 * 2,
  C8: 1046.5 * 4,
}

// Musical meditation notes grouped into pleasant octaves
export const MUSICAL_NOTES = {
  Beautiful: NOTES.map((note, index) => ({
    id: `note-${note.toLowerCase().replace("#", "s")}`,
    name: note,
    note: note.charAt(0),
    octave: Number.parseInt(note.charAt(1)),
  })),
}

export async function generateSyntheticSound(
  soundCue: SoundCue,
  audioContext: AudioContext | OfflineAudioContext,
): Promise<void> {
  try {
    console.log(`[v0] Using piano sampler for: ${soundCue.name}`)

    // Initialize audio if needed
    const Tone = await ensureTone()
    if (Tone.context.state !== "running") {
      await startAudio()
    }

    // Load piano if not already loaded
    if (!sampler) {
      await loadPiano()
    }

    // Play the sound using piano sampler
    playNote(soundCue.name, 0.45, 0.9)
  } catch (error) {
    console.error(`[v0] Error with piano sampler for ${soundCue.id}:`, error)
    throw error
  }
}

export async function generateAmbientSound(
  ambient: AmbientSound,
  audioContext: AudioContext | OfflineAudioContext,
  duration: number,
  volumeOverride?: number,
): Promise<void> {
  // Keep existing ambient sound generation for compatibility
  try {
    if (ToneLib.context.state !== "running") {
      await ToneLib.start()
    }

    const targetVolume = volumeOverride ?? ambient.volume ?? 0.2
    let noise: ToneLib.Noise
    let filter: ToneLib.Filter
    let reverb: ToneLib.Reverb

    const noiseType = ambient.noiseType || "white"
    noise = new ToneLib.Noise(noiseType)

    if (ambient.id === "rain") {
      filter = new ToneLib.Filter({ frequency: 2000, type: "highpass", rolloff: -12 })
      reverb = new ToneLib.Reverb({ decay: 2, wet: 0.3 })
    } else if (ambient.id === "waves") {
      filter = new ToneLib.Filter({ frequency: 400, type: "lowpass", rolloff: -24 })
      reverb = new ToneLib.Reverb({ decay: 4, wet: 0.5 })
    } else if (ambient.id === "forest") {
      filter = new ToneLib.Filter({ frequency: 800, type: "bandpass", Q: 2 })
      reverb = new ToneLib.Reverb({ decay: 3, wet: 0.4 })
    } else if (ambient.id === "wind") {
      filter = new ToneLib.Filter({ frequency: 300, type: "lowpass", rolloff: -12 })
      reverb = new ToneLib.Reverb({ decay: 1.5, wet: 0.2 })
    } else {
      filter = new ToneLib.Filter({
        frequency: ambient.filterFrequency || 1000,
        type: ambient.filterType || "lowpass",
      })
      reverb = new ToneLib.Reverb({ decay: 2, wet: 0.3 })
    }

    let lfo: ToneLib.LFO | undefined
    if (ambient.lfoFrequency) {
      lfo = new ToneLib.LFO({
        frequency: ambient.lfoFrequency,
        type: "sine",
        amplitude: 0.3,
      })
      lfo.connect(filter.frequency)
      lfo.start()
    }

    noise.chain(filter, reverb, ToneLib.Destination)
    noise.volume.value = ToneLib.gainToDb(targetVolume)
    noise.start()

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
