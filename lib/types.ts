export interface TimelineEvent {
  id: string
  time: number // Time in milliseconds
  instruction: string
  audioSrc: string | null // URL for recorded audio instruction
  soundCueName: string | null // Name of the sound cue
  soundCueSrc: string | null // Source URL of the sound cue
}

export interface Instruction {
  category: string
  text: string
}

export interface SoundCue {
  name: string
  src: string
}

export interface MeditationTimeline {
  events: TimelineEvent[]
}
