// lib/types.ts

export interface Instruction {
  id: string;
  category: string;
  text: string;
}

export interface SoundCue {
  id: string;
  name: string;
  src: string; // Path to audio file or "synthetic:type"
}

export interface AmbientSound {
  id: string;
  name: string;
  src: string; // Path to audio file or "synthetic:type"
  volume: number; // 0.0 to 1.0
}

export interface TimelineEvent {
  id: string;
  type: "instruction_sound" | "recorded_voice";
  startTime: number; // in seconds
  color?: string; // Tailwind CSS class for background and border, e.g., "bg-blue-500 border-blue-500"
  
  // For instruction_sound events
  instructionText?: string;
  soundCueId?: string;
  soundCueName?: string; // Added to store directly
  soundCueSrc?: string; // Added to store directly

  // For recorded_voice events
  recordedAudioUrl?: string;
  recordedInstructionLabel?: string;
  duration?: number; // Duration of the recorded audio in seconds
}
