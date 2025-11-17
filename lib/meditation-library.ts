import { createClient } from "@/lib/supabase/client"
import type { BufferToWavMetadata } from "./audio-utils"
import { getAuthState } from "./auth-state"
import {
  saveAudioRecord,
  getAudioRecord,
  deleteAudioRecord,
  exportAudioRecords,
  importAudioBackups,
  estimateAudioUsage,
  type AudioBackup,
  type SerializedBlob,
} from "./storage/indexed-db"
import {
  addMeditationToMemoryPlaylist,
  deleteMemoryMeditation,
  deleteMemoryPlaylist,
  getMemoryAudio,
  getMemoryMeditation,
  getMemoryMeditations,
  getMemoryPlaylists,
  getMemoryPlaylistMeditations,
  getMemoryUsageBytes,
  removeMeditationFromMemoryPlaylist,
  saveMemoryMeditation,
  upsertMemoryPlaylist,
} from "./storage/memory-store"

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

export interface SaveMeditationInput extends Omit<SavedMeditation, "id" | "createdAt" | "processedAudioUrl"> {
  processedAudioData?: Blob | null
  sourceAudioData?: Blob | null
}

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    try {
      return crypto.randomUUID()
    } catch (error) {
      // fallthrough
    }
  }
  return `meditation_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

const resolveBlobFromUrl = async (value?: string | null) => {
  if (!value) return null
  if (value.startsWith("blob:") || value.startsWith("data:")) {
    const response = await fetch(value)
    return await response.blob()
  }
  return null
}

const buildObjectUrl = (blob?: Blob | null) => (blob ? URL.createObjectURL(blob) : "")

const mapTimelineWithRecordings = (
  metadata: SavedMeditation["metadata"],
  recordings?: Record<string, Blob>,
): SavedMeditation["metadata"] => {
  if (!Array.isArray(metadata?.timeline)) return metadata
  return {
    ...metadata,
    timeline: metadata.timeline.map((event) => {
      const cloned = { ...event }
      const key = event.recordingStoragePath || event.id
      if (key && recordings?.[key]) {
        cloned.recordingUrl = buildObjectUrl(recordings[key])
      }
      return cloned
    }) as NonNullable<SavedMeditation["metadata"]["timeline"]>,
  }
}

const sanitizeMetadataForStorage = (
  metadata: SavedMeditation["metadata"],
  timelineRecordings: Record<string, Blob>,
  meditationId: string,
) => {
  if (!Array.isArray(metadata.timeline)) return metadata

  const updatedTimeline = metadata.timeline.map((event) => {
    const originalKey = event.recordingStoragePath || event.id
    const storageKey = originalKey || `${meditationId}-${Math.random().toString(36).slice(2, 8)}`
    const cloned = { ...event, recordingStoragePath: storageKey }
    delete cloned.recordingUrl

    if (originalKey && storageKey && timelineRecordings[originalKey]) {
      if (storageKey !== originalKey) {
        timelineRecordings[storageKey] = timelineRecordings[originalKey]
        delete timelineRecordings[originalKey]
      }
    }

    return cloned
  })

  return { ...metadata, timeline: updatedTimeline }
}

const normalizeSupabaseMeditation = (
  row: any,
  processedAudioUrl: string,
  sourceAudioUrl?: string,
  recordings?: Record<string, Blob>,
): SavedMeditation => ({
  id: row.id,
  title: row.title,
  originalFileName: row.original_filename || row.description || "Unknown",
  processedAudioUrl,
  sourceAudioUrl,
  duration: row.duration || 0,
  createdAt: new Date(row.created_at),
  source: row.source as "adjuster" | "encoder",
  metadata: mapTimelineWithRecordings(row.metadata || {}, recordings) || {},
})

export class MeditationLibrary {
  static async saveMeditation(meditation: SaveMeditationInput): Promise<SavedMeditation> {
    const auth = getAuthState()
    console.log("[v0] saveMeditation - Auth state:", { status: auth.status, userId: auth.userId })
    
    const processedBlob: Blob | null =
      meditation.processedAudioData ?? (await resolveBlobFromUrl(meditation.processedAudioUrl))

    if (!processedBlob) {
      throw new Error("Invalid audio data: Unable to access processed audio blob.")
    }

    const providedSourceBlob: Blob | null =
      meditation.sourceAudioData ?? (await resolveBlobFromUrl(meditation.sourceAudioUrl))

    const timelineRecordings: Record<string, Blob> = {}
    if (Array.isArray(meditation.metadata.timeline)) {
      for (const event of meditation.metadata.timeline) {
        if (event.recordingUrl?.startsWith("blob:") || event.recordingUrl?.startsWith("data:")) {
          try {
            const blob = await resolveBlobFromUrl(event.recordingUrl)
            if (blob) {
              timelineRecordings[event.id] = blob
            }
          } catch (error) {
            console.warn("Unable to store timeline recording", error)
          }
        }
      }
    }

    if (auth.status !== "authenticated" || !auth.userId) {
      console.log("[v0] Saving to memory (unauthenticated)")
      const id = createId()
      const processedUrl = buildObjectUrl(processedBlob)
      const sourceUrl = buildObjectUrl(providedSourceBlob)
      const metadataToSave = sanitizeMetadataForStorage({ ...meditation.metadata }, timelineRecordings, id)
      const savedMeditation: SavedMeditation = {
        id,
        title: meditation.title,
        originalFileName: meditation.originalFileName,
        processedAudioUrl: processedUrl,
        sourceAudioUrl: sourceUrl || undefined,
        duration: Math.round(meditation.duration),
        createdAt: new Date(),
        source: meditation.source,
        metadata: mapTimelineWithRecordings(metadataToSave, timelineRecordings) || metadataToSave,
      }

      saveMemoryMeditation(id, savedMeditation, {
        processedAudio: processedBlob,
        sourceAudio: providedSourceBlob,
        timelineRecordings,
      })

      return savedMeditation
    }

    console.log("[v0] Saving to Supabase + IndexedDB (authenticated)")
    const supabase = createClient()

    const metadataToPersist = sanitizeMetadataForStorage({ ...meditation.metadata }, timelineRecordings, "pending")
    const durationInSeconds = Math.round(meditation.duration)

    const { data, error } = await supabase
      .from("meditations")
      .insert({
        title: meditation.title,
        description: `${meditation.source} meditation`,
        duration: durationInSeconds,
        source: meditation.source,
        metadata: metadataToPersist,
        original_filename: meditation.originalFileName,
        profile_id: auth.userId!,
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Database insert error:", error)
      throw new Error(`Database save failed: ${error.message}`)
    }

    const meditationId = data.id as string
    console.log("[v0] Saved to Supabase with ID:", meditationId)
    
    const finalizedMetadata = sanitizeMetadataForStorage({ ...meditation.metadata }, timelineRecordings, meditationId)

    await supabase.from("meditations").update({ metadata: finalizedMetadata }).eq("id", meditationId)

    console.log("[v0] Saving audio to IndexedDB...")
    await saveAudioRecord({
      id: meditationId,
      processedAudio: processedBlob,
      sourceAudio: providedSourceBlob,
      timelineRecordings,
    })
    console.log("[v0] Audio saved to IndexedDB successfully")

    return normalizeSupabaseMeditation(
      { ...data, metadata: finalizedMetadata },
      buildObjectUrl(processedBlob),
      buildObjectUrl(providedSourceBlob),
      timelineRecordings,
    )
  }

  static async getAllMeditations(): Promise<SavedMeditation[]> {
    const auth = getAuthState()
    console.log("[v0] getAllMeditations - Auth state:", { status: auth.status, userId: auth.userId })
    
    if (auth.status !== "authenticated" || !auth.userId) {
      const memoryMeds = getMemoryMeditations()
      console.log("[v0] Loaded from memory:", memoryMeds.length, "meditations")
      return memoryMeds
    }

    console.log("[v0] Loading from Supabase...")
    const supabase = createClient()
    const { data, error } = await supabase
      .from("meditations")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Supabase select error:", error)
      return []
    }

    if (!data || data.length === 0) {
      console.log("[v0] No meditations found in Supabase")
      return []
    }

    console.log("[v0] Found", data.length, "meditations in Supabase, loading audio from IndexedDB...")
    const meditations: SavedMeditation[] = []
    for (const row of data) {
      try {
        console.log("[v0] Loading audio for meditation:", row.id)
        const audio = await getAudioRecord(row.id)
        if (!audio) {
          console.warn("[v0] No audio found in IndexedDB for meditation:", row.id)
        } else {
          console.log("[v0] Successfully loaded audio from IndexedDB for:", row.id)
        }
        const processedUrl = buildObjectUrl(audio?.processedAudio)
        const sourceUrl = buildObjectUrl(audio?.sourceAudio ?? null)
        meditations.push(normalizeSupabaseMeditation(row, processedUrl, sourceUrl, audio?.timelineRecordings))
      } catch (error) {
        console.warn("[v0] Unable to load audio from IndexedDB", row.id, error)
        meditations.push(normalizeSupabaseMeditation(row, ""))
      }
    }

    console.log("[v0] Loaded", meditations.length, "complete meditations")
    return meditations
  }

  static async getMeditation(id: string): Promise<SavedMeditation | null> {
    const auth = getAuthState()
    if (auth.status !== "authenticated" || !auth.userId) {
      return getMemoryMeditation(id)
    }

    const supabase = createClient()

    const { data, error } = await supabase.from("meditations").select("*").eq("id", id).single()

    if (error || !data) {
      return null
    }

    try {
      const audio = await getAudioRecord(id)
      return normalizeSupabaseMeditation(
        data,
        buildObjectUrl(audio?.processedAudio),
        buildObjectUrl(audio?.sourceAudio ?? null),
        audio?.timelineRecordings,
      )
    } catch (err) {
      console.warn("[v0] Unable to fetch audio for meditation", id, err)
      return normalizeSupabaseMeditation(data, "")
    }
  }

  static async deleteMeditation(id: string): Promise<void> {
    const auth = getAuthState()
    if (auth.status !== "authenticated" || !auth.userId) {
      deleteMemoryMeditation(id)
      return
    }

    const supabase = createClient()
    const { error } = await supabase.from("meditations").delete().eq("id", id)

    if (error) {
      console.error("[v0] Error deleting meditation:", error)
      throw error
    }

    await deleteAudioRecord(id)
  }

  static async getAllPlaylists(): Promise<Playlist[]> {
    const auth = getAuthState()
    if (auth.status !== "authenticated" || !auth.userId) {
      return getMemoryPlaylists()
    }

    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("playlists")
        .select(
          `
          *,
          playlist_meditations (
            meditation_id
          )
        `,
        )
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
    const auth = getAuthState()
    if (auth.status !== "authenticated" || !auth.userId) {
      return getMemoryPlaylists().find((playlist) => playlist.id === id) ?? null
    }

    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("playlists")
        .select(
          `
          *,
          playlist_meditations (
            meditation_id
          )
        `,
        )
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

  static async createPlaylist(name: string, description: string): Promise<Playlist> {
    const auth = getAuthState()
    if (auth.status !== "authenticated" || !auth.userId) {
      const playlist: Playlist = {
        id: createId(),
        name,
        description,
        meditationIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      upsertMemoryPlaylist(playlist)
      return playlist
    }

    const supabase = createClient()

    const { data, error } = await supabase
      .from("playlists")
      .insert({
        name,
        description,
        profile_id: auth.userId!,
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
  }

  static async updatePlaylist(
    id: string,
    updates: Partial<Pick<Playlist, "name" | "description">>,
  ): Promise<void> {
    const auth = getAuthState()
    if (auth.status !== "authenticated" || !auth.userId) {
      const existing = getMemoryPlaylists().find((playlist) => playlist.id === id)
      if (existing) {
        upsertMemoryPlaylist({ ...existing, ...updates, updatedAt: new Date() })
      }
      return
    }

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
    const auth = getAuthState()
    if (auth.status !== "authenticated" || !auth.userId) {
      deleteMemoryPlaylist(id)
      return
    }

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
    const auth = getAuthState()
    if (auth.status !== "authenticated" || !auth.userId) {
      addMeditationToMemoryPlaylist(playlistId, meditationId)
      return
    }

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
    const auth = getAuthState()
    if (auth.status !== "authenticated" || !auth.userId) {
      removeMeditationFromMemoryPlaylist(playlistId, meditationId)
      return
    }

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
    const auth = getAuthState()
    if (auth.status !== "authenticated" || !auth.userId) {
      const ids = getMemoryPlaylistMeditations(playlistId)
      return ids
        .map((id) => getMemoryMeditation(id))
        .filter((meditation): meditation is SavedMeditation => Boolean(meditation))
    }

    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("playlist_meditations")
        .select("meditation_id")
        .eq("playlist_id", playlistId)
        .order("added_at", { ascending: true })

      if (error) {
        console.error("[v0] Error fetching playlist meditations:", error)
        return []
      }

      const meditationIds = (data ?? []).map((item: any) => item.meditation_id)
      const meditations = await Promise.all(meditationIds.map((id) => this.getMeditation(id)))
      return meditations.filter((meditation): meditation is SavedMeditation => Boolean(meditation))
    } catch (error) {
      console.error("[v0] Error in getPlaylistMeditations:", error)
      return []
    }
  }

  static async exportBackup(): Promise<Blob> {
    const auth = getAuthState()
    if (auth.status !== "authenticated" || !auth.userId) {
      const meditations = getMemoryMeditations()
      const audio: AudioBackup[] = []

      for (const meditation of meditations) {
        const audioRecord = getMemoryAudio(meditation.id)
        const timelineRecordings: Record<string, SerializedBlob> = {}
        if (audioRecord?.timelineRecordings) {
          for (const [key, blob] of Object.entries(audioRecord.timelineRecordings)) {
            const serialized = await serializeBlobForBackup(blob)
            if (serialized) {
              timelineRecordings[key] = serialized
            }
          }
        }

        audio.push({
          id: meditation.id,
          processedAudio: await serializeBlobForBackup(audioRecord?.processedAudio ?? null),
          sourceAudio: await serializeBlobForBackup(audioRecord?.sourceAudio ?? null),
          timelineRecordings: Object.keys(timelineRecordings).length > 0 ? timelineRecordings : undefined,
        })
      }

      const metadata = meditations.map((meditation) => ({
        ...meditation,
        processedAudioUrl: "",
        sourceAudioUrl: undefined,
        createdAt: meditation.createdAt instanceof Date ? meditation.createdAt.toISOString() : meditation.createdAt,
      }))

      const payload = {
        version: 1,
        meditations: metadata,
        audio,
      }

      return new Blob([JSON.stringify(payload)], { type: "application/json" })
    }

    const supabase = createClient()
    const { data } = await supabase
      .from("meditations")
      .select("*")

    const meditations = (data ?? []).map((row) => normalizeSupabaseMeditation(row, ""))
    const audio = await exportAudioRecords(meditations.map((m) => m.id))

    const payload = { version: 1, meditations, audio }
    return new Blob([JSON.stringify(payload)], { type: "application/json" })
  }

  static async importBackup(file: File): Promise<void> {
    const text = await file.text()
    const payload = JSON.parse(text) as { version: number; meditations: SavedMeditation[]; audio: AudioBackup[] }

    const auth = getAuthState()
    if (payload.version !== 1) {
      throw new Error("Unsupported backup version")
    }

    if (auth.status === "authenticated" && auth.userId) {
      const supabase = createClient()
      if (payload.meditations?.length) {
        await supabase.from("meditations").upsert(
          payload.meditations.map((meditation) => ({
            id: meditation.id,
            title: meditation.title,
            description: meditation.originalFileName,
            duration: meditation.duration,
            source: meditation.source,
            metadata: meditation.metadata,
            original_filename: meditation.originalFileName,
            profile_id: auth.userId!,
          })),
          { onConflict: "id" },
        )
      }
      if (payload.audio?.length) {
        await importAudioBackups(payload.audio)
      }
      return
    }

    if (payload.meditations) {
      payload.meditations.forEach((meditation) => {
        const audioBackup = payload.audio?.find((backup) => backup.id === meditation.id)
        const processed = audioBackup?.processedAudio ? deserializeSerialized(audioBackup.processedAudio) : null
        const source = audioBackup?.sourceAudio ? deserializeSerialized(audioBackup.sourceAudio) : null
        const timelineRecordings: Record<string, Blob> = {}
        if (audioBackup?.timelineRecordings) {
          Object.entries(audioBackup.timelineRecordings).forEach(([key, serialized]) => {
            const blob = deserializeSerialized(serialized)
            if (blob) {
              timelineRecordings[key] = blob
            }
          })
        }
        const meditationWithUrls: SavedMeditation = {
          ...meditation,
          processedAudioUrl: processed ? buildObjectUrl(processed) : "",
          sourceAudioUrl: source ? buildObjectUrl(source) : undefined,
          createdAt: new Date(meditation.createdAt ?? new Date()),
          metadata: meditation.metadata || {},
        }
        saveMemoryMeditation(meditation.id, meditationWithUrls, {
          processedAudio: processed ?? new Blob(),
          sourceAudio: source,
          timelineRecordings,
        })
      })
    }
  }

  static async getStorageUsage() {
    const auth = getAuthState()
    if (auth.status !== "authenticated" || !auth.userId) {
      return { usedBytes: getMemoryUsageBytes() }
    }
    return estimateAudioUsage()
  }
}

async function serializeBlobForBackup(blob?: Blob | null) {
  if (!blob) return null
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return { data: btoa(binary), type: blob.type }
}

function deserializeSerialized(value: { data: string; type: string } | null | undefined): Blob | null {
  if (!value) return null
  const binary = atob(value.data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: value.type })
}
