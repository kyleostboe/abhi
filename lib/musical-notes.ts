const NOTES = [
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
