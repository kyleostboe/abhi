import type { AudioFormatMetadata } from "@/lib/audio-utils"
import { saveAudioRecord, getAudioRecord, deleteAudioRecord } from "./indexed-db"

// Persists the Adjuster's processed / Creator's generated output so it survives
// full page reloads — most importantly the redirect round-trip through
// login/sign-up when a guest saves to the library or converts with "keep both".

export type ToolSessionKind = "adjuster" | "creator"

export type ToolSessionMeta = {
  fileName: string
  duration: number
  pausesAdjusted: number
  audioFormat: AudioFormatMetadata | null
  savedAt: number
}

const RECORD_ID: Record<ToolSessionKind, string> = {
  adjuster: "__tool_session_adjuster__",
  creator: "__tool_session_creator__",
}

const metaKey = (kind: ToolSessionKind) => `abhi_tool_session:${kind}`

export async function saveToolSession(
  kind: ToolSessionKind,
  meta: Omit<ToolSessionMeta, "savedAt">,
  audio: Blob,
): Promise<void> {
  await saveAudioRecord({ id: RECORD_ID[kind], processedAudio: audio })
  window.localStorage.setItem(metaKey(kind), JSON.stringify({ ...meta, savedAt: Date.now() }))
}

export async function getToolSession(
  kind: ToolSessionKind,
): Promise<{ meta: ToolSessionMeta; audio: Blob } | null> {
  const rawMeta = window.localStorage.getItem(metaKey(kind))
  if (!rawMeta) return null

  try {
    const meta = JSON.parse(rawMeta) as ToolSessionMeta
    const record = await getAudioRecord(RECORD_ID[kind])
    if (!record?.processedAudio) return null
    return { meta, audio: record.processedAudio }
  } catch (error) {
    console.warn(`[v0] Unable to read ${kind} tool session:`, error)
    return null
  }
}

export async function clearToolSession(kind: ToolSessionKind): Promise<void> {
  window.localStorage.removeItem(metaKey(kind))
  await deleteAudioRecord(RECORD_ID[kind]).catch(() => {})
}
