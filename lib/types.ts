export interface Instruction {
  id: string
  category: string
  text: string
}

export interface SoundCue {
  id: string
  name: string
  src: string // Can be a URL or a synthetic identifier like "synthetic:soft_pad"
}

export interface AmbientSound {
  id: string
  name: string
  src: string // URL or synthetic identifier
  volume: number // 0.0 to 1.0
}

export type TimelineEvent =
  | {
      id: string
      type: "instruction_sound"
      startTime: number // in seconds
      instructionText: string
      soundCueId: string
      soundCueName: string
      soundCueSrc: string
      color: string // Tailwind CSS class for background color
    }
  | {
      id: string
      type: "recorded_voice"
      startTime: number // in seconds
      recordedAudioUrl: string
      recordedInstructionLabel: string
      duration: number // duration of the recorded audio in seconds
      color: string // Tailwind CSS class for background color
    }
