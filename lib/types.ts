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
  src: string // Path to audio file or synthetic: prefix (e.g., "synthetic:rain" or "supabase:bucket/path/to/file.mp3")
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
  soundCueSrc?: string // Can be synthetic, musical, or a Supabase Storage URL
  recordedAudioUrl?: string // Will be a Supabase Storage URL for saved recordings
  recordedInstructionLabel?: string
  duration?: number // Duration of the recorded audio in seconds
}
