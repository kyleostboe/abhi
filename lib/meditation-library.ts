import { createClient } from "@/lib/supabase/client"

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
  static async saveMeditation(meditation: Omit<SavedMeditation, "id" | "createdAt">): Promise<SavedMeditation> {
    console.log("[v0] MeditationLibrary.saveMeditation called with:", meditation)

    try {
      const supabase = createClient()

      const meditationData = {
        title: meditation.title,
        description: meditation.originalFileName,
        audio_url: meditation.processedAudioUrl,
        duration: meditation.duration,
      }

      console.log("[v0] Inserting into Supabase:", meditationData)

      const { data, error } = await supabase.from("meditations").insert(meditationData).select().single()

      if (error) {
        console.error("[v0] Supabase insert error:", error)
        throw error
      }

      console.log("[v0] Supabase insert successful:", data)

      // Convert database format back to our interface
      const savedMeditation: SavedMeditation = {
        id: data.id,
        title: data.title,
        originalFileName: data.description || meditation.originalFileName,
        processedAudioUrl: data.audio_url,
        duration: data.duration,
        createdAt: new Date(data.created_at),
        source: meditation.source,
        metadata: meditation.metadata,
      }

      console.log("[v0] Meditation saved successfully to database:", savedMeditation.id)
      return savedMeditation
    } catch (error) {
      console.error("[v0] Error in saveMeditation:", error)
      throw error
    }
  }

  static async getAllMeditations(): Promise<SavedMeditation[]> {
    try {
      console.log("[v0] getAllMeditations - fetching from Supabase")
      const supabase = createClient()

      const { data, error } = await supabase.from("meditations").select("*").order("created_at", { ascending: false })

      if (error) {
        console.error("[v0] Supabase select error:", error)
        throw error
      }

      if (!data || data.length === 0) {
        console.log("[v0] No meditations found in database")
        return []
      }

      // Convert database format to our interface
      const meditations: SavedMeditation[] = data.map((row: any) => ({
        id: row.id,
        title: row.title,
        originalFileName: row.description || "Unknown",
        processedAudioUrl: row.audio_url,
        duration: row.duration || 0,
        createdAt: new Date(row.created_at),
        source: "adjuster" as const, // Default for now
        metadata: {}, // Default empty metadata
      }))

      console.log("[v0] Retrieved", meditations.length, "meditations from database")
      return meditations
    } catch (error) {
      console.error("[v0] Error fetching meditations:", error)
      return []
    }
  }

  static async getMeditation(id: string): Promise<SavedMeditation | null> {
    try {
      const supabase = createClient()

      const { data, error } = await supabase.from("meditations").select("*").eq("id", id).single()

      if (error || !data) {
        return null
      }

      return {
        id: data.id,
        title: data.title,
        originalFileName: data.description || "Unknown",
        processedAudioUrl: data.audio_url,
        duration: data.duration || 0,
        createdAt: new Date(data.created_at),
        source: "adjuster" as const,
        metadata: {},
      }
    } catch (error) {
      console.error("[v0] Error fetching meditation:", error)
      return null
    }
  }

  static async deleteMeditation(id: string): Promise<void> {
    try {
      const supabase = createClient()

      const { error } = await supabase.from("meditations").delete().eq("id", id)

      if (error) {
        console.error("[v0] Error deleting meditation:", error)
        throw error
      }

      console.log("[v0] Meditation deleted successfully:", id)
    } catch (error) {
      console.error("[v0] Error in deleteMeditation:", error)
      throw error
    }
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
    localStorage.setItem("abhi_meditation_playlists", JSON.stringify(existing))

    return playlist
  }

  static getAllPlaylists(): Playlist[] {
    const stored = localStorage.getItem("abhi_meditation_playlists")
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
      localStorage.setItem("abhi_meditation_playlists", JSON.stringify(playlists))
    }
  }

  static deletePlaylist(id: string): void {
    const existing = this.getAllPlaylists()
    const filtered = existing.filter((playlist) => playlist.id !== id)
    localStorage.setItem("abhi_meditation_playlists", JSON.stringify(filtered))
  }

  static addToPlaylist(playlistId: string, meditationId: string): void {
    const playlists = this.getAllPlaylists()
    const playlist = playlists.find((p) => p.id === playlistId)

    if (playlist && !playlist.meditationIds.includes(meditationId)) {
      playlist.meditationIds.push(meditationId)
      playlist.updatedAt = new Date()
      localStorage.setItem("abhi_meditation_playlists", JSON.stringify(playlists))
    }
  }

  static removeFromPlaylist(playlistId: string, meditationId: string): void {
    const playlists = this.getAllPlaylists()
    const playlist = playlists.find((p) => p.id === playlistId)

    if (playlist) {
      playlist.meditationIds = playlist.meditationIds.filter((id) => id !== meditationId)
      playlist.updatedAt = new Date()
      localStorage.setItem("abhi_meditation_playlists", JSON.stringify(playlists))
    }
  }

  static async getPlaylistMeditations(playlistId: string): Promise<SavedMeditation[]> {
    const playlist = this.getPlaylist(playlistId)
    if (!playlist) return []

    const allMeditations = await this.getAllMeditations()
    return playlist.meditationIds
      .map((id) => allMeditations.find((med) => med.id === id))
      .filter(Boolean) as SavedMeditation[]
  }
}
