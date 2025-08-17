// meditation-data.ts
// Meditation data + Kalimba (Thumb Piano) engine using Tone.js
// - Keeps your existing sound/ambient libraries and WebAudio synthetic generator
// - Replaces "piano" with a Kalimba-style plucked engine (Tone.PluckSynth)
// - Adds chords: every note in the Beautiful set maps to a chord built ONLY from the same Beautiful notes

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
import type { Instruction as ImportedInstruction, SoundCue as ImportedSoundCue } from "./types"
import type { AmbientSound } from "./types"

/* ------------------------------------------------------------------ */
/* Public interfaces                                                   */
/* ------------------------------------------------------------------ */
export interface Instruction extends ImportedInstruction {
  // Additional properties can be added here if needed
}

export interface SoundCue extends ImportedSoundCue {
  frequency?: number
  duration?: number
  waveform?: OscillatorType | string
  harmonics?: number[]
  attackDuration?: number
  releaseDuration?: number
}

/* ------------------------------------------------------------------ */
/* Sound cue library (files + synthetic descriptors)                   */
/* ------------------------------------------------------------------ */
export const SOUND_CUES_LIBRARY: SoundCue[] = [
  { id: "sound1", name: "Singing Bowl (Short)", src: "/sounds/singing-bowl-short.mp3" },
  { id: "sound2", name: "Gentle Chime", src: "/sounds/chime-gentle.mp3" },
  { id: "sound3", name: "Soft Gong", src: "/sounds/soft-gong.mp3" },
  { id: "sound4", name: "Short Bell", src: "/sounds/short-bell.mp3" },
  { id: "sound5", name: "Clear Tone", src: "/sounds/clear-tone.mp3" },

  // Synthetic (renderable via generateSyntheticSound)
  {
    id: "singing_bowl",
    name: "Singing Bowl",
    src: "synthetic:singing_bowl",
    frequency: 432,
    duration: 2500,
    waveform: "sine",
    harmonics: [864, 1296, 1728],
    attackDuration: 0.1,
    releaseDuration: 2.0,
  },
  {
    id: "gentle_chime",
    name: "Gentle Chime",
    src: "synthetic:chime_gentle",
    frequency: 1200,
    duration: 700,
    waveform: "triangle",
    attackDuration: 0.01,
    releaseDuration: 0.5,
  },
  {
    id: "soft_gong",
    name: "Soft Gong",
    src: "synthetic:soft_gong",
    frequency: 180,
    duration: 3000,
    waveform: "sine",
    harmonics: [360, 540, 720],
    attackDuration: 0.2,
    releaseDuration: 2.5,
  },
  {
    id: "short_bell",
    name: "Short Bell",
    src: "synthetic:short_bell",
    frequency: 1500,
    duration: 500,
    waveform: "square",
    attackDuration: 0.005,
    releaseDuration: 0.2,
  },
  {
    id: "clear_tone",
    name: "Clear Tone",
    src: "synthetic:clear_tone",
    frequency: 528,
    duration: 1500,
    waveform: "sine",
    attackDuration: 0.05,
    releaseDuration: 1.0,
  },
]

/* ------------------------------------------------------------------ */
/* Ambient sounds                                                      */
/* ------------------------------------------------------------------ */
export const AMBIENT_SOUNDS_LIBRARY: AmbientSound[] = [
  {
    id: "synthetic_rain",
    name: "Synthetic Rain",
    src: "synthetic:rain",
    noiseType: "white",
    filterType: "highpass",
    filterFrequency: 1000,
    lfoFrequency: 20,
    volume: 0.2,
  },
  {
    id: "synthetic_waves",
    name: "Synthetic Ocean Waves",
    src: "synthetic:waves",
    noiseType: "white",
    filterType: "lowpass",
    filterFrequency: 500,
    lfoFrequency: 0.2,
    volume: 0.25,
  },
  {
    id: "synthetic_forest",
    name: "Synthetic Forest",
    src: "synthetic:forest",
    noiseType: "brown",
    filterType: "lowpass",
    filterFrequency: 800,
    lfoFrequency: 0.5,
    volume: 0.2,
  },
  {
    id: "synthetic_wind",
    name: "Synthetic Wind",
    src: "synthetic:wind",
    noiseType: "white",
    filterType: "lowpass",
    filterFrequency: 400,
    lfoFrequency: 0.1,
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

/* ------------------------------------------------------------------ */
/* Note frequencies                                                    */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/* Musical notes (Beautiful set)                                       */
/* ------------------------------------------------------------------ */
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

/** Convenience list like ["C3","D3",...]. These drive the kalimba player. */
export const KALIMBA_NOTE_NAMES: string[] = MUSICAL_NOTES.Beautiful.map((n) => `${n.note}${n.octave}`)

/* ------------------------------------------------------------------ */
/* Beautiful-set CHORDS                                                */
/* Each root maps to a triad built only from Beautiful notes (C D E G A).
   These are pentatonic-flavored stacks that sound consonant on kalimba.     */
/* ------------------------------------------------------------------ */
export const BEAUTIFUL_CHORDS: Record<string, string[]> = {
  // octave 3
  C3: ["C3", "E3", "G3"],
  D3: ["D3", "G3", "A3"],
  E3: ["E3", "A3", "C4"],
  G3: ["G3", "C4", "D4"],
  A3: ["A3", "D4", "E4"],
  // octave 4
  C4: ["C4", "E4", "G4"],
  D4: ["D4", "G4", "A4"],
  E4: ["E4", "A4", "C5"],
  G4: ["G4", "C5", "D5"],
  A4: ["A4", "D5", "E5"],
  // octave 5
  C5: ["C5", "E5", "G5"],
  D5: ["D5", "G5", "A5"],
  E5: ["E5", "A5", "C5"], // in-set voicing (pleasant quartal/tertian color)
  G5: ["G5", "C5", "D5"],
  A5: ["A5", "D5", "E5"],
}

/* ------------------------------------------------------------------ */
/* Synthetic tone generator (Web Audio API)                            */
/* ------------------------------------------------------------------ */
export async function generateSyntheticSound(
  soundCue: SoundCue,
  audioContext: AudioContext | OfflineAudioContext,
): Promise<void> {
  try {
    if (audioContext instanceof AudioContext && audioContext.state === "suspended") {
      await audioContext.resume()
    }

    const totalSoundDurationSeconds = (soundCue.duration || 1000) / 1000
    const frequency = soundCue.frequency || 440
    const waveform = (soundCue.waveform as OscillatorType) || "sine"
    const attackDuration = soundCue.attackDuration ?? 0.01
    const releaseDuration = soundCue.releaseDuration ?? 0.5

    const now = audioContext.currentTime
    const peakVolume = 0.5
    const endVolume = 0.001

    const osc = audioContext.createOscillator()
    const gain = audioContext.createGain()
    osc.type = waveform
    osc.frequency.setValueAtTime(frequency, now)
    osc.connect(gain)
    gain.connect(audioContext.destination)

    // ADSR-ish envelope
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(peakVolume, now + attackDuration)

    const sustainStart = now + attackDuration
    const releaseStart = now + totalSoundDurationSeconds - releaseDuration
    if (releaseStart > sustainStart) {
      gain.gain.linearRampToValueAtTime(peakVolume, releaseStart)
    } else {
      gain.gain.linearRampToValueAtTime(
        peakVolume,
        Math.max(now + attackDuration, now + totalSoundDurationSeconds - releaseDuration),
      )
    }
    gain.gain.exponentialRampToValueAtTime(endVolume, now + totalSoundDurationSeconds)

    // Harmonics (quieter, same envelope shape)
    if (soundCue.harmonics?.length) {
      soundCue.harmonics.forEach((h, i) => {
        const ho = audioContext.createOscillator()
        const hg = audioContext.createGain()
        ho.type = waveform
        ho.frequency.setValueAtTime(h, now)
        ho.connect(hg)
        hg.connect(audioContext.destination)

        const hv = (peakVolume * 0.2) / (i + 1)
        hg.gain.setValueAtTime(0, now)
        hg.gain.linearRampToValueAtTime(hv, now + attackDuration)
        if (releaseStart > sustainStart) {
          hg.gain.linearRampToValueAtTime(hv, releaseStart)
        } else {
          hg.gain.linearRampToValueAtTime(
            hv,
            Math.max(now + attackDuration, now + totalSoundDurationSeconds - releaseDuration),
          )
        }
        hg.gain.exponentialRampToValueAtTime(endVolume, now + totalSoundDurationSeconds)

        ho.start(now)
        ho.stop(now + totalSoundDurationSeconds)
      })
    }

    osc.start(now)
    osc.stop(now + totalSoundDurationSeconds)

    // Optional: close context after rendering (skip if you reuse it elsewhere)
    if (audioContext instanceof AudioContext) {
      setTimeout(
        () => {
          try {
            audioContext.close()
          } catch {}
        },
        totalSoundDurationSeconds * 1000 + 100,
      )
    }
  } catch (err) {
    console.error("Error generating synthetic sound:", err)
    throw err
  }
}

/* ------------------------------------------------------------------ */
/* Kalimba Engine (Tone.js PluckSynth)                                 */
/* ------------------------------------------------------------------ */
import * as Tone from "tone"

let _kalimbaSynth: Tone.PluckSynth | null = null
let _kalimbaEQ: Tone.EQ3 | null = null
let _kalimbaReverb: Tone.Reverb | null = null
let _kalimbaGain: Tone.Gain | null = null

/** Must be called from a user gesture before any playback */
export async function startKalimbaAudio(): Promise<void> {
  await Tone.start()
}

/** Create Kalimba signal chain (shorter, still-natural tail) */
export async function initKalimba(opts?: {
  volume?: number // dB
  reverbWet?: number
  reverbDecay?: number
  dampening?: number // Hz — higher = quicker decay
  resonance?: number // 0..1 — lower trims ring
  attackNoise?: number // 0..20 — more initial "pluck"
}) {
  const {
    volume = -10,
    reverbWet = 0.18,
    reverbDecay = 2.6,
    dampening = 4000, // ↑ slightly quicker decay than 3000
    resonance = 0.9, // ↓ a touch less ring
    attackNoise = 1.0,
  } = opts || {}

  disposeKalimba()

  _kalimbaSynth = new Tone.PluckSynth({ dampening, resonance, attackNoise })
  _kalimbaEQ = new Tone.EQ3({ low: -1, mid: 0, high: -2, lowFrequency: 200, highFrequency: 6000 })
  _kalimbaReverb = new Tone.Reverb({ wet: reverbWet, decay: reverbDecay, preDelay: 0.01 })
  await _kalimbaReverb.generate()
  _kalimbaGain = new Tone.Gain(Tone.dbToGain(volume))

  _kalimbaSynth.chain(_kalimbaEQ, _kalimbaReverb, _kalimbaGain, Tone.getDestination())
}

/** Play a single kalimba note (natural tail, slightly shortened by synth params) */
export function playKalimbaNote(note: string, velocity = 0.9): void {
  if (!_kalimbaSynth) return
  _kalimbaSynth.triggerAttack(note, Tone.now(), velocity)
}

/** Play by index into KALIMBA_NOTE_NAMES */
export function playKalimbaIndex(index: number, velocity = 0.9): void {
  const i = Math.max(0, Math.min(KALIMBA_NOTE_NAMES.length - 1, index))
  playKalimbaNote(KALIMBA_NOTE_NAMES[i], velocity)
}

/** Play a chord by supplying a root (we look up BEAUTIFUL_CHORDS[root]) */
export function playKalimbaChordFromRoot(root: string, velocity = 0.9, strumMs = 18): void {
  const chord = BEAUTIFUL_CHORDS[root]
  if (!chord) return
  playKalimbaChord(chord, velocity, strumMs)
}

/** Play a chord from explicit note names; optional gentle up-strum */
export function playKalimbaChord(notes: string[], velocity = 0.9, strumMs = 18): void {
  if (!_kalimbaSynth || !notes?.length) return
  const t0 = Tone.now()
  notes.forEach((n, i) => _kalimbaSynth!.triggerAttack(n, t0 + (i * strumMs) / 1000, velocity))
}

/** Release resources */
export function disposeKalimba(): void {
  _kalimbaSynth?.dispose()
  _kalimbaSynth = null
  _kalimbaEQ?.dispose()
  _kalimbaEQ = null
  _kalimbaReverb?.dispose()
  _kalimbaReverb = null
  _kalimbaGain?.dispose()
  _kalimbaGain = null
}

/** Quick audition helper */
export async function auditionKalimbaSequence(intervalMs = 320): Promise<void> {
  for (const n of KALIMBA_NOTE_NAMES) {
    playKalimbaNote(n, 0.9)
    await new Promise((r) => setTimeout(r, intervalMs))
  }
}

export async function playNote(noteOrIndex: string | number, seconds = 0.45, velocity = 0.9) {
  // Initialize kalimba if not already done
  if (!_kalimbaSynth) {
    await startKalimbaAudio()
    await initKalimba()
  }

  const note =
    typeof noteOrIndex === "number"
      ? KALIMBA_NOTE_NAMES[Math.max(0, Math.min(KALIMBA_NOTE_NAMES.length - 1, noteOrIndex))]
      : noteOrIndex

  console.log(`[v0] Playing kalimba note: ${note}`)
  playKalimbaNote(note, velocity)
}

export function playPianoNote(note: string, duration = 0.45, velocity = 0.9) {
  return playNote(note, duration, velocity)
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

export async function generateAmbientSound(
  ambient: AmbientSound,
  audioContext: AudioContext | OfflineAudioContext,
  duration: number,
  volumeOverride?: number,
): Promise<void> {
  try {
    await Tone.start()

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

    noise.chain(filter, reverb, Tone.getDestination())
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

export async function startAudio(): Promise<void> {
  await startKalimbaAudio()
}

export async function loadPiano(opts?: { wet?: number; decay?: number }): Promise<void> {
  await initKalimba({
    reverbWet: opts?.wet,
    reverbDecay: opts?.decay,
  })
}
