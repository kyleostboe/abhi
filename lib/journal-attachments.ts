"use client"

/**
 * Client-side attachment pipeline for journal notes.
 *
 * Files go straight from the browser to R2 through a presigned URL (the same scheme meditation
 * audio uses — bytes never pass through the app server), and only metadata is written to
 * Supabase. The note's markdown references an attachment by filename, so the body stays valid
 * on its own and no bytes are ever inlined into note content.
 */

import { createClient } from "@/lib/supabase/client"
import { encodeDistributionAudio, extensionForContainer } from "@/lib/audio-utils"
import { sanitizeFilename, slugify } from "@/lib/journal-markdown"

export type AttachmentKind = "image" | "audio"

export type JournalAttachment = {
  id: string
  entryId: string | null
  kind: AttachmentKind
  storageKey: string
  filename: string
  mime: string | null
  sizeBytes: number | null
  durationMs: number | null
  width: number | null
  height: number | null
}

const MAX_IMAGE_DIMENSION = 1600
const IMAGE_QUALITY = 0.82

/**
 * Phone photos are routinely 3–5MB, which would dwarf everything else a journal stores, so
 * images are downscaled and re-encoded before upload rather than shipped at capture size.
 */
export const compressImage = async (
  file: File,
): Promise<{ blob: Blob; width: number; height: number; mime: string }> => {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d")
  if (!context) {
    bitmap.close()
    return { blob: file, width: bitmap.width, height: bitmap.height, mime: file.type || "image/jpeg" }
  }
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const mime = file.type === "image/png" ? "image/png" : "image/jpeg"
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, IMAGE_QUALITY))
  return { blob: blob ?? file, width, height, mime }
}

/**
 * Encodes a recorded voice note through the app's existing Opus pipeline. Speech at Opus
 * bitrates is a fraction of the size of the raw recording, which matters a lot when every
 * journal entry might carry one.
 */
export const encodeVoiceNote = async (
  recorded: Blob,
): Promise<{ blob: Blob; ext: string; mime: string; durationMs: number }> => {
  const audioContext = new AudioContext()
  try {
    const arrayBuffer = await recorded.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    const durationMs = Math.round(audioBuffer.duration * 1000)

    try {
      const { blob, format } = await encodeDistributionAudio(audioBuffer, { format: "opus", bitrate: 48000 })
      return { blob, ext: extensionForContainer(format?.container), mime: blob.type || "audio/ogg", durationMs }
    } catch (error) {
      // Opus needs WebCodecs; on a browser without it keep the original recording rather than
      // losing the note entirely.
      console.warn("[journal] Opus encode unavailable, storing original recording:", error)
      const ext = recorded.type.includes("mp4") ? "m4a" : recorded.type.includes("ogg") ? "ogg" : "webm"
      return { blob: recorded, ext, mime: recorded.type || "audio/webm", durationMs }
    }
  } finally {
    void audioContext.close()
  }
}

/** Requests a presigned URL and PUTs the blob directly to storage. Returns the object key. */
const uploadToStorage = async (blob: Blob, ext: string, contentType: string): Promise<string> => {
  const response = await fetch("/api/storage/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ext, contentType }),
  })
  if (!response.ok) {
    throw new Error("Could not prepare the upload.")
  }
  const { uploadUrl, key } = (await response.json()) as { uploadUrl: string; key: string }

  const put = await fetch(uploadUrl, { method: "PUT", body: blob, headers: { "Content-Type": contentType } })
  if (!put.ok) {
    throw new Error("Upload failed.")
  }
  return key
}

/**
 * Uploads a blob and records its metadata. `filename` is what the note's markdown will point
 * at, so it is unique per user and safe to place inside a `![[...]]` link.
 */
export const saveAttachment = async (params: {
  blob: Blob
  kind: AttachmentKind
  ext: string
  mime: string
  displayName: string
  entryId: string | null
  profileId: string
  durationMs?: number
  width?: number
  height?: number
}): Promise<JournalAttachment> => {
  const { blob, kind, ext, mime, displayName, entryId, profileId } = params

  const storageKey = await uploadToStorage(blob, ext, mime)
  const unique = storageKey.split("/").pop()?.split(".")[0]?.slice(0, 8) ?? `${Date.now()}`
  const filename = sanitizeFilename(`${slugify(displayName.replace(/\.[^.]+$/, ""))}-${unique}.${ext}`)

  const supabase = createClient()
  const { data, error } = await supabase
    .from("journal_attachments")
    .insert({
      profile_id: profileId,
      entry_id: entryId,
      kind,
      storage_key: storageKey,
      filename,
      mime,
      size_bytes: blob.size,
      duration_ms: params.durationMs ?? null,
      width: params.width ?? null,
      height: params.height ?? null,
    })
    .select("id, entry_id, kind, storage_key, filename, mime, size_bytes, duration_ms, width, height")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Could not save the attachment.")
  }

  return {
    id: data.id,
    entryId: data.entry_id,
    kind: data.kind,
    storageKey: data.storage_key,
    filename: data.filename,
    mime: data.mime,
    sizeBytes: data.size_bytes,
    durationMs: data.duration_ms,
    width: data.width,
    height: data.height,
  }
}

/** Resolves attachment filenames to short-lived signed URLs for rendering. */
export const fetchAttachmentUrls = async (filenames: string[]): Promise<Record<string, string>> => {
  const unique = Array.from(new Set(filenames.filter(Boolean)))
  if (unique.length === 0) return {}

  const response = await fetch("/api/journal/attachment-urls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filenames: unique }),
  })
  if (!response.ok) return {}
  const { urls } = (await response.json()) as { urls: Record<string, string> }
  return urls ?? {}
}
