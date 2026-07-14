import type { AudioExportFormat } from "@/lib/audio-utils"
import type { TimelineEvent } from "@/lib/types"
import { saveAudioRecord, getAudioRecord, deleteAudioRecord } from "./indexed-db"

// Preserves the *input-side* configuration of the Adjuster/Creator tools (as opposed to
// tool-session.ts, which preserves the processed/generated output) across a full page
// reload — most importantly the redirect round-trip through login/sign-up.

const ADJUSTER_DRAFT_META_KEY = "abhi_tool_draft:adjuster"
const CREATOR_DRAFT_META_KEY = "abhi_tool_draft:creator"
const ADJUSTER_FILE_RECORD_ID = "__draft_adjuster_file__"
const creatorRecordingRecordId = (eventId: string) => `__draft_creator_recording__${eventId}`

export type AdjusterDraft = {
  displayedFileName: string
  fileType: string
  targetDuration: number
  silenceThreshold: number
  minSilenceDuration: number
  maxSilenceDuration: number
  contentSpeedMultiplier: number
  exportFormat: AudioExportFormat
  loadedLibraryContext: { id: string; title: string; duration: number } | null
}

export async function saveAdjusterDraft(meta: AdjusterDraft, file: File): Promise<void> {
  await saveAudioRecord({ id: ADJUSTER_FILE_RECORD_ID, processedAudio: file })
  window.localStorage.setItem(ADJUSTER_DRAFT_META_KEY, JSON.stringify(meta))
}

export async function getAdjusterDraft(): Promise<{ meta: AdjusterDraft; file: File } | null> {
  const rawMeta = window.localStorage.getItem(ADJUSTER_DRAFT_META_KEY)
  if (!rawMeta) return null

  try {
    const meta = JSON.parse(rawMeta) as AdjusterDraft
    const record = await getAudioRecord(ADJUSTER_FILE_RECORD_ID)
    if (!record?.processedAudio) return null
    const file = new File([record.processedAudio], meta.displayedFileName, { type: meta.fileType })
    return { meta, file }
  } catch (error) {
    console.warn("[v0] Unable to read adjuster draft:", error)
    return null
  }
}

export async function clearAdjusterDraft(): Promise<void> {
  window.localStorage.removeItem(ADJUSTER_DRAFT_META_KEY)
  await deleteAudioRecord(ADJUSTER_FILE_RECORD_ID).catch(() => {})
}

export type CreatorDraft = {
  meditationTitle: string
  creatorTotalDuration: number
  creatorDurationDraft: number
  exportFormat: AudioExportFormat
  timelineEvents: TimelineEvent[]
}

export async function saveCreatorDraft(meta: CreatorDraft): Promise<void> {
  // Recording audio lives in blob: URLs that die across a reload — persist each recorded
  // event's audio by id so it can be re-blessed with a fresh object URL on restore.
  const recordingIds = meta.timelineEvents
    .filter((event) => event.type === "recorded_voice" && event.recordedAudioUrl?.startsWith("blob:"))
    .map((event) => event.id)

  for (const eventId of recordingIds) {
    const event = meta.timelineEvents.find((item) => item.id === eventId)
    if (!event?.recordedAudioUrl) continue
    try {
      const blob = await (await fetch(event.recordedAudioUrl)).blob()
      await saveAudioRecord({ id: creatorRecordingRecordId(eventId), processedAudio: blob })
    } catch (error) {
      console.warn(`[v0] Unable to persist recording for timeline event ${eventId}:`, error)
    }
  }

  window.localStorage.setItem(CREATOR_DRAFT_META_KEY, JSON.stringify(meta))
}

export async function getCreatorDraft(): Promise<CreatorDraft | null> {
  const rawMeta = window.localStorage.getItem(CREATOR_DRAFT_META_KEY)
  if (!rawMeta) return null

  try {
    const meta = JSON.parse(rawMeta) as CreatorDraft
    const timelineEvents = await Promise.all(
      meta.timelineEvents.map(async (event) => {
        if (event.type !== "recorded_voice" || !event.recordedAudioUrl?.startsWith("blob:")) return event
        const record = await getAudioRecord(creatorRecordingRecordId(event.id))
        if (!record?.processedAudio) return event
        return { ...event, recordedAudioUrl: URL.createObjectURL(record.processedAudio) }
      }),
    )
    return { ...meta, timelineEvents }
  } catch (error) {
    console.warn("[v0] Unable to read creator draft:", error)
    return null
  }
}

export async function clearCreatorDraft(): Promise<void> {
  const rawMeta = window.localStorage.getItem(CREATOR_DRAFT_META_KEY)
  window.localStorage.removeItem(CREATOR_DRAFT_META_KEY)

  if (!rawMeta) return
  try {
    const meta = JSON.parse(rawMeta) as CreatorDraft
    await Promise.all(
      meta.timelineEvents
        .filter((event) => event.type === "recorded_voice")
        .map((event) => deleteAudioRecord(creatorRecordingRecordId(event.id)).catch(() => {})),
    )
  } catch {
    // best effort
  }
}
