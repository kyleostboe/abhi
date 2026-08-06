/**
 * Sound cue and musical note tables for the Creator timeline.
 *
 * Pure data with no React or audio dependencies, kept out of the page component so the two
 * timeline surfaces (home and Creator) can read from one source rather than each carrying a
 * copy that can drift.
 */

import type { SoundCue } from "@/lib/types"

/**
 * File-backed sound cues.
 *
 * Empty on purpose. This table used to name five `/sounds/*.mp3` files that were never committed,
 * so every entry resolved to a 404 — including the one the import fallback reached for as its
 * default. Nothing in the UI offers these for selection (the picker renders MUSICAL_NOTES), so
 * the entries only ever surfaced as silent failures.
 *
 * The lookups against this table all tolerate a miss, which is what makes leaving it empty safe:
 * add entries back when the audio files exist alongside them.
 */
export const SOUND_CUES_LIBRARY: SoundCue[] = []

/**
 * The cue used when a save carries no timeline metadata and one has to be invented. A `musical:`
 * src is synthesised by the piano engine at render time, so unlike a file reference it cannot be
 * missing.
 */
export const FALLBACK_SOUND_CUE = {
  id: "fallback-c5",
  name: "C5",
  src: "musical:C5",
} as const

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
  Beautiful: NOTES.map((note) => ({
    id: `note-${note.toLowerCase().replace("#", "s")}`,
    name: note,
    note: note.charAt(0),
    octave: Number.parseInt(note.charAt(1)),
  })),
}

