export interface Instruction {
  id: string
  text: string
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

export interface AmbientSound {
  id: string
  name: string
  src: string // Path to audio file or synthetic: prefix
  noiseType?: "white" | "pink" | "brown"
  filterType?: BiquadFilterType
  filterFrequency?: number
  lfoFrequency?: number
  volume?: number
}

export const INSTRUMENTS = ["piano", "synth", "harp"] as const

export type Instrument = (typeof INSTRUMENTS)[number]

/**
 * Narrows a persisted `instrument` value, which is stored as a bare string, to the union the
 * runtime model uses. Anything unrecognised becomes undefined so playback falls back to the
 * default voice rather than failing on an instrument that no longer exists.
 */
export const asInstrument = (value: unknown): Instrument | undefined =>
  typeof value === "string" && (INSTRUMENTS as readonly string[]).includes(value)
    ? (value as Instrument)
    : undefined

/**
 * The editor-side timeline row.
 *
 * Richer than the persisted TimelineEvent below: it carries the draft `content` payload the
 * builder UI works with and a wider `type`. Only TimelineEvent is ever written to storage.
 */
export interface TimelineItem {
  id: string
  type: "instruction" | "sound" | "recorded_voice" | "instruction_sound" | "recording" | "recorded"
  duration: number // in seconds
  content?: Instruction | SoundCue | { url: string; label: string; duration: number }
  instructionText?: string
  soundCueId?: string
  soundCueName?: string
  soundCueSrc?: string
  instrument?: string
  recordedAudioUrl?: string
  recordedInstructionLabel?: string
  color?: string
  startTime: number
  recordingStoragePath?: string
}

export interface TimelineEvent {
  id: string
  type: "instruction_sound" | "recorded_voice"
  startTime: number
  instructionText?: string
  soundCueId?: string
  soundCueName?: string
  soundCueSrc?: string
  instrument?: Instrument
  recordedAudioUrl?: string
  recordedInstructionLabel?: string
  duration?: number // Duration of the recorded audio in seconds
  color?: string // Added color property
  keepOriginal?: boolean
  recordingStoragePath?: string
}
