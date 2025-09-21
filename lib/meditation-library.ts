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

      const meditations: SavedMeditation[] = data.map((row: any) => ({
        id: row.id,
        title: row.title,
        originalFileName: row.original_filename || row.description || "Unknown",
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
        originalFileName: data.original_filename || data.description || "Unknown",
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

  static async createPlaylist(name: string, description = ""): Promise<Playlist> {
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("playlists")
        .insert({
          name,
          description,
        })
        .select()
        .single()

      if (error) {
        console.error("[v0] Error creating playlist:", error)
        throw error
      }

      return {
        id: data.id,
        name: data.name,
        description: data.description,
        meditationIds: [], // New playlist starts empty
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      }
    } catch (error) {
      console.error("[v0] Error in createPlaylist:", error)
      throw error
    }
  }

  static async getAllPlaylists(): Promise<Playlist[]> {
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("playlists")
        .select(`
          *,
          playlist_meditations (
            meditation_id
          )
        `)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("[v0] Error fetching playlists:", error)
        throw error
      }

      if (!data) return []

      return data.map((playlist: any) => ({
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        meditationIds: playlist.playlist_meditations.map((pm: any) => pm.meditation_id),
        createdAt: new Date(playlist.created_at),
        updatedAt: new Date(playlist.updated_at),
      }))
    } catch (error) {
      console.error("[v0] Error in getAllPlaylists:", error)
      return []
    }
  }

  static async getPlaylist(id: string): Promise<Playlist | null> {
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("playlists")
        .select(`
          *,
          playlist_meditations (
            meditation_id
          )
        `)
        .eq("id", id)
        .single()

      if (error || !data) {
        return null
      }

      return {
        id: data.id,
        name: data.name,
        description: data.description,
        meditationIds: data.playlist_meditations.map((pm: any) => pm.meditation_id),
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      }
    } catch (error) {
      console.error("[v0] Error in getPlaylist:", error)
      return null
    }
  }

  static async updatePlaylist(id: string, updates: Partial<Pick<Playlist, "name" | "description">>): Promise<void> {
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("playlists")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)

      if (error) {
        console.error("[v0] Error updating playlist:", error)
        throw error
      }
    } catch (error) {
      console.error("[v0] Error in updatePlaylist:", error)
      throw error
    }
  }

  static async deletePlaylist(id: string): Promise<void> {
    try {
      const supabase = createClient()

      // Delete playlist (cascade will handle playlist_meditations)
      const { error } = await supabase.from("playlists").delete().eq("id", id)

      if (error) {
        console.error("[v0] Error deleting playlist:", error)
        throw error
      }
    } catch (error) {
      console.error("[v0] Error in deletePlaylist:", error)
      throw error
    }
  }

  static async addToPlaylist(playlistId: string, meditationId: string): Promise<void> {
    try {
      const supabase = createClient()

      const { error } = await supabase.from("playlist_meditations").insert({
        playlist_id: playlistId,
        meditation_id: meditationId,
      })

      if (error) {
        // If it's a duplicate key error, ignore it (meditation already in playlist)
        if (error.code !== "23505") {
          console.error("[v0] Error adding to playlist:", error)
          throw error
        }
      }

      // Update playlist's updated_at timestamp
      await supabase.from("playlists").update({ updated_at: new Date().toISOString() }).eq("id", playlistId)
    } catch (error) {
      console.error("[v0] Error in addToPlaylist:", error)
      throw error
    }
  }

  static async removeFromPlaylist(playlistId: string, meditationId: string): Promise<void> {
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("playlist_meditations")
        .delete()
        .eq("playlist_id", playlistId)
        .eq("meditation_id", meditationId)

      if (error) {
        console.error("[v0] Error removing from playlist:", error)
        throw error
      }

      // Update playlist's updated_at timestamp
      await supabase.from("playlists").update({ updated_at: new Date().toISOString() }).eq("id", playlistId)
    } catch (error) {
      console.error("[v0] Error in removeFromPlaylist:", error)
      throw error
    }
  }

  static async getPlaylistMeditations(playlistId: string): Promise<SavedMeditation[]> {
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("playlist_meditations")
        .select(`
          meditations (
            id,
            title,
            description,
            audio_url,
            duration,
            created_at,
            source,
            metadata,
            original_filename
          )
        `)
        .eq("playlist_id", playlistId)
        .order("added_at", { ascending: true })

      if (error) {
        console.error("[v0] Error fetching playlist meditations:", error)
        return []
      }

      if (!data) return []

      return data
        .filter((item: any) => item.meditations) // Filter out null meditations (deleted)
        .map((item: any) => ({
          id: item.meditations.id,
          title: item.meditations.title,
          originalFileName: item.meditations.original_filename || item.meditations.description || "Unknown",
          processedAudioUrl: item.meditations.audio_url,
          duration: item.meditations.duration || 0,
          createdAt: new Date(item.meditations.created_at),
          source: item.meditations.source as "adjuster" | "encoder",
          metadata: item.meditations.metadata || {},
        }))
    } catch (error) {
      console.error("[v0] Error in getPlaylistMeditations:", error)
      return []
    }
  }
}
