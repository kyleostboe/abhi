export interface SavedMeditation {
  id: string
  title: string
  originalFileName: string
  processedAudioUrl: string
  duration: number
  createdAt: Date
  source: "adjuster" | "encoder"
  metadata: {
    // For adjuster meditations
    targetDuration?: number
    pausesAdjusted?: number
    // For encoder meditations
    instructionCount?: number
    soundCuesUsed?: string[]
  }
}

export interface Playlist {
  id: string
  name: string
  description: string
  meditationIds: string[]
  createdAt: Date
  updatedAt: Date
}

export class MeditationLibrary {
  private static STORAGE_KEY = "abhi_meditation_library"
  private static PLAYLISTS_KEY = "abhi_meditation_playlists"

  private static parseStoredData<T>(key: string, rawValue: string): T | null {
    const attemptParse = (value: string): { success: true; data: T } | { success: false } => {
      try {
        return { success: true, data: JSON.parse(value) as T }
      } catch {
        return { success: false }
      }
    }

    const initial = attemptParse(rawValue)
    if (initial.success) {
      return initial.data
    }

    const sanitizedValue = rawValue.trim().replace(/;+$/, "")
    if (sanitizedValue !== rawValue) {
      const repaired = attemptParse(sanitizedValue)
      if (repaired.success) {
        localStorage.setItem(key, sanitizedValue)
        return repaired.data
      }
    }

    localStorage.removeItem(key)
    return null
  }

  static saveMeditation(meditation: Omit<SavedMeditation, "id" | "createdAt">): SavedMeditation {
    const savedMeditation: SavedMeditation = {
      ...meditation,
      id: `med_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    }

    const existing = this.getAllMeditations()
    existing.push(savedMeditation)
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existing))

    return savedMeditation
  }

  static getAllMeditations(): SavedMeditation[] {
    const stored = localStorage.getItem(this.STORAGE_KEY)
    if (!stored) return []

    const parsed = this.parseStoredData<any[]>(this.STORAGE_KEY, stored)
    if (!parsed) {
      return []
    }

    return parsed.map((med) => ({
      ...med,
      createdAt: new Date(med.createdAt),
    }))
  }

  static getMeditation(id: string): SavedMeditation | null {
    const all = this.getAllMeditations()
    return all.find((med) => med.id === id) || null
  }

  static deleteMeditation(id: string): void {
    const existing = this.getAllMeditations()
    const filtered = existing.filter((med) => med.id !== id)
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered))

    // Also remove from playlists
    const playlists = this.getAllPlaylists()
    playlists.forEach((playlist) => {
      if (playlist.meditationIds.includes(id)) {
        this.removeFromPlaylist(playlist.id, id)
      }
    })
  }

  static createPlaylist(name: string, description = ""): Playlist {
    const playlist: Playlist = {
      id: `playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      meditationIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const existing = this.getAllPlaylists()
    existing.push(playlist)
    localStorage.setItem(this.PLAYLISTS_KEY, JSON.stringify(existing))

    return playlist
  }

  static getAllPlaylists(): Playlist[] {
    const stored = localStorage.getItem(this.PLAYLISTS_KEY)
    if (!stored) return []

    const parsed = this.parseStoredData<any[]>(this.PLAYLISTS_KEY, stored)
    if (!parsed) {
      return []
    }

    return parsed.map((playlist) => ({
      ...playlist,
      createdAt: new Date(playlist.createdAt),
      updatedAt: new Date(playlist.updatedAt),
    }))
  }

  static getPlaylist(id: string): Playlist | null {
    const all = this.getAllPlaylists()
    return all.find((playlist) => playlist.id === id) || null
  }

  static updatePlaylist(id: string, updates: Partial<Pick<Playlist, "name" | "description">>): void {
    const playlists = this.getAllPlaylists()
    const index = playlists.findIndex((p) => p.id === id)

    if (index !== -1) {
      playlists[index] = {
        ...playlists[index],
        ...updates,
        updatedAt: new Date(),
      }
      localStorage.setItem(this.PLAYLISTS_KEY, JSON.stringify(playlists))
    }
  }

  static deletePlaylist(id: string): void {
    const existing = this.getAllPlaylists()
    const filtered = existing.filter((playlist) => playlist.id !== id)
    localStorage.setItem(this.PLAYLISTS_KEY, JSON.stringify(filtered))
  }

  static addToPlaylist(playlistId: string, meditationId: string): void {
    const playlists = this.getAllPlaylists()
    const playlist = playlists.find((p) => p.id === playlistId)

    if (playlist && !playlist.meditationIds.includes(meditationId)) {
      playlist.meditationIds.push(meditationId)
      playlist.updatedAt = new Date()
      localStorage.setItem(this.PLAYLISTS_KEY, JSON.stringify(playlists))
    }
  }

  static removeFromPlaylist(playlistId: string, meditationId: string): void {
    const playlists = this.getAllPlaylists()
    const playlist = playlists.find((p) => p.id === playlistId)

    if (playlist) {
      playlist.meditationIds = playlist.meditationIds.filter((id) => id !== meditationId)
      playlist.updatedAt = new Date()
      localStorage.setItem(this.PLAYLISTS_KEY, JSON.stringify(playlists))
    }
  }

  static getPlaylistMeditations(playlistId: string): SavedMeditation[] {
    const playlist = this.getPlaylist(playlistId)
    if (!playlist) return []

    const allMeditations = this.getAllMeditations()
    return playlist.meditationIds
      .map((id) => allMeditations.find((med) => med.id === id))
      .filter(Boolean) as SavedMeditation[]
  }
}
