export interface MeditationEvent {
  id: string
  type: "sound_cue" | "ambient_sound" | "guided_meditation"
  duration: number // in milliseconds
  startOffset: number // offset from the start of the meditation in milliseconds
}

export interface SoundCueEvent extends MeditationEvent {
  type: "sound_cue"
  soundCueName: string
  soundCueSrc: string // URL to the sound file
  volume: number // 0.0 to 1.0
}

export interface AmbientSoundEvent extends MeditationEvent {
  type: "ambient_sound"
  ambientSoundName: string
  ambientSoundSrc: string // URL to the ambient sound file
  volume: number // 0.0 to 1.0
}

export interface GuidedMeditationEvent extends MeditationEvent {
  type: "guided_meditation"
  script: string
  voice: "standard" | "calm" | "deep" // Example voice options
}

export interface Meditation {
  id: string
  title: string
  timeline: MeditationEvent[]
}

export interface AmbientSound {
  id: string
  name: string
  description?: string
  file_url?: string // URL to the audio file (can be null for synthetic sounds)
  is_synthetic: boolean // true for procedurally generated sounds
  synthetic_config?: Record<string, any> // Configuration for synthetic sound generation
  category: "nature" | "music" | "meditation" | "other"
  created_at: string
  updated_at: string
}
