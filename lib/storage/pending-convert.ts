import type { AudioFormatMetadata } from "@/lib/audio-utils"
import { saveAudioRecord, getAudioRecord, deleteAudioRecord } from "./indexed-db"

const PENDING_CONVERT_ID = "__pending_convert_copy__"
const META_KEY = "abhi_pending_convert_copy_meta"

export type PendingConvertMeta = {
  title: string
  originalFileName: string
  duration: number
  source: "adjuster" | "creator"
  audioFormat: AudioFormatMetadata
}

export async function savePendingConvertCopy(meta: PendingConvertMeta, audio: Blob): Promise<void> {
  await saveAudioRecord({ id: PENDING_CONVERT_ID, processedAudio: audio })
  window.localStorage.setItem(META_KEY, JSON.stringify(meta))
}

export async function getPendingConvertCopy(): Promise<{ meta: PendingConvertMeta; audio: Blob } | null> {
  const rawMeta = window.localStorage.getItem(META_KEY)
  if (!rawMeta) return null

  try {
    const meta = JSON.parse(rawMeta) as PendingConvertMeta
    const record = await getAudioRecord(PENDING_CONVERT_ID)
    if (!record?.processedAudio) return null
    return { meta, audio: record.processedAudio }
  } catch (error) {
    console.warn("[v0] Unable to read pending convert copy:", error)
    return null
  }
}

export async function clearPendingConvertCopy(): Promise<void> {
  window.localStorage.removeItem(META_KEY)
  await deleteAudioRecord(PENDING_CONVERT_ID).catch(() => {})
}
