import { createClient } from "@/lib/supabase/client"
import { extensionForContainer, type AudioFormatMetadata, type BufferToWavMetadata } from "./audio-utils"
import { getAuthState } from "./auth-state"
import JSZip from "jszip"
import {
  saveAudioRecord,
  getAudioRecord,
  deleteAudioRecord,
  getAllAudioRecords,
  estimateAudioUsage,
  type AudioRecord,
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
  source: "adjuster" | "creator"
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
    // For creator meditations
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
    wav?: BufferToWavMetadata // legacy — only for records that are genuinely WAV
    audioFormat?: AudioFormatMetadata
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

const resolveAudioExtension = (
  metadata: SavedMeditation["metadata"] | undefined,
  blob: Blob | null | undefined,
): string => {
  if (metadata?.audioFormat?.container) {
    return extensionForContainer(metadata.audioFormat.container)
  }
  const mime = blob?.type || ""
  if (mime.includes("ogg")) return "ogg"
  if (mime.includes("mp3") || mime.includes("mpeg")) return "mp3"
  if (mime.includes("wav")) return "wav"
  if (metadata?.wav) return "wav"
  // Legacy records predate audioFormat/reliable blob typing and were always zipped as .mp3
  return "mp3"
}

const KNOWN_AUDIO_EXTENSIONS = ["ogg", "mp3", "wav"]

const findZipAudioFile = (zip: JSZip, baseName: string, preferredExt?: string) => {
  const candidates = preferredExt
    ? [preferredExt, ...KNOWN_AUDIO_EXTENSIONS.filter((ext) => ext !== preferredExt)]
    : KNOWN_AUDIO_EXTENSIONS
  for (const ext of candidates) {
    const found = zip.file(`${baseName}.${ext}`)
    if (found) return { file: found, ext }
  }
  return null
}

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
  source: row.source as "adjuster" | "creator",
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
    try {
      await saveAudioRecord({
        id: meditationId,
        processedAudio: processedBlob,
        sourceAudio: providedSourceBlob,
        timelineRecordings,
      })
      console.log("[v0] Audio saved to IndexedDB successfully")
    } catch (error) {
      console.error("[v0] Failed to save audio to IndexedDB:", error)
      throw error
    }

    return normalizeSupabaseMeditation(
      { ...data, metadata: finalizedMetadata },
      buildObjectUrl(processedBlob),
      buildObjectUrl(providedSourceBlob),
      timelineRecordings,
    )
  }

  /**
   * Re-encodes an existing meditation's audio into a different format, replacing it in
   * place — same id, same playlists, just a different underlying file and format metadata.
   */
  static async replaceMeditationAudio(
    id: string,
    updates: { audioData: Blob; duration: number; audioFormat: AudioFormatMetadata },
  ): Promise<SavedMeditation> {
    const auth = getAuthState()
    const processedUrl = buildObjectUrl(updates.audioData)
    const durationInSeconds = Math.round(updates.duration)

    if (auth.status !== "authenticated" || !auth.userId) {
      const existing = getMemoryMeditation(id)
      if (!existing) {
        throw new Error("Meditation not found.")
      }
      const existingAudio = getMemoryAudio(id)
      const updatedMetadata: SavedMeditation["metadata"] = {
        ...existing.metadata,
        audioFormat: updates.audioFormat,
        wav: undefined,
      }
      const updated: SavedMeditation = {
        ...existing,
        duration: durationInSeconds,
        processedAudioUrl: processedUrl,
        sourceAudioUrl: processedUrl,
        metadata: updatedMetadata,
      }
      saveMemoryMeditation(id, updated, {
        processedAudio: updates.audioData,
        sourceAudio: updates.audioData,
        timelineRecordings: existingAudio?.timelineRecordings,
      })
      return updated
    }

    const supabase = createClient()
    const existing = await this.getMeditation(id)
    if (!existing) {
      throw new Error("Meditation not found.")
    }
    const updatedMetadata: SavedMeditation["metadata"] = {
      ...existing.metadata,
      audioFormat: updates.audioFormat,
      wav: undefined,
    }

    const { error } = await supabase
      .from("meditations")
      .update({ duration: durationInSeconds, metadata: updatedMetadata })
      .eq("id", id)

    if (error) {
      console.error("[v0] Error updating meditation audio:", error)
      throw new Error(`Database update failed: ${error.message}`)
    }

    const existingAudio = await getAudioRecord(id)
    await saveAudioRecord({
      id,
      processedAudio: updates.audioData,
      sourceAudio: updates.audioData,
      timelineRecordings: existingAudio?.timelineRecordings,
    })

    return {
      ...existing,
      duration: durationInSeconds,
      processedAudioUrl: processedUrl,
      sourceAudioUrl: processedUrl,
      metadata: updatedMetadata,
    }
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
          console.warn("[v0] MISSING AUDIO: No audio record found in IndexedDB for meditation:", row.id)
          // We still return the meditation so the user sees the metadata, 
          // but the UI will need to handle the missing audio URL.
        } else {
          console.log("[v0] Successfully loaded audio from IndexedDB for:", row.id, "Size:", audio.processedAudio?.size)
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
      throw new Error("Backup export is only available for authenticated users")
    }

    const supabase = createClient()
    const { data } = await supabase
      .from("meditations")
      .select("*")
      .order("created_at", { ascending: false })

    if (!data || data.length === 0) {
      throw new Error("No meditations to export")
    }

    const zip = new JSZip()

    // Add audio blobs as separate files
    const audioRecords = await getAllAudioRecords()
    const audioMap = new Map(audioRecords.map((record) => [record.id, record]))

    // Add metadata JSON (without audio URLs), including the real extension of each zipped file
    const metadata = data.map((row: any) => {
      const audioRecord = audioMap.get(row.id)
      const rowMetadata = (row.metadata || {}) as SavedMeditation["metadata"]
      return {
        id: row.id,
        title: row.title,
        originalFileName: row.original_filename || row.description || "Unknown",
        duration: row.duration || 0,
        createdAt: new Date(row.created_at).toISOString(),
        source: row.source as "adjuster" | "creator",
        metadata: rowMetadata,
        audioExt: resolveAudioExtension(rowMetadata, audioRecord?.processedAudio),
        sourceExt: resolveAudioExtension(rowMetadata, audioRecord?.sourceAudio),
      }
    })

    zip.file("meditations.json", JSON.stringify(metadata, null, 2))

    for (const entry of metadata) {
      const audioRecord = audioMap.get(entry.id)
      if (!audioRecord) continue

      // Add processed audio
      if (audioRecord.processedAudio) {
        zip.file(`audio-${entry.id}.${entry.audioExt}`, audioRecord.processedAudio)
      }

      // Add source audio if exists
      if (audioRecord.sourceAudio) {
        zip.file(`source-${entry.id}.${entry.sourceExt}`, audioRecord.sourceAudio)
      }

      // Add timeline recordings if exist
      if (audioRecord.timelineRecordings) {
        for (const [key, blob] of Object.entries(audioRecord.timelineRecordings)) {
          zip.file(`timeline-${entry.id}-${key}.${resolveAudioExtension(entry.metadata, blob)}`, blob)
        }
      }
    }

    return await zip.generateAsync({ type: "blob" })
  }

  static async importBackup(file: File, onProgress?: (progress: number, message: string) => void): Promise<void> {
    const auth = getAuthState()
    
    if (auth.status !== "authenticated" || !auth.userId) {
      throw new Error("Backup import is only available for authenticated users")
    }

    const zip = await JSZip.loadAsync(file)
    
    // Read metadata
    const metadataFile = zip.file("meditations.json")
    if (!metadataFile) {
      throw new Error("Invalid backup file: missing meditations.json")
    }

    const metadataText = await metadataFile.async("text")
    const meditations = JSON.parse(metadataText) as Array<{
      id: string
      title: string
      originalFileName: string
      duration: number
      createdAt: string
      source: "adjuster" | "creator"
      metadata: any
      audioExt?: string
      sourceExt?: string
    }>

    onProgress?.(10, "Reading backup file...")

    const supabase = createClient()
    const totalSteps = meditations.length

    // Import meditations one by one
    for (let i = 0; i < meditations.length; i++) {
      const meditation = meditations[i]
      const progress = 10 + ((i + 1) / totalSteps) * 80

      onProgress?.(progress, `Restoring meditation ${i + 1} of ${totalSteps}...`)

      // Save metadata to Supabase
      await supabase.from("meditations").upsert(
        {
          id: meditation.id,
          title: meditation.title,
          description: meditation.originalFileName,
          duration: meditation.duration,
          source: meditation.source,
          metadata: meditation.metadata,
          original_filename: meditation.originalFileName,
          profile_id: auth.userId!,
        },
        { onConflict: "id" }
      )

      // Restore audio blobs from zip (prefer the extension recorded at export time; fall back to
      // probing known extensions for backup ZIPs exported before extensions were tracked)
      const processedAudioMatch = findZipAudioFile(zip, `audio-${meditation.id}`, meditation.audioExt)
      const sourceAudioMatch = findZipAudioFile(zip, `source-${meditation.id}`, meditation.sourceExt)

      if (processedAudioMatch) {
        const processedBlob = await processedAudioMatch.file.async("blob")
        const sourceBlob = sourceAudioMatch ? await sourceAudioMatch.file.async("blob") : null

        // Find timeline recordings
        const timelineRecordings: Record<string, Blob> = {}
        const timelinePrefix = `timeline-${meditation.id}-`

        zip.forEach((relativePath, zipEntry) => {
          if (relativePath.startsWith(timelinePrefix) && !zipEntry.dir) {
            const key = relativePath.replace(timelinePrefix, "").replace(/\.[^/.]+$/, "")
            // We'll load these async below
            timelineRecordings[key] = null as any // placeholder
          }
        })

        // Load timeline recordings
        for (const key of Object.keys(timelineRecordings)) {
          const timelineMatch = findZipAudioFile(zip, `${timelinePrefix}${key}`)
          if (timelineMatch) {
            timelineRecordings[key] = await timelineMatch.file.async("blob")
          }
        }

        // Save to IndexedDB
        await saveAudioRecord({
          id: meditation.id,
          processedAudio: processedBlob,
          sourceAudio: sourceBlob,
          timelineRecordings: Object.keys(timelineRecordings).length > 0 ? timelineRecordings : undefined,
        })
      }
    }

    onProgress?.(100, "Backup restored successfully!")
  }

  static async getStorageUsage() {
    const auth = getAuthState()
    if (auth.status !== "authenticated" || !auth.userId) {
      return { usedBytes: getMemoryUsageBytes() }
    }
    return estimateAudioUsage()
  }
}
