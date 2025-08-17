import type { Instruction as ImportedInstruction, SoundCue as ImportedSoundCue } from "./types"
import type { AmbientSound } from "./types"
import * as Tone from "tone"

export interface Instruction extends ImportedInstruction {
  // Additional properties can be added here if needed
}

export interface SoundCue extends ImportedSoundCue {
  // Additional properties can be added here if needed
}

export async function startAudio() {
  await Tone.start()
  // build reverb IRs once so first notes aren't dry
  await Promise.all([verbLong.generate(), verbShort.generate()])
  Tone.getDestination().volume.value = -8 // headroom
}

const bus = new Tone.Gain().toDestination()
const verbLong = new Tone.Reverb({ decay: 3.2, preDelay: 0.01, wet: 0.28 }).connect(bus)
const verbShort = new Tone.Reverb({ decay: 1.2, preDelay: 0.0, wet: 0.2 }).connect(bus)
const T = () => Tone.now()

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

const noteSynth = new Tone.PolySynth(Tone.Synth, {
  oscillator: {
    type: "fatsawtooth", // More complex waveform for richer harmonics
    count: 3,
    spread: 30,
  },
  envelope: {
    attack: 0.02, // Slightly slower attack for more natural piano feel
    decay: 0.3, // Longer decay for sustained resonance
    sustain: 0.1, // Lower sustain for piano-like behavior
    release: 1.2, // Longer release for natural piano decay
  },
  filter: {
    type: "lowpass",
    frequency: 8000,
    rolloff: -24,
  },
  filterEnvelope: {
    attack: 0.02,
    decay: 0.2,
    sustain: 0.5,
    release: 1.0,
    baseFrequency: 300,
    octaves: 4,
  },
}).connect(verbShort)
noteSynth.maxPolyphony = 8
noteSynth.volume.value = -8 // Slightly quieter for more realistic dynamics

export function playNote(noteOrIndex: string | number, dur = 0.5, vel = 0.9) {
  const note = typeof noteOrIndex === "number" ? NOTES[noteOrIndex % NOTES.length] : noteOrIndex
  noteSynth.triggerAttackRelease(note, dur, T(), vel)
}

// Bells / gongs (MetalSynth voices inside PolySynth)
const bellPoly = new Tone.PolySynth(Tone.MetalSynth, {
  harmonicity: 5.1,
  modulationIndex: 32,
  resonance: 800,
  octaves: 1.5,
  envelope: { attack: 0.001, decay: 1.2, release: 0.2 },
}).connect(verbLong)
bellPoly.maxPolyphony = 6
bellPoly.volume.value = -4

const softBell = new Tone.PolySynth(Tone.MetalSynth, {
  harmonicity: 8,
  modulationIndex: 20,
  resonance: 1200,
  octaves: 1.2,
  envelope: { attack: 0.002, decay: 1.6, release: 0.4 },
}).connect(verbLong)
softBell.maxPolyphony = 4
softBell.volume.value = -6

const gong = new Tone.PolySynth(Tone.MetalSynth, {
  harmonicity: 2.5,
  modulationIndex: 10,
  resonance: 500,
  octaves: 0.8,
  envelope: { attack: 0.003, decay: 2.4, release: 0.8 },
}).connect(verbLong)
gong.maxPolyphony = 3
gong.volume.value = -6

// Wood / perc
const wood = new Tone.MembraneSynth({
  pitchDecay: 0.002,
  octaves: 2,
  oscillator: { type: "sine" },
  envelope: { attack: 0.001, decay: 0.08, sustain: 0.0, release: 0.02 },
}).connect(bus)
wood.volume.value = -8

const rimNoise = new Tone.NoiseSynth({
  noise: { type: "white" },
  envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.02 },
})
const rimFilter = new Tone.Filter({ type: "bandpass", frequency: 2500, Q: 8 }).connect(bus)
rimNoise.connect(rimFilter)

// Air / nature
const pink = new Tone.Noise("pink")
const pinkEnv = new Tone.AmplitudeEnvelope({
  attack: 0.08,
  decay: 0.15,
  sustain: 0.6,
  release: 0.25,
}).connect(bus)
pink.connect(pinkEnv)

const whooshFilter = new Tone.Filter({ type: "lowpass", frequency: 300, Q: 0 }).connect(verbShort)
const whooshEnv = new Tone.AmplitudeEnvelope({
  attack: 0.05,
  decay: 0.1,
  sustain: 0.7,
  release: 0.3,
}).connect(whooshFilter)
const whooshNoise = new Tone.Noise("pink").connect(whooshEnv)

const drop = new Tone.MembraneSynth({
  pitchDecay: 0.02,
  octaves: 6,
  oscillator: { type: "sine" },
  envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.12 },
}).connect(verbShort)
drop.volume.value = -10

// helper
function bellHit(engine: any, notes: string[], dur = "8n", vel = 0.9, time = T()) {
  engine.triggerAttackRelease(notes, dur, time, vel)
}

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
  const t = T()
  switch (name) {
    // ——— BELLS & CHIMES ———
    case "Bright handbell":
      bellHit(bellPoly, ["E5"], "4n", 0.9, t)
      break
    case "Low bowl bell":
      bellHit(bellPoly, ["A3"], "2n", 0.85, t)
      break
    case "Soft temple bell":
      bellHit(softBell, ["D5"], "4n", 0.85, t)
      break
    case "High chime":
      bellHit(bellPoly, ["C6"], "8n", 0.85, t)
      break
    case "Chime double":
      bellHit(bellPoly, ["G5"], "8n", 0.8, t)
      bellHit(bellPoly, ["G5"], "8n", 0.8, t + 0.6)
      break
    case "Chime triple up": {
      ;["C5", "D5", "E5"].forEach((n, i) => bellHit(bellPoly, [n], "8n", 0.8, t + i * 0.35))
      break
    }
    case "Chime triple down": {
      ;["E5", "D5", "C5"].forEach((n, i) => bellHit(bellPoly, [n], "8n", 0.8, t + i * 0.35))
      break
    }
    case "Fifth-dyad bell":
      bellHit(bellPoly, ["C4", "G4"], "2n", 0.85, t)
      break
    case "Octave bell":
      bellHit(bellPoly, ["A4", "A5"], "2n", 0.85, t)
      break
    case "Shimmer arpeggio": {
      ;["A4", "B4", "D5", "E5"].forEach((n, i) => bellHit(softBell, [n], "8n", 0.75, t + i * 0.25))
      break
    }

    // ——— GONGS ———
    case "Tam-tam soft":
      bellHit(gong, ["D3"], "2n", 0.8, t)
      break
    case "Wind gong":
      whoosh()
      bellHit(gong, ["A2"], "2n", 0.6, t + 0.05)
      break
    case "Nipple gong":
      bellHit(gong, ["D4"], "2n", 0.85, t)
      break
    case "Opera gong":
      bellHit(gong, ["G4"], "4n", 0.8, t)
      break

    // ——— WOOD ———
    case "Woodblock tok":
      wood.triggerAttackRelease("G5", 0.06, t, 0.8)
      break
    case "Bamboo click":
      wood.triggerAttackRelease("E5", 0.05, t, 0.65)
      wood.triggerAttackRelease("E5", 0.05, t + 0.28, 0.6)
      break
    case "Rim knock":
      rimNoise.triggerAttackRelease(0.05, t)
      break

    // ——— AIR / NATURE ———
    case "Pink swell":
      pinkSwell(0.9)
      break
    case "Whoosh":
      whoosh()
      break
    case "Water drop":
      drop.triggerAttackRelease("C6", "16n", t, 0.8)
      break

    default:
      console.warn(`Unknown sound "${name}". Available:`, SOUNDS)
  }
}

// helpers for the noise cues
function pinkSwell(length = 0.9) {
  const t = T()
  pink.start(t)
  pinkEnv.triggerAttackRelease(length, t)
  pink.stop(t + length + 0.05) // safety stop
}

function whoosh() {
  const t = T()
  whooshNoise.start(t)
  whooshEnv.triggerAttackRelease(0.7, t)
  whooshFilter.frequency.cancelAndHoldAtTime(t)
  whooshFilter.frequency.linearRampTo(4000, 0.5, t)
  whooshFilter.frequency.linearRampTo(300, 0.2, t + 0.5)
  whooshNoise.stop(t + 0.9)
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

export const SOUND_CUES_LIBRARY: SoundCue[] = []

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
    console.log(`[v0] Using GPT-5 sound system for: ${soundCue.name}`)

    // Initialize audio if needed
    if (Tone.context.state !== "running") {
      await startAudio()
    }

    // Use the GPT-5 playSound function
    playSound(soundCue.name)
  } catch (error) {
    console.error(`[v0] Error with GPT-5 sound generation for ${soundCue.id}:`, error)
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
    if (Tone.context.state !== "running") {
      await Tone.start()
    }

    const targetVolume = volumeOverride ?? ambient.volume ?? 0.2
    let noise: Tone.Noise
    let filter: Tone.Filter
    let reverb: Tone.Reverb

    const noiseType = ambient.noiseType || "white"
    noise = new Tone.Noise(noiseType)

    if (ambient.id === "rain") {
      filter = new Tone.Filter({ frequency: 2000, type: "highpass", rolloff: -12 })
      reverb = new Tone.Reverb({ decay: 2, wet: 0.3 })
    } else if (ambient.id === "waves") {
      filter = new Tone.Filter({ frequency: 400, type: "lowpass", rolloff: -24 })
      reverb = new Tone.Reverb({ decay: 4, wet: 0.5 })
    } else if (ambient.id === "forest") {
      filter = new Tone.Filter({ frequency: 800, type: "bandpass", Q: 2 })
      reverb = new Tone.Reverb({ decay: 3, wet: 0.4 })
    } else if (ambient.id === "wind") {
      filter = new Tone.Filter({ frequency: 300, type: "lowpass", rolloff: -12 })
      reverb = new Tone.Reverb({ decay: 1.5, wet: 0.2 })
    } else {
      filter = new Tone.Filter({
        frequency: ambient.filterFrequency || 1000,
        type: ambient.filterType || "lowpass",
      })
      reverb = new Tone.Reverb({ decay: 2, wet: 0.3 })
    }

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

    noise.chain(filter, reverb, Tone.Destination)
    noise.volume.value = Tone.gainToDb(targetVolume)
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
