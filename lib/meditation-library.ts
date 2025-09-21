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
      if (meditation.processedAudioUrl.startsWith("blob:")) {
        console.log("[v0] Using server-side compression and upload")

        // Fetch the blob data
        const response = await fetch(meditation.processedAudioUrl)
        const audioBlob = await response.blob()

        // Create FormData for server upload
        const formData = new FormData()
        formData.append("audio", audioBlob, "meditation.wav")
        formData.append("title", meditation.title)
        formData.append("originalFileName", meditation.originalFileName)
        formData.append("duration", meditation.duration.toString())
        formData.append("source", meditation.source)
        formData.append("metadata", JSON.stringify(meditation.metadata))

        // Send to server-side API
        const uploadResponse = await fetch("/api/save-meditation", {
          method: "POST",
          body: formData,
        })

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json()
          throw new Error(errorData.error || "Server upload failed")
        }

        const savedMeditation = await uploadResponse.json()
        console.log("[v0] Server-side save successful:", savedMeditation.id)

        return {
          ...savedMeditation,
          createdAt: new Date(savedMeditation.createdAt),
        }
      }

      // Fallback for non-blob URLs (shouldn't happen in normal flow)
      throw new Error("Invalid audio URL format")
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
        source: row.source as "adjuster" | "encoder",
        metadata: row.metadata || {},
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
        source: data.source as "adjuster" | "encoder",
        metadata: data.metadata || {},
      }
    } catch (error) {
      console.error("[v0] Error fetching meditation:", error)
      return null
    }
  }

  static async deleteMeditation(id: string): Promise<void> {
    try {
      const supabase = createClient()

      // First get the meditation to find the audio file path
      const { data: meditation, error: fetchError } = await supabase
        .from("meditations")
        .select("audio_url")
        .eq("id", id)
        .single()

      if (fetchError) {
        console.error("[v0] Error fetching meditation for deletion:", fetchError)
        throw fetchError
      }

      // Delete from database first
      const { error: deleteError } = await supabase.from("meditations").delete().eq("id", id)

      if (deleteError) {
        console.error("[v0] Error deleting meditation from database:", deleteError)
        throw deleteError
      }

      // If the audio URL is from our storage, delete the file too
      if (meditation?.audio_url && meditation.audio_url.includes("meditation-audio")) {
        try {
          // Extract filename from the URL
          const urlParts = meditation.audio_url.split("/")
          const filename = urlParts[urlParts.length - 1]

          console.log("[v0] Deleting audio file from storage:", filename)

          const { error: storageError } = await supabase.storage.from("meditation-audio").remove([filename])

          if (storageError) {
            console.warn("[v0] Warning: Could not delete audio file from storage:", storageError)
            // Don't throw here - the database deletion was successful
          } else {
            console.log("[v0] Audio file deleted from storage successfully")
          }
        } catch (storageError) {
          console.warn("[v0] Warning: Error deleting audio file from storage:", storageError)
          // Don't throw here - the database deletion was successful
        }
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
