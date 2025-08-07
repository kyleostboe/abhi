export interface Instruction {
  id: string
  category: string
  text: string
}

export interface SoundCue {
  id: string
  name: string
  src: string // Can be a file path or a synthetic: prefix
}

export interface AmbientSound {
  id: string
  name: string
  src: string // Can be a file path or a synthetic: prefix
  volume: number
}

export type TimelineEvent =
  | {
      id: string
      type: "instruction_sound"
      startTime: number // in seconds
      instructionText: string
      soundCueId: string
      soundCueName: string
      soundCueSrc: string // Direct source for playback/export
      color?: string // Optional color for the event icon
    }
  | {
      id: string
      type: "recorded_voice"
      startTime: number // in seconds
      recordedAudioUrl: string
      recordedInstructionLabel: string
      duration: number // Duration of the recorded audio in seconds
      color?: string // Optional color for the event icon
    }
