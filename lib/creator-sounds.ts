/**
 * The Creator's instruction and sound-cue vocabulary.
 *
 * Deliberately separate from lib/meditation-sounds.ts: the Creator offers a narrower note range
 * (C4-C6) and describes its cues by name rather than by audio file, so merging the two tables
 * would change what either surface offers. Pure data, no React.
 */

export interface Instruction {
  id: string
  text: string
  startTime: number
  endTime: number
}

export interface MappedInstruction extends Instruction {
  soundId: string
  keepOriginal: boolean
  originalVolume: number
  soundVolume: number
}

export interface SoundDefinition {
  id: string
  name: string
  description: string
}

export interface MusicalNote {
  id: string
  name: string
  note: string
  octave: number
}

export const musicalNotes: MusicalNote[] = [
  { id: "C4", name: "C4", note: "C", octave: 4 },
  { id: "D4", name: "D4", note: "D", octave: 4 },
  { id: "E4", name: "E4", note: "E", octave: 4 },
  { id: "F4", name: "F4", note: "F", octave: 4 },
  { id: "G4", name: "G4", note: "G", octave: 4 },
  { id: "A4", name: "A4", note: "A", octave: 4 },
  { id: "B4", name: "B4", note: "B", octave: 4 },
  { id: "C5", name: "C5", note: "C", octave: 5 },
  { id: "D5", name: "D5", note: "D", octave: 5 },
  { id: "E5", name: "E5", note: "E", octave: 5 },
  { id: "F5", name: "F5", note: "F", octave: 5 },
  { id: "G5", name: "G5", note: "G", octave: 5 },
  { id: "A5", name: "A5", note: "A", octave: 5 },
  { id: "B5", name: "B5", note: "B", octave: 5 },
  { id: "C6", name: "C6", note: "C", octave: 6 },
]

export const availableSounds: SoundDefinition[] = [
  { id: "bell_high", name: "High Bell", description: "A clear, high-pitched bell." },
  { id: "bell_mid", name: "Mid Bell", description: "A resonant, medium-pitched bell." },
  { id: "chime_soft", name: "Soft Chime", description: "A gentle, soothing chime." },
  { id: "tone_short_low", name: "Short Low Tone", description: "A brief, low frequency tone." },
  { id: "tone_short_high", name: "Short High Tone", description: "A brief, high frequency tone." },
  { id: "wood_block", name: "Wood Block", description: "A sharp, percussive wood block sound." },
]
