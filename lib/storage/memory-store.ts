import type { SavedMeditation, Playlist } from "@/lib/meditation-library"
import type { JournalEntry } from "@/hooks/use-journal"

export type MemoryAudioRecord = {
  processedAudio: Blob
  sourceAudio?: Blob | null
  timelineRecordings?: Record<string, Blob>
}

const meditations = new Map<string, SavedMeditation>()
const playlists = new Map<string, Playlist>()
const playlistMeditations = new Map<string, Set<string>>()
const audioRecords = new Map<string, MemoryAudioRecord>()
const journalEntries = new Map<string, JournalEntry>()

export function saveMemoryMeditation(id: string, meditation: SavedMeditation, audio: MemoryAudioRecord) {
  meditations.set(id, meditation)
  audioRecords.set(id, audio)
}

export function getMemoryMeditations(): SavedMeditation[] {
  return Array.from(meditations.values())
}

export function getMemoryMeditation(id: string): SavedMeditation | null {
  return meditations.get(id) ?? null
}

export function deleteMemoryMeditation(id: string) {
  meditations.delete(id)
  audioRecords.delete(id)
  playlistMeditations.forEach((set) => set.delete(id))
}

export function saveMemoryAudio(id: string, audio: MemoryAudioRecord) {
  audioRecords.set(id, audio)
}

export function getMemoryAudio(id: string): MemoryAudioRecord | null {
  return audioRecords.get(id) ?? null
}

export function upsertMemoryPlaylist(playlist: Playlist) {
  playlists.set(playlist.id, playlist)
  if (!playlistMeditations.has(playlist.id)) {
    playlistMeditations.set(playlist.id, new Set())
  }
}

export function getMemoryPlaylists(): Playlist[] {
  return Array.from(playlists.values())
}

export function deleteMemoryPlaylist(id: string) {
  playlists.delete(id)
  playlistMeditations.delete(id)
}

export function addMeditationToMemoryPlaylist(playlistId: string, meditationId: string) {
  if (!playlistMeditations.has(playlistId)) {
    playlistMeditations.set(playlistId, new Set())
  }
  playlistMeditations.get(playlistId)?.add(meditationId)
}

export function removeMeditationFromMemoryPlaylist(playlistId: string, meditationId: string) {
  playlistMeditations.get(playlistId)?.delete(meditationId)
}

export function getMemoryPlaylistMeditations(playlistId: string): string[] {
  return Array.from(playlistMeditations.get(playlistId) ?? [])
}

export function saveMemoryJournalEntry(entry: JournalEntry) {
  journalEntries.set(entry.id, entry)
}

export function updateMemoryJournalEntry(entry: JournalEntry) {
  journalEntries.set(entry.id, entry)
}

export function deleteMemoryJournalEntry(id: string) {
  journalEntries.delete(id)
}

export function getMemoryJournalEntries(): JournalEntry[] {
  return Array.from(journalEntries.values())
}

export function clearMemoryState() {
  meditations.clear()
  playlists.clear()
  playlistMeditations.clear()
  audioRecords.clear()
  journalEntries.clear()
}

export function getMemoryUsageBytes(): number {
  let total = 0
  audioRecords.forEach((record) => {
    total += record.processedAudio.size
    if (record.sourceAudio) {
      total += record.sourceAudio.size
    }
    if (record.timelineRecordings) {
      Object.values(record.timelineRecordings).forEach((blob) => {
        total += blob.size
      })
    }
  })
  return total
}
