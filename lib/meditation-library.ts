import { createClient } from "@/lib/supabase/client"
import type { BufferToWavMetadata } from "./audio-utils"
import { TEST_PROFILE_ID } from "./test-profile"

export interface SavedMeditation {
  id: string
  title: string
  originalFileName: string
  processedAudioUrl: string
  sourceAudioUrl?: string
  duration: number
  createdAt: Date
  source: "adjuster" | "encoder"
  metadata: {
    // Shared metadata
    meditationTitle?: string
    // For adjuster meditations
    targetDuration?: number
    pausesAdjusted?: number
    adjusterSettings?: {
      silenceThreshold?: number
      minSilenceDuration?: number
      minSpacingDuration?: number
      preserveNaturalPacing?: boolean
      compatibilityMode?: string
    }
    // For encoder meditations
    instructionCount?: number
    soundCuesUsed?: string[]
    timeline?: Array<{
      id: string
      text: string
      startTime: number
      endTime: number
      soundCueId?: string
      soundId?: string
      soundName?: string
      soundSrc?: string
      instrument?: string
      keepOriginal: boolean
      originalVolume: number
      soundVolume: number
      recordingUrl?: string
      recordingLabel?: string
      duration?: number
      eventType?: "instruction_sound" | "recorded_voice"
      color?: string
      recordingStoragePath?: string
    }>
    // Shared audio export metadata
    wav?: BufferToWavMetadata
    quickAdjust?: {
      lastPresetId?: string | null
      lastDurationId?: string | null
      range?: {
        minSeconds?: number | null
      }
    }
    linkedParentId?: string
    linkedVariantLabel?: string
    linkedDurationId?: string
    linkedIsPreset?: boolean
    originalDurationSeconds?: number
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

export interface SaveMeditationInput extends Omit<SavedMeditation, "id" | "createdAt"> {
  processedAudioData?: Blob | null
  sourceAudioData?: Blob | null
}

export class MeditationLibrary {
  static async saveMeditation(meditation: SaveMeditationInput): Promise<SavedMeditation> {
    console.log("[v0] MeditationLibrary.saveMeditation called with:", meditation)

    try {
      const supabase = createClient()
      const meditationsBucket = supabase.storage.from("meditations")

      const isBlobLikeUrl = (value?: string | null) =>
        typeof value === "string" && (value.startsWith("blob:") || value.startsWith("data:"))

      const processedBlob: Blob | null =
        meditation.processedAudioData ??
        (isBlobLikeUrl(meditation.processedAudioUrl)
          ? await (async () => {
              const response = await fetch(meditation.processedAudioUrl)
              return await response.blob()
            })()
          : null)

      if (!processedBlob) {
        throw new Error("Invalid audio data: Unable to access processed audio blob.")
      }

      console.log("[v0] Using direct client-side upload to bypass function payload limits")

      console.log("[v0] Audio blob size:", processedBlob.size, "bytes")

        // Generate unique filename
        const timestamp = Date.now()
        const randomId = Math.random().toString(36).substring(2, 15)
        const sanitizedTitle = meditation.title.replace(/[^a-z0-9-_]+/gi, "_") || "meditation"
        const inferExtensionFromMime = (mimeType?: string): string => {
          if (!mimeType) {
            return "webm"
          }

          if (mimeType.includes("mpeg")) {
            return "mp3"
          }
          if (mimeType.includes("wav") || mimeType.includes("wave")) {
            return "wav"
          }
          if (mimeType.includes("ogg")) {
            return "ogg"
          }
          if (mimeType.includes("m4a") || mimeType.includes("mp4")) {
            return "m4a"
          }

          const subtype = mimeType.split("/")[1]
          return subtype || "webm"
        }

        const distributionExtension = inferExtensionFromMime(processedBlob.type)
        const distributionContentType = processedBlob.type || `audio/${distributionExtension}`
        const fileBase = `${sanitizedTitle}_${timestamp}_${randomId}`
        const fileName = `${fileBase}.${distributionExtension}`
        const sourceFileBase = `${fileBase}_source`

        console.log("[v0] Uploading directly to Supabase Storage:", fileName)

        // Upload distribution quality file
        const { data: uploadData, error: uploadError } = await meditationsBucket.upload(fileName, processedBlob, {
          contentType: distributionContentType,
          upsert: false,
        })

        if (uploadError) {
          console.error("[v0] Direct upload error:", uploadError)
          throw new Error(`Upload failed: ${uploadError.message}`)
        }

        console.log("[v0] Upload successful:", uploadData.path)

        // Get public URL for distribution file
        const { data: urlData } = meditationsBucket.getPublicUrl(uploadData.path)

        console.log("[v0] Public URL:", urlData.publicUrl)

        let sourcePublicUrl: string | undefined =
          isBlobLikeUrl(meditation.sourceAudioUrl) || meditation.sourceAudioUrl == null
            ? undefined
            : meditation.sourceAudioUrl
        let sourceStoragePath: string | undefined
        const metadataToSave: SavedMeditation["metadata"] = { ...meditation.metadata }

        if (Array.isArray(metadataToSave.timeline) && metadataToSave.timeline.length > 0) {
          const processedTimeline = await Promise.all(
            metadataToSave.timeline.map(async (event) => {
              const processedEvent = { ...event }

              if (
                processedEvent.recordingUrl &&
                (processedEvent.recordingUrl.startsWith("blob:") || processedEvent.recordingUrl.startsWith("data:"))
              ) {
                try {
                  const response = await fetch(processedEvent.recordingUrl)
                  const recordingBlob = await response.blob()
                  const extension = inferExtensionFromMime(recordingBlob.type)
                  const recordingFileName = `timeline_recordings/${timestamp}_${Math.random()
                    .toString(36)
                    .slice(2)}_${processedEvent.id || "event"}.${extension}`

                  const { data: recordingUploadData, error: recordingUploadError } = await meditationsBucket.upload(
                    recordingFileName,
                    recordingBlob,
                    {
                      contentType: recordingBlob.type || "audio/webm",
                      upsert: false,
                    },
                  )

                  if (recordingUploadError) {
                    console.error("[v0] Timeline recording upload error:", recordingUploadError)
                  } else if (recordingUploadData?.path) {
                    const { data: recordingUrlData } = meditationsBucket.getPublicUrl(recordingUploadData.path)

                    processedEvent.recordingUrl = recordingUrlData.publicUrl
                    processedEvent.recordingStoragePath = recordingUploadData.path
                  }
                } catch (error) {
                  console.error("[v0] Failed to upload timeline recording:", error)
                }
              }

              return processedEvent
            }),
          )

          metadataToSave.timeline = processedTimeline as NonNullable<SavedMeditation["metadata"]["timeline"]>
        }
        const providedSourceBlob: Blob | null =
          meditation.sourceAudioData ??
          (isBlobLikeUrl(meditation.sourceAudioUrl)
            ? await (async () => {
                if (!meditation.sourceAudioUrl) {
                  return null
                }
                const response = await fetch(meditation.sourceAudioUrl)
                return await response.blob()
              })()
            : null)

        const sharesProcessedBlob =
          (!!meditation.sourceAudioData && meditation.sourceAudioData === meditation.processedAudioData) ||
          (meditation.sourceAudioUrl && meditation.sourceAudioUrl === meditation.processedAudioUrl)

        if (sharesProcessedBlob) {
          sourcePublicUrl = urlData.publicUrl
        } else if (providedSourceBlob) {
          console.log("[v0] Source audio blob size:", providedSourceBlob.size, "bytes")

          const sourceExtension = inferExtensionFromMime(providedSourceBlob.type)
          const sourceContentType = providedSourceBlob.type || `audio/${sourceExtension}`
          const sourceFileName = `${sourceFileBase}.${sourceExtension}`

          console.log("[v0] Uploading high-quality source file:", sourceFileName)

          const { data: sourceUploadData, error: sourceUploadError } = await meditationsBucket.upload(
            sourceFileName,
            providedSourceBlob,
            {
              contentType: sourceContentType,
              upsert: false,
            },
          )

          if (sourceUploadError) {
            console.error("[v0] Source upload error:", sourceUploadError)
            console.warn("[v0] Continuing without source file")
          } else {
            const { data: sourceUrlData } = meditationsBucket.getPublicUrl(sourceUploadData.path)
            sourcePublicUrl = sourceUrlData.publicUrl
            sourceStoragePath = sourceUploadData.path
            console.log("[v0] Source public URL:", sourcePublicUrl)
          }
        }

        const durationInSeconds = Math.round(meditation.duration)

        const { data: dbData, error: dbError } = await supabase
          .from("meditations")
          .insert({
            title: meditation.title,
            description: `${meditation.source} meditation`,
            audio_url: urlData.publicUrl,
            source_audio_url: sourcePublicUrl,
            duration: durationInSeconds,
            source: meditation.source,
            metadata: metadataToSave,
            original_filename: meditation.originalFileName,
            profile_id: TEST_PROFILE_ID,
          })
          .select()
          .single()

        if (dbError) {
          console.error("[v0] Database insert error:", dbError)
          await meditationsBucket.remove([uploadData.path])
          if (sourceStoragePath) {
            await meditationsBucket.remove([sourceStoragePath])
          }
          throw new Error(`Database save failed: ${dbError.message}`)
        }

        console.log("[v0] Client-side save successful:", dbData.id)

        return {
          id: dbData.id,
          title: dbData.title,
          originalFileName: dbData.original_filename,
          processedAudioUrl: dbData.audio_url,
          sourceAudioUrl: dbData.source_audio_url,
          duration: dbData.duration,
          createdAt: new Date(dbData.created_at),
          source: dbData.source as "adjuster" | "encoder",
          metadata: dbData.metadata || metadataToSave || {},
        }
    } catch (error) {
      console.error("[v0] Error in saveMeditation:", error)
      throw error
    }
  }

  static async getAllMeditations(): Promise<SavedMeditation[]> {
    try {
      console.log("[v0] getAllMeditations - fetching from Supabase")
      const supabase = createClient()

      const { data, error } = await supabase
        .from("meditations")
        .select("*")
        .eq("profile_id", TEST_PROFILE_ID)
        .order("created_at", { ascending: false })

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
        sourceAudioUrl: row.source_audio_url,
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
        sourceAudioUrl: data.source_audio_url,
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

      const { data: meditation, error: fetchError } = await supabase
        .from("meditations")
        .select("audio_url, source_audio_url, metadata")
        .eq("id", id)
        .single()

      if (fetchError) {
        console.error("[v0] Error fetching meditation for deletion:", fetchError)
        throw fetchError
      }

      const { error: deleteError } = await supabase.from("meditations").delete().eq("id", id)

      if (deleteError) {
        console.error("[v0] Error deleting meditation from database:", deleteError)
        throw deleteError
      }

      const filesToDelete: string[] = []

      if (meditation?.audio_url) {
        try {
          const storageUrl = new URL(meditation.audio_url)
          const pathSegments = storageUrl.pathname.split("/").filter(Boolean)
          const publicIndex = pathSegments.findIndex((segment) => segment === "public")

          if (publicIndex !== -1 && pathSegments.length > publicIndex + 2) {
            const bucketName = pathSegments[publicIndex + 1]
            const filePath = pathSegments.slice(publicIndex + 2).join("/")
            filesToDelete.push(filePath)
          }
        } catch (error) {
          console.warn("[v0] Could not parse audio_url:", error)
        }
      }

      if (meditation?.source_audio_url) {
        try {
          const storageUrl = new URL(meditation.source_audio_url)
          const pathSegments = storageUrl.pathname.split("/").filter(Boolean)
          const publicIndex = pathSegments.findIndex((segment) => segment === "public")

          if (publicIndex !== -1 && pathSegments.length > publicIndex + 2) {
            const filePath = pathSegments.slice(publicIndex + 2).join("/")
            filesToDelete.push(filePath)
          }
        } catch (error) {
          console.warn("[v0] Could not parse source_audio_url:", error)
        }
      }

      const timelineMetadata = Array.isArray(meditation?.metadata?.timeline)
        ? (meditation.metadata.timeline as Array<{ recordingStoragePath?: string }>)
        : []

      for (const event of timelineMetadata) {
        if (event.recordingStoragePath) {
          filesToDelete.push(event.recordingStoragePath)
        }
      }

      if (filesToDelete.length > 0) {
        console.log(`[v0] Deleting ${filesToDelete.length} audio file(s) from storage:`, filesToDelete)
        const { error: storageError } = await supabase.storage.from("meditations").remove(filesToDelete)

        if (storageError) {
          console.warn("[v0] Warning: Could not delete audio files from storage:", storageError)
        } else {
          console.log("[v0] Audio files deleted from storage successfully")
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
          profile_id: TEST_PROFILE_ID,
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
        meditationIds: [],
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
        .eq("profile_id", TEST_PROFILE_ID)
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
        if (error.code !== "23505") {
          console.error("[v0] Error adding to playlist:", error)
          throw error
        }
      }

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
            source_audio_url,
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
        .filter((item: any) => item.meditations)
        .map((item: any) => ({
          id: item.meditations.id,
          title: item.meditations.title,
          originalFileName: item.meditations.original_filename || item.meditations.description || "Unknown",
          processedAudioUrl: item.meditations.audio_url,
          sourceAudioUrl: item.meditations.source_audio_url,
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
