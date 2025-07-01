export interface Instruction {
  id: string
  text: string
  category: "Metta" | "Mindfulness" | "Nonduality"
}

export const INSTRUCTIONS_LIBRARY: Instruction[] = [
  // Metta
  { id: "metta1", text: "May I/you/we be safe", category: "Metta" },
  { id: "metta2", text: "May I/you/we be happy", category: "Metta" },
  { id: "metta3", text: "May I/you/we be peaceful", category: "Metta" },
  { id: "metta4", text: "May I/you/we live with ease and kindness", category: "Metta" },
  // Mindfulness
  { id: "mindfulness1", text: "Focus on your breath", category: "Mindfulness" },
  { id: "mindfulness2", text: "Notice the sensations in your body", category: "Mindfulness" },
  { id: "mindfulness3", text: "Observe your thoughts without judgment", category: "Mindfulness" },
  { id: "mindfulness4", text: "Gently return your attention to your anchor (e.g., breath)", category: "Mindfulness" },
  // Nonduality
  { id: "nonduality1", text: "Rest as awareness", category: "Nonduality" },
  { id: "nonduality2", text: 'Notice the sense of "I" or "me"', category: "Nonduality" },
  { id: "nonduality3", text: "What is aware of this experience?", category: "Nonduality" },
  { id: "nonduality4", text: "Abide in open, choiceless presence", category: "Nonduality" },
]

export interface SoundCue {
  id: string
  name: string
  src: string
}

export const SOUND_CUES_LIBRARY: SoundCue[] = [
  { id: "sound1", name: "Singing Bowl (Short)", src: "/sounds/singing-bowl-short.mp3" },
  { id: "sound2", name: "Gentle Chime", src: "/sounds/chime-gentle.mp3" },
  { id: "sound3", name: "Soft Gong", src: "/sounds/soft-gong.mp3" },
  { id: "sound4", name: "Short Bell", src: "/sounds/short-bell.mp3" },
  { id: "sound5", name: "Clear Tone", src: "/sounds/clear-tone.mp3" },
]

// Placeholder sound files - you'll need to add these to your public/sounds directory
// For example, you can create simple tones or find royalty-free sounds.
// If you want, I can help generate simple tones using Web Audio API later.
