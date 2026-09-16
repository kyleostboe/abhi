import { createClient, getAuthHeader } from "@/lib/supabase/client"
import { extensionForContainer, type AudioFormatMetadata, type BufferToWavMetadata } from "./audio-utils"
import { getAuthState } from "./auth-state"
import JSZip from "jszip"
import {
  saveAudioRecord,
  getAudioRecord,
  deleteAudioRecord,
  getAllAudioRecords,
  type AudioRecord,
} from "./storage/indexed-db"
import { log } from "@/lib/log"
import {
  type BackupReport,
  buildBackupReport,
  planBackupAudio,
} from "@/lib/backup-audio"
import {
  ENTITLEMENT_COLUMNS,
  canSaveAnotherRecording,
  canSyncAnotherMeditation,
  entitlementsFromRow,
} from "@/lib/entitlements"
import { currentDeviceLabel } from "@/lib/device-label"
import { parentIdOf } from "@/lib/meditation-variants"
import { requestPersistentStorage } from "@/lib/storage-persistence"

// Shown only if the usage route could not be reached. The real quota is whatever
// lib/entitlements.ts grants the account, and the route reports it alongside the usage — this is
// a placeholder for a bar that has nothing to draw, not a second opinion about the limit.
const FALLBACK_QUOTA_BYTES = 2 * 1024 * 1024 * 1024

/**
 * Thrown when an operation needs an account and there isn't one.
 *
 * There used to be a shadow library in memory for signed-out users, which meant work could be
 * done, appear saved, and then vanish on refresh with nothing to recover it from. Signed-out
 * users can still upload, adjust and download — what they cannot do is save, because saving
 * implies somewhere for it to go.
 */
export class AccountRequiredError extends Error {
  constructor(action = "do that") {
    super(`Sign in to ${action}.`)
    this.name = "AccountRequiredError"
  }
}

/**
 * Thrown when a save would take the account past its synced-meditation allowance.
 *
 * A refusal rather than a silent local save. Audio kept in one browser is audio the browser can
 * evict — Safari clears script-writable storage after about a week without a visit — so quietly
 * keeping it there trades a limit someone can act on for a loss they cannot predict. Better to
 * say the library is full while the audio is still in their hands and can be downloaded.
 */
export class LibraryFullError extends Error {
  /** Which allowance was reached, since the two have different remedies. */
  readonly kind: "meditation" | "recording"

  constructor(kind: "meditation" | "recording") {
    super(
      kind === "recording"
        ? "Your recordings are full. Remove one, or subscribe for unlimited recordings."
        : "Your library is full. Download this meditation, remove one from your library, or subscribe.",
    )
    this.name = "LibraryFullError"
    this.kind = kind
  }
}

/**
 * Where a library row came from.
 *
 * `recording` is a reusable voice clip rather than a meditation. It lives in the same table so it
 * inherits the whole audio pipeline — R2 upload, presigned playback, backup, deletion — instead
 * of needing a parallel one, but it is excluded from meditation listings. Sharing storage is not
 * a claim that they are the same kind of thing.
 */
export type MeditationSource = "adjuster" | "creator" | "recording"

/** The sources that are actually meditations, for the listings that should only show those. */
export const MEDITATION_SOURCES: MeditationSource[] = ["adjuster", "creator"]

export const isRecording = (meditation: Pick<SavedMeditation, "source">): boolean =>
  meditation.source === "recording"

export interface SavedMeditation {
  id: string
  title: string
  originalFileName: string
  processedAudioUrl: string
  sourceAudioUrl?: string
  duration: number
  createdAt: Date
  source: MeditationSource
  /**
   * Where this meditation's audio is.
   *
   * "elsewhere" is the state the sync allowance creates: the row is here, with its title and
   * timeline and everything else, and the bytes are in the browser that made them. The library
   * still lists it, because an account knowing what it owns is the point — but it cannot play it,
   * and saying so is better than a card that silently does nothing.
   */
  audioAvailability: "synced" | "local" | "elsewhere"
  /** Coarse name of the device holding the audio, when it is "elsewhere". */
  audioDeviceLabel?: string | null
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

export interface SaveMeditationInput
  extends Omit<
    SavedMeditation,
    // Where the audio ends up is decided by the save, not supplied to it.
    "id" | "createdAt" | "processedAudioUrl" | "audioAvailability" | "audioDeviceLabel"
  > {
  processedAudioData?: Blob | null
  sourceAudioData?: Blob | null
  /**
   * Callers may hand over the audio either as a decoded blob (`processedAudioData`) or as the
   * `blob:`/`data:` URL it is currently playing from, which saveMeditation fetches back. One of
   * the two has to be present — `processedAudioUrl` is optional here rather than required only
   * because either half of that pair satisfies it.
   */
  processedAudioUrl?: string | null
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

// Uploads the processed audio to Cloudflare R2 via a server-minted presigned URL so it's
// playable from any device the user logs into, not just the browser that saved it. Audio
// bytes go straight from this browser to R2 — the server only hands back the URL. Best
// effort: if R2 isn't configured or the upload fails, returns null and the save proceeds
// with IndexedDB as the only copy, same as before this feature existed.
const uploadAudioToR2 = async (blob: Blob, ext: string): Promise<string | null> => {
  try {
    const contentType = blob.type || "application/octet-stream"
    const authHeader = await getAuthHeader()
    const urlResponse = await fetch("/api/storage/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader },
      // The size is signed into the URL, so the PUT below has to match it exactly.
      body: JSON.stringify({ ext, contentType, contentLength: blob.size }),
    })
    if (!urlResponse.ok) {
      log.warn("Unable to get R2 upload URL:", urlResponse.status, urlResponse.statusText)
      return null
    }
    const { uploadUrl, key } = (await urlResponse.json()) as { uploadUrl: string; key: string }

    const putResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: blob,
    })
    if (!putResponse.ok) {
      log.warn("R2 upload failed:", putResponse.status, putResponse.statusText)
      return null
    }
    return key
  } catch (error) {
    log.warn("R2 upload error:", error)
    return null
  }
}

// Best-effort cleanup for an R2 object that's just been superseded (e.g. by
// replaceMeditationAudio uploading a new object in its place). Never throws — a failure here
// just leaves harmless orphaned storage, same as if this cleanup didn't run at all.
const deleteAudioObjectFromR2 = async (audioKey: string): Promise<void> => {
  try {
    const authHeader = await getAuthHeader()
    const response = await fetch("/api/storage/delete-object", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({ audioKey }),
    })
    if (!response.ok) {
      log.warn("Unable to delete superseded R2 object:", response.status, response.statusText)
    }
  } catch (error) {
    log.warn("Error deleting superseded R2 object:", error)
  }
}

// Batch-resolves presigned playback URLs for meditations that have an audio_key, in a
// single round trip. Rows without an audio_key (saved before R2 storage was added) are
// simply absent from the result and fall back to the local IndexedDB copy.
const fetchR2DownloadUrls = async (meditationIds: string[]): Promise<Record<string, string>> => {
  if (meditationIds.length === 0) return {}
  try {
    const authHeader = await getAuthHeader()
    const response = await fetch("/api/storage/download-url", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({ meditationIds }),
    })
    if (!response.ok) {
      log.warn("Unable to fetch R2 download URLs:", response.status, response.statusText)
      return {}
    }
    const { urls } = (await response.json()) as { urls?: Record<string, string> }
    return urls ?? {}
  } catch (error) {
    log.warn("R2 download URL fetch error:", error)
    return {}
  }
}

/**
 * Storage keys of the timeline events that are recorded voice.
 *
 * `recordingStoragePath` is set on every event when a meditation is saved, not only the recorded
 * ones, so its presence says nothing about whether there is a blob to go with it — `eventType` is
 * the marker that does. Older rows may predate it, which under-reports rather than inventing a
 * missing recording that was never there.
 */
const timelineRecordingKeys = (metadata: SavedMeditation["metadata"] | undefined): string[] => {
  if (!Array.isArray(metadata?.timeline)) return []
  return metadata.timeline
    .filter((event) => event.eventType === "recorded_voice")
    .map((event) => event.recordingStoragePath || event.id)
    .filter((key): key is string => Boolean(key))
}

/**
 * Pulls processed audio back from R2 for the meditations the local cache has lost.
 *
 * Chunked because the download-url route caps a request at 200 ids and silently drops the rest —
 * a library past that size would otherwise come back partly empty for a reason nothing reported.
 *
 * Best effort per meditation: an expired URL or a failed fetch costs that one its audio and is
 * recorded in the report, rather than throwing away an export that is otherwise complete.
 */
const R2_RECOVERY_BATCH_SIZE = 200

const recoverProcessedAudioFromR2 = async (
  ids: string[],
  onProgress?: (progress: number, message: string) => void,
): Promise<Map<string, Blob>> => {
  const recovered = new Map<string, Blob>()
  if (ids.length === 0) return recovered

  const urls: Record<string, string> = {}
  for (let start = 0; start < ids.length; start += R2_RECOVERY_BATCH_SIZE) {
    Object.assign(urls, await fetchR2DownloadUrls(ids.slice(start, start + R2_RECOVERY_BATCH_SIZE)))
  }

  let done = 0
  for (const id of ids) {
    done += 1
    onProgress?.(Math.round((done / ids.length) * 100), `Fetching audio ${done} of ${ids.length}...`)

    const url = urls[id]
    if (!url) {
      log.warn(`[backup] No download URL for meditation ${id}; its audio will be missing`)
      continue
    }

    try {
      const response = await fetch(url)
      if (!response.ok) {
        log.warn(`[backup] Could not download audio for ${id}:`, response.status, response.statusText)
        continue
      }
      recovered.set(id, await response.blob())
    } catch (error) {
      log.warn(`[backup] Download failed for ${id}:`, error)
    }
  }

  return recovered
}

/** Postgres raises this hint when a save would take an account past its sync allowance. */
const ENTITLEMENT_LIMIT_HINT = "abhi_entitlement_limit"

const isEntitlementLimitError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false
  const candidate = error as { hint?: unknown; message?: unknown }
  return (
    candidate.hint === ENTITLEMENT_LIMIT_HINT ||
    (typeof candidate.message === "string" && candidate.message.includes(ENTITLEMENT_LIMIT_HINT))
  )
}

/**
 * Whether this save's audio can go to R2, or has to stay in the browser that made it.
 *
 * Asked before the upload so that a save past the allowance does not spend the bytes to find out.
 * The database enforces the same rule and is the one that actually decides — this is here to make
 * the common case cheap, not to be trusted, which is why `saveMeditation` still handles being
 * told no after the fact.
 *
 * Any failure answers "yes". Guessing wrong in this direction costs an upload the trigger then
 * refuses, and the save still completes locally; guessing wrong in the other direction would
 * leave audio on one device because a count query timed out.
 */
const hasSyncRoom = async (
  supabase: ReturnType<typeof createClient>,
  profileId: string,
  source: MeditationSource,
  metadata: SavedMeditation["metadata"] | undefined,
): Promise<boolean> => {
  // A length of something already in the library is not a second meditation. The Library groups
  // variants under one card, and the allowance counts cards — otherwise the default quick-adjust
  // presets would spend four slots on one meditation and the limit would hit at a number nobody
  // could see on screen.
  if (parentIdOf(metadata) !== null) return true

  const isRecordingSave = source === "recording"
  try {
    const [{ data: entitlementRow }, { count }] = await Promise.all([
      supabase.from("account_entitlements").select(ENTITLEMENT_COLUMNS).eq("profile_id", profileId).maybeSingle(),
      (isRecordingSave
        ? supabase.from("meditations").select("id", { count: "exact", head: true }).eq("source", "recording")
        : supabase.from("meditations").select("id", { count: "exact", head: true }).neq("source", "recording")
      )
        .eq("profile_id", profileId)
        .not("audio_key", "is", null)
        .is("metadata->>linkedParentId", null),
    ])

    const entitlements = entitlementsFromRow(entitlementRow)
    const synced = count ?? 0
    return isRecordingSave
      ? canSaveAnotherRecording(entitlements, synced)
      : canSyncAnotherMeditation(entitlements, synced)
  } catch (error) {
    log.warn("[library] Could not check the sync allowance; attempting the upload:", error)
    return true
  }
}

const normalizeSupabaseMeditation = (
  row: any,
  processedAudioUrl: string,
  sourceAudioUrl?: string,
  recordings?: Record<string, Blob>,
  hasLocalAudio = false,
): SavedMeditation => ({
  id: row.id,
  audioAvailability: row.audio_key ? "synced" : hasLocalAudio ? "local" : "elsewhere",
  audioDeviceLabel: row.audio_key ? null : (row.audio_device_label ?? null),
  title: row.title,
  originalFileName: row.original_filename || row.description || "Unknown",
  processedAudioUrl,
  sourceAudioUrl,
  duration: row.duration || 0,
  createdAt: new Date(row.created_at),
  // 'encoder' is the pre-rename value, still written as a fallback when the DB's
  // source check constraint predates migration 012.
  source: (row.source === "encoder" ? "creator" : row.source) as MeditationSource,
  metadata: mapTimelineWithRecordings(row.metadata || {}, recordings) || {},
})

/**
 * Adds one profile-scoped table to the backup as JSON.
 *
 * Never throws: an export that fails wholesale because one table was unreadable is worse than an
 * export missing one file, and the missing file is visible in the archive.
 */
async function addTableToZip(
  zip: JSZip,
  supabase: ReturnType<typeof createClient>,
  table: string,
  filename: string,
  profileId: string,
): Promise<void> {
  try {
    const { data, error } = await supabase.from(table).select("*").eq("profile_id", profileId)
    if (error) {
      log.warn(`[backup] Skipping ${table} in export:`, error)
      return
    }
    zip.file(filename, JSON.stringify(data ?? [], null, 2))
  } catch (error) {
    log.warn(`[backup] Skipping ${table} in export:`, error)
  }
}

/**
 * Adds each note's markdown body under `notes/<slug>.md`.
 *
 * The layout matches the R2 vault exactly, so an unzipped backup is already the thing the
 * storage design has been aiming at — a folder of readable markdown files that need no import
 * step to be useful.
 */
async function addNoteBodiesToZip(zip: JSZip): Promise<void> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.from("journal_entries").select("id, slug, content_md, note_key")
    if (error || !Array.isArray(data)) {
      log.warn("[backup] Skipping note bodies in export:", error)
      return
    }

    const folder = zip.folder("notes")
    if (!folder) return

    for (const row of data as Array<{ id: string; slug: string | null; content_md: string | null; note_key: string | null }>) {
      const name = `${row.slug || row.id}.md`

      // A note with no note_key never moved to storage, so its body is still in the row.
      if (!row.note_key) {
        folder.file(name, row.content_md ?? "")
        continue
      }

      try {
        const response = await fetch(`/api/journal/note?id=${encodeURIComponent(row.id)}`)
        if (!response.ok) {
          folder.file(name, row.content_md ?? "")
          continue
        }
        const { body } = (await response.json()) as { body?: string }
        folder.file(name, body ?? row.content_md ?? "")
      } catch (error) {
        log.warn("[backup] Falling back to the indexed copy of a note body:", error)
        folder.file(name, row.content_md ?? "")
      }
    }
  } catch (error) {
    log.warn("[backup] Skipping note bodies in export:", error)
  }
}

/**
 * Restores one profile-scoped table from the backup.
 *
 * profile_id is rewritten to the importing account rather than trusted from the file, so a
 * backup can be restored into a different account — which is the case that matters, since
 * restoring into the account that still has the data is the case that never happens.
 *
 * Best-effort per table, for the same reason the export is: a backup that restores most of your
 * practice beats one that refuses to restore any of it.
 */
async function restoreTableFromZip(
  zip: JSZip,
  supabase: ReturnType<typeof createClient>,
  filename: string,
  table: string,
  profileId: string,
): Promise<void> {
  const entry = zip.file(filename)
  if (!entry) return

  try {
    const rows = JSON.parse(await entry.async("text"))
    if (!Array.isArray(rows) || rows.length === 0) return

    const scoped = rows.map((row: Record<string, unknown>) => ({ ...row, profile_id: profileId }))
    const { error } = await supabase.from(table).upsert(scoped, { onConflict: "id" })
    if (error) log.warn(`[backup] Could not restore ${table}:`, error)
  } catch (error) {
    log.warn(`[backup] Could not restore ${table}:`, error)
  }
}

/**
 * Restores note rows and pushes their bodies back into storage.
 *
 * The row carries the index; the body is a file. Writing the row alone would restore a journal
 * whose notes all open empty, so each body goes back through the same route the editor writes
 * through, which is what mints the note_key.
 */
async function restoreNotesFromZip(
  zip: JSZip,
  supabase: ReturnType<typeof createClient>,
  profileId: string,
): Promise<void> {
  const entry = zip.file("notes.json")
  if (!entry) return

  try {
    const rows = JSON.parse(await entry.async("text")) as Array<Record<string, unknown>>
    if (!Array.isArray(rows) || rows.length === 0) return

    // note_key points at the exporting account's storage prefix, so it is dropped and re-minted
    // by the write below. Keeping it would leave notes pointing into somebody else's vault.
    const scoped: Array<Record<string, unknown>> = rows.map((row) => ({
      ...row,
      profile_id: profileId,
      note_key: null,
    }))
    const { error } = await supabase.from("journal_entries").upsert(scoped, { onConflict: "id" })
    if (error) {
      log.warn("[backup] Could not restore notes:", error)
      return
    }

    const bodies = zip.folder("notes")
    if (!bodies) return

    for (const row of scoped) {
      const id = typeof row.id === "string" ? row.id : null
      if (!id) continue
      const slug = typeof row.slug === "string" && row.slug.length > 0 ? row.slug : id
      const fallback = typeof row.content_md === "string" ? row.content_md : ""

      const file = zip.file(`notes/${slug}.md`)
      const body = file ? await file.async("text") : fallback
      if (!body) continue

      try {
        await fetch("/api/journal/note", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, body }),
        })
      } catch (error) {
        log.warn("[backup] Could not restore a note body:", error)
      }
    }
  } catch (error) {
    log.warn("[backup] Could not restore notes:", error)
  }
}

export class MeditationLibrary {
  static async saveMeditation(meditation: SaveMeditationInput): Promise<SavedMeditation> {
    const auth = getAuthState()
    log.debug("saveMeditation - Auth state:", { status: auth.status, userId: auth.userId })
    
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
            log.warn("Unable to store timeline recording", error)
          }
        }
      }
    }

    if (auth.status !== "authenticated" || !auth.userId) {
      throw new AccountRequiredError("save a meditation")
    }

    log.debug("Saving to Supabase + R2 + IndexedDB (authenticated)")
    const supabase = createClient()

    const metadataToPersist = sanitizeMetadataForStorage({ ...meditation.metadata }, timelineRecordings, "pending")
    const durationInSeconds = Math.round(meditation.duration)

    // A full library is said out loud, not worked around. Keeping the audio only in this browser
    // would trade a limit someone can act on for an eviction they cannot predict, and the moment
    // to tell them is now — while the audio is still in front of them and can be downloaded.
    if (!(await hasSyncRoom(supabase, auth.userId!, meditation.source, meditation.metadata))) {
      throw new LibraryFullError(meditation.source === "recording" ? "recording" : "meditation")
    }

    const audioKey = await uploadAudioToR2(
      processedBlob,
      resolveAudioExtension(meditation.metadata, processedBlob),
    )

    const insertMeditationRow = (source: string, key: string | null) =>
      supabase
        .from("meditations")
        .insert({
          title: meditation.title,
          description: `${meditation.source} meditation`,
          duration: durationInSeconds,
          source,
          metadata: metadataToPersist,
          original_filename: meditation.originalFileName,
          profile_id: auth.userId!,
          audio_key: key,
          // Only meaningful while the audio is local: once it is in R2 it is not on any one
          // device, and a stale label would send someone to the wrong phone.
          audio_device_label: key ? null : currentDeviceLabel(),
        })
        .select()
        .single()

    let { data, error } = await insertMeditationRow(meditation.source, audioKey)

    // The database is the one that decides, and it can disagree with the check above — two saves
    // racing for the last slot, or an allowance lowered between them. The uploaded object is
    // orphaned by that refusal, so it goes now rather than counting against a quota for a
    // meditation that was never saved.
    if (error && audioKey && isEntitlementLimitError(error)) {
      void deleteAudioObjectFromR2(audioKey)
      throw new LibraryFullError(meditation.source === "recording" ? "recording" : "meditation")
    }

    // Databases that haven't run scripts/012_rename_encoder_source_to_creator.sql still
    // enforce the pre-rename constraint, which allows 'encoder' but not 'creator'. Fall back
    // to the legacy value so saves keep working; reads normalize 'encoder' back to 'creator'.
    if (error && meditation.source === "creator" && error.message?.includes("meditations_source_check")) {
      log.warn("DB rejected source='creator' (migration 012 not applied) - retrying with legacy 'encoder'")
      ;({ data, error } = await insertMeditationRow("encoder", audioKey))
    }

    if (error) {
      log.error("Database insert error:", error)
      throw new Error(`Database save failed: ${error.message}`)
    }

    const meditationId = data.id as string
    log.debug("Saved to Supabase with ID:", meditationId)
    
    const finalizedMetadata = sanitizeMetadataForStorage({ ...meditation.metadata }, timelineRecordings, meditationId)

    await supabase.from("meditations").update({ metadata: finalizedMetadata }).eq("id", meditationId)

    // Asked here rather than at startup because this is the moment there is something to lose,
    // and because browsers weigh the request on engagement — someone who has just saved a
    // meditation is exactly who should be granted it. Best effort: the answer only changes how
    // soon a backup is suggested, never whether the save works.
    void requestPersistentStorage()

    log.debug("Saving audio to IndexedDB...")
    try {
      await saveAudioRecord({
        id: meditationId,
        processedAudio: processedBlob,
        sourceAudio: providedSourceBlob,
        timelineRecordings,
      })
      log.debug("Audio saved to IndexedDB successfully")
    } catch (error) {
      log.error("Failed to save audio to IndexedDB:", error)
      throw error
    }

    // The audio is in this browser either way — it was just written to IndexedDB — so a save that
    // could not sync comes back as "local", never as "elsewhere". Elsewhere is what another
    // device sees, not what the device that made it does.
    return normalizeSupabaseMeditation(
      { ...data, audio_key: audioKey, metadata: finalizedMetadata },
      buildObjectUrl(processedBlob),
      buildObjectUrl(providedSourceBlob),
      timelineRecordings,
      true,
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
      throw new AccountRequiredError("replace a meditation's audio")
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

    // If this row's audio previously lived in R2, the replacement must too — otherwise
    // audio_key would keep pointing at the now-stale pre-replacement audio.
    const { data: existingRow } = await supabase.from("meditations").select("audio_key").eq("id", id).single()
    const previousAudioKey = existingRow?.audio_key ?? null
    const audioKey = previousAudioKey
      ? await uploadAudioToR2(updates.audioData, extensionForContainer(updates.audioFormat.container))
      : null

    const { error } = await supabase
      .from("meditations")
      .update({ duration: durationInSeconds, metadata: updatedMetadata, audio_key: audioKey })
      .eq("id", id)

    if (error) {
      log.error("Error updating meditation audio:", error)
      throw new Error(`Database update failed: ${error.message}`)
    }

    // Now that the row points at the new object, the old one is no longer reachable through
    // any DB row and would otherwise sit in R2 forever with nothing to clean it up — delete it
    // after the swap succeeds, so a failed upload/update never leaves the row referencing
    // nothing (best-effort: a failure here just leaves harmless orphaned storage, same as
    // before, rather than breaking the replace itself).
    if (previousAudioKey && previousAudioKey !== audioKey) {
      void deleteAudioObjectFromR2(previousAudioKey)
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

  /**
   * Every meditation. Reusable voice recordings share this table but are not meditations, so
   * they are excluded here and fetched by getRecordings instead.
   */
  static async getAllMeditations(): Promise<SavedMeditation[]> {
    return MeditationLibrary.listBySource(MEDITATION_SOURCES)
  }

  /** The reusable voice clips, newest first. */
  static async getRecordings(): Promise<SavedMeditation[]> {
    return MeditationLibrary.listBySource(["recording"])
  }

  private static async listBySource(sources: MeditationSource[]): Promise<SavedMeditation[]> {
    const auth = getAuthState()
    log.debug("listBySource - Auth state:", { status: auth.status, userId: auth.userId })

    if (auth.status !== "authenticated" || !auth.userId) {
      return []
    }

    log.debug("Loading from Supabase...")
    const supabase = createClient()
    // 'encoder' is the pre-rename value for 'creator'; rows saved before migration 012 still
    // carry it, so asking for creator has to ask for both.
    const wanted = sources.includes("creator") ? [...sources, "encoder"] : sources
    const { data, error } = await supabase
      .from("meditations")
      .select("*")
      .in("source", wanted)
      .order("created_at", { ascending: false })

    if (error) {
      log.error("Supabase select error:", error)
      return []
    }

    if (!data || data.length === 0) {
      log.debug("No meditations found in Supabase")
      return []
    }

    log.debug("Found", data.length, "meditations in Supabase, resolving audio...")
    // Rows saved since R2 storage was added carry an audio_key and play back from R2 (works
    // from any device); older rows have no audio_key and keep loading from this browser's
    // IndexedDB cache, exactly as before.
    const r2Ids = data.filter((row: any) => row.audio_key).map((row: any) => row.id as string)
    const r2Urls = await fetchR2DownloadUrls(r2Ids)

    const meditations: SavedMeditation[] = []
    for (const row of data) {
      try {
        const audio = await getAudioRecord(row.id)

        let processedUrl: string
        if (row.audio_key) {
          processedUrl = r2Urls[row.id] ?? ""
          if (!processedUrl) log.warn("Missing R2 download URL for meditation:", row.id)
        } else {
          if (!audio) {
            log.warn("MISSING AUDIO: No audio record found in IndexedDB for meditation:", row.id)
          }
          processedUrl = buildObjectUrl(audio?.processedAudio)
        }

        const sourceUrl = buildObjectUrl(audio?.sourceAudio ?? null)
        meditations.push(
          normalizeSupabaseMeditation(
            row,
            processedUrl,
            sourceUrl,
            audio?.timelineRecordings,
            Boolean(audio?.processedAudio),
          ),
        )
      } catch (error) {
        log.warn("Unable to resolve audio for meditation", row.id, error)
        meditations.push(normalizeSupabaseMeditation(row, ""))
      }
    }

    log.debug("Loaded", meditations.length, "complete meditations")
    return meditations
  }

  static async getMeditation(id: string): Promise<SavedMeditation | null> {
    const auth = getAuthState()
    if (auth.status !== "authenticated" || !auth.userId) {
      return null
    }

    const supabase = createClient()

    const { data, error } = await supabase.from("meditations").select("*").eq("id", id).single()

    if (error || !data) {
      return null
    }

    try {
      const audio = await getAudioRecord(id)

      let processedUrl: string
      if (data.audio_key) {
        const r2Urls = await fetchR2DownloadUrls([id])
        processedUrl = r2Urls[id] ?? ""
      } else {
        processedUrl = buildObjectUrl(audio?.processedAudio)
      }

      return normalizeSupabaseMeditation(data, processedUrl, buildObjectUrl(audio?.sourceAudio ?? null), audio?.timelineRecordings)
    } catch (err) {
      log.warn("Unable to fetch audio for meditation", id, err)
      return normalizeSupabaseMeditation(data, "")
    }
  }

  static async deleteMeditation(id: string): Promise<void> {
    const auth = getAuthState()
    if (auth.status !== "authenticated" || !auth.userId) {
      throw new AccountRequiredError("delete a meditation")
    }

    // Deletes the R2 object (if any) and the database row together, server-side — the R2
    // delete credentials never reach the client, so this can't be done with a plain
    // supabase.from("meditations").delete() call like before.
    const response = await fetch("/api/storage/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meditationId: id }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}) as { error?: string })
      const message = body.error || `Delete failed with status ${response.status}`
      log.error("Error deleting meditation:", message)
      throw new Error(message)
    }

    await deleteAudioRecord(id)
  }

  static async getAllPlaylists(): Promise<Playlist[]> {
    const auth = getAuthState()
    if (auth.status !== "authenticated" || !auth.userId) {
      return []
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
        log.error("Error fetching playlists:", error)
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
      log.error("Error in getAllPlaylists:", error)
      return []
    }
  }

  static async getPlaylist(id: string): Promise<Playlist | null> {
    const auth = getAuthState()
    if (auth.status !== "authenticated" || !auth.userId) {
      return null
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
      log.error("Error in getPlaylist:", error)
      return null
    }
  }

  static async createPlaylist(name: string, description: string): Promise<Playlist> {
    const auth = getAuthState()
    if (auth.status !== "authenticated" || !auth.userId) {
      throw new AccountRequiredError("create a playlist")
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
      log.error("Error creating playlist:", error)
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
      throw new AccountRequiredError("update a playlist")
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
        log.error("Error updating playlist:", error)
        throw error
      }
    } catch (error) {
      log.error("Error in updatePlaylist:", error)
      throw error
    }
  }

  static async deletePlaylist(id: string): Promise<void> {
    const auth = getAuthState()
    if (auth.status !== "authenticated" || !auth.userId) {
      throw new AccountRequiredError("delete a playlist")
    }

    try {
      const supabase = createClient()

      const { error } = await supabase.from("playlists").delete().eq("id", id)

      if (error) {
        log.error("Error deleting playlist:", error)
        throw error
      }
    } catch (error) {
      log.error("Error in deletePlaylist:", error)
      throw error
    }
  }

  static async addToPlaylist(playlistId: string, meditationId: string): Promise<void> {
    const auth = getAuthState()
    if (auth.status !== "authenticated" || !auth.userId) {
      throw new AccountRequiredError("add to a playlist")
    }

    try {
      const supabase = createClient()

      const { error } = await supabase.from("playlist_meditations").insert({
        playlist_id: playlistId,
        meditation_id: meditationId,
      })

      if (error) {
        if (error.code !== "23505") {
          log.error("Error adding to playlist:", error)
          throw error
        }
      }

      await supabase.from("playlists").update({ updated_at: new Date().toISOString() }).eq("id", playlistId)
    } catch (error) {
      log.error("Error in addToPlaylist:", error)
      throw error
    }
  }

  static async removeFromPlaylist(playlistId: string, meditationId: string): Promise<void> {
    const auth = getAuthState()
    if (auth.status !== "authenticated" || !auth.userId) {
      throw new AccountRequiredError("remove from a playlist")
    }

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("playlist_meditations")
        .delete()
        .eq("playlist_id", playlistId)
        .eq("meditation_id", meditationId)

      if (error) {
        log.error("Error removing from playlist:", error)
        throw error
      }

      await supabase.from("playlists").update({ updated_at: new Date().toISOString() }).eq("id", playlistId)
    } catch (error) {
      log.error("Error in removeFromPlaylist:", error)
      throw error
    }
  }

  static async getPlaylistMeditations(playlistId: string): Promise<SavedMeditation[]> {
    const auth = getAuthState()
    if (auth.status !== "authenticated" || !auth.userId) {
      return []
    }

    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("playlist_meditations")
        .select("meditation_id")
        .eq("playlist_id", playlistId)
        .order("added_at", { ascending: true })

      if (error) {
        log.error("Error fetching playlist meditations:", error)
        return []
      }

      const meditationIds: string[] = (data ?? []).map((item: { meditation_id: string }) => item.meditation_id)
      const meditations = await Promise.all(meditationIds.map((id) => this.getMeditation(id)))
      return meditations.filter((meditation): meditation is SavedMeditation => Boolean(meditation))
    } catch (error) {
      log.error("Error in getPlaylistMeditations:", error)
      return []
    }
  }

  /**
   * Zip the whole account: audio, metadata, notes, sessions, playlists and settings.
   *
   * Audio is taken from the local cache where it is there and pulled back from R2 where it is
   * not. Reading only the cache is what made this quietly unsafe — on a device that never held
   * the blobs, or after Safari cleared site data, the export still succeeded and still contained
   * every row, every note and no audio whatsoever.
   *
   * What R2 cannot supply, the report says plainly. Source audio and a Creator timeline's voice
   * clips were never uploaded, so an empty cache is the end of the line for them; the zip carries
   * an `export-report.json` saying exactly what is in it, and the caller gets the same summary to
   * put in front of the person who asked for the backup.
   */
  static async exportBackup(
    onProgress?: (progress: number, message: string) => void,
  ): Promise<{ blob: Blob; report: BackupReport }> {
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

    const audioRecords = await getAllAudioRecords()
    const audioMap = new Map(audioRecords.map((record) => [record.id, record]))

    const plan = planBackupAudio(
      (data as Array<{ id: string; audio_key?: string | null; metadata?: unknown }>).map((row) => {
        const audioRecord = audioMap.get(row.id)
        const rowMetadata = (row.metadata || {}) as SavedMeditation["metadata"]
        return {
          id: row.id,
          hasLocalProcessed: Boolean(audioRecord?.processedAudio),
          processedKey: row.audio_key || null,
          recordingKeys: timelineRecordingKeys(rowMetadata),
          availableRecordingKeys: Object.keys(audioRecord?.timelineRecordings ?? {}),
        }
      }),
    )

    const recovered = await recoverProcessedAudioFromR2(plan.fetchFromR2, onProgress)
    // Merged in so that everything downstream — the extension recorded in meditations.json as
    // much as the zipped bytes — sees one set of blobs and cannot disagree with itself about
    // which of them exist.
    for (const [id, blob] of recovered) {
      const existing = audioMap.get(id)
      audioMap.set(id, existing ? { ...existing, processedAudio: blob } : { id, processedAudio: blob })
    }

    onProgress?.(100, "Packaging backup...")

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
        source: row.source as MeditationSource,
        metadata: rowMetadata,
        audioExt: resolveAudioExtension(rowMetadata, audioRecord?.processedAudio),
        sourceExt: resolveAudioExtension(rowMetadata, audioRecord?.sourceAudio),
      }
    })

    zip.file("meditations.json", JSON.stringify(metadata, null, 2))

    const report = buildBackupReport(plan, recovered.keys(), data.length, new Date().toISOString())
    // Written into the zip as well as returned, because the toast is gone in a few seconds and
    // the file is what someone still has a year from now.
    zip.file("export-report.json", JSON.stringify(report, null, 2))

    // Everything else the account is made of. A backup that restores your audio but loses what
    // you wrote and how long you have been sitting is not a backup of your practice.
    //
    // Each of these is best-effort: a failure to read one table should not cost you the export
    // of the others, so it is logged and the file is written without it rather than throwing.
    await Promise.all([
      addTableToZip(zip, supabase, "sessions", "sessions.json", auth.userId!),
      addTableToZip(zip, supabase, "journal_entries", "notes.json", auth.userId!),
      addTableToZip(zip, supabase, "journal_folders", "folders.json", auth.userId!),
      addTableToZip(zip, supabase, "playlists", "playlists.json", auth.userId!),
      addTableToZip(zip, supabase, "user_settings", "settings.json", auth.userId!),
    ])

    // Note bodies live in R2 as markdown files, not in the row, so the index alone would export
    // a journal with no writing in it. They are fetched through the same route the editor uses.
    await addNoteBodiesToZip(zip)

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

    return { blob: await zip.generateAsync({ type: "blob" }), report }
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
      source: MeditationSource
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

    onProgress?.(92, "Restoring your journal and practice log...")

    // Restore everything that is not audio. Order matters: folders and sessions are referenced
    // by notes, so they have to exist first or those references land as null.
    await restoreTableFromZip(zip, supabase, "folders.json", "journal_folders", auth.userId!)
    await restoreTableFromZip(zip, supabase, "sessions.json", "sessions", auth.userId!)
    await restoreTableFromZip(zip, supabase, "playlists.json", "playlists", auth.userId!)
    await restoreTableFromZip(zip, supabase, "settings.json", "user_settings", auth.userId!)
    await restoreNotesFromZip(zip, supabase, auth.userId!)

    onProgress?.(100, "Backup restored successfully!")
  }

  static async getStorageUsage(): Promise<{ usedBytes: number; quotaBytes?: number }> {
    const auth = getAuthState()
    if (auth.status !== "authenticated" || !auth.userId) {
      return { usedBytes: 0 }
    }

    // Authenticated users' audio now lives in R2, not IndexedDB — report usage against that,
    // since that's what actually counts toward their storage.
    try {
      const authHeader = await getAuthHeader()
      const response = await fetch("/api/storage/usage", {
        headers: { ...authHeader },
      })
      if (!response.ok) throw new Error(`Usage request failed with status ${response.status}`)
      const { usedBytes, quotaBytes } = (await response.json()) as {
        usedBytes: number
        quotaBytes?: number
      }
      return { usedBytes, quotaBytes: quotaBytes ?? FALLBACK_QUOTA_BYTES }
    } catch (error) {
      log.warn("Unable to fetch R2 storage usage:", error)
      return { usedBytes: 0, quotaBytes: FALLBACK_QUOTA_BYTES }
    }
  }
}
