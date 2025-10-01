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

export interface TimelineEvent {
  id: string
  type: "instruction_sound" | "recorded_voice"
  startTime: number
  instructionText?: string
  soundCueId?: string
  soundCueName?: string
  soundCueSrc?: string
  instrument?: "piano" | "synth" | "harp"
  recordedAudioUrl?: string
  recordedInstructionLabel?: string
  duration?: number // Duration of the recorded audio in seconds
  color?: string // Added color property
  keepOriginal?: boolean
}
