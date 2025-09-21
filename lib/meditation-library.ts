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

  static saveMeditation(meditation: Omit<SavedMeditation, "id" | "createdAt">): SavedMeditation {
    console.log("[v0] MeditationLibrary.saveMeditation called with:", meditation)

    try {
      const savedMeditation: SavedMeditation = {
        ...meditation,
        id: `med_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
      }
      console.log("[v0] Created meditation object:", savedMeditation.id)

      const existing = this.getAllMeditations()
      console.log("[v0] Current meditations count:", existing.length)

      existing.push(savedMeditation)

      const serialized = JSON.stringify(existing)
      console.log("[v0] Serialized data size:", serialized.length, "characters")

      localStorage.setItem(this.STORAGE_KEY, serialized)
      console.log("[v0] Saved to localStorage successfully")

      // Verify the save worked
      const verification = this.getAllMeditations()
      console.log("[v0] Verification: meditations count after save:", verification.length)

      return savedMeditation
    } catch (error) {
      console.error("[v0] Error in saveMeditation:", error)
      throw error
    }
  }

  static getAllMeditations(): SavedMeditation[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) {
        console.log("[v0] No stored meditations found")
        return []
      }

      const parsed = JSON.parse(stored)
      const meditations = parsed.map((med: any) => ({
        ...med,
        createdAt: new Date(med.createdAt),
      }))
      console.log("[v0] Retrieved", meditations.length, "meditations from storage")
      return meditations
    } catch (error) {
      console.error("[v0] Error parsing stored meditations:", error)
      localStorage.removeItem(this.STORAGE_KEY)
      return []
    }
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

    try {
      const parsed = JSON.parse(stored)
      return parsed.map((playlist: any) => ({
        ...playlist,
        createdAt: new Date(playlist.createdAt),
        updatedAt: new Date(playlist.updatedAt),
      }))
    } catch {
      return []
    }
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
