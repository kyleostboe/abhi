/**
 * Sound cue and musical note tables for the Creator timeline.
 *
 * Pure data with no React or audio dependencies, kept out of the page component so the two
 * timeline surfaces (home and Creator) can read from one source rather than each carrying a
 * copy that can drift.
 */

import type { SoundCue } from "@/lib/types"

export const SOUND_CUES_LIBRARY: SoundCue[] = [
  { id: "ambient-forest", name: "Forest Ambiance", src: "/sounds/forest.mp3", duration: 60 },
  { id: "ocean-waves", name: "Ocean Waves", src: "/sounds/ocean.mp3", duration: 60 },
  { id: "gentle-rain", name: "Gentle Rain", src: "/sounds/rain.mp3", duration: 60 },
  { id: "singing-bowl", name: "Singing Bowl", src: "/sounds/singing_bowl.mp3", duration: 15 },
  { id: "chimes", name: "Wind Chimes", src: "/sounds/chimes.mp3", duration: 30 },
]

export const NOTE_FREQUENCIES = {
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196.0,
  A3: 220.0,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
  A5: 880.0,
  B5: 987.77,
  C6: 1046.5,
  D6: 1174.66,
  E6: 1318.51,
  F6: 1396.91,
  G6: 1567.98,
  A6: 1760.0,
  C7: 1046.5 * 2,
  C8: 1046.5 * 4,
}

export const NOTES = [
  "C4",
  "D4",
  "E4",
  "F4",
  "G4",
  "A4",
  "B4",
  "C5",
  "D5",
  "E5",
  "F5",
  "G5",
  "A5",
  "B5",
  "C6",
  "D6",
  "E6",
  "F6",
  "G6",
  "A6",
]

export const MUSICAL_NOTES = {
  Beautiful: NOTES.map((note, index) => ({
    id: `note-${note.toLowerCase().replace("#", "s")}`,
    name: note,
    note: note.charAt(0),
    octave: Number.parseInt(note.charAt(1)),
  })),
}

