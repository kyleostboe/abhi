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

export interface TimelineEvent {
  id: string
  type: "instruction" | "sound" | "ambient"
  time: number // Time in milliseconds
  text?: string // For instruction events
  soundCueName?: string // For sound and ambient events
  soundCueSrc?: string // For sound and ambient events
  audioSrc?: string // For recorded instruction audio
}
