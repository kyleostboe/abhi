import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/supabase/server"
import {
  buildAudioObjectKey,
  buildJournalAttachmentKey,
  createUploadUrl,
  getUsageBytesForPrefix,
} from "@/lib/storage"
import { checkUpload } from "@/lib/entitlements"
import { getEntitlements } from "@/lib/entitlements-server"
import { log } from "@/lib/log"

// Audio covers meditations and journal voice notes; images are journal attachments. Both go
// to the same bucket under the same per-user key prefix.
const ALLOWED_EXTENSIONS = new Set(["ogg", "opus", "m4a", "mp3", "wav", "png", "jpg", "jpeg", "webp", "gif"])
const ALLOWED_CONTENT_TYPES = new Set([
  "audio/ogg",
  "audio/opus",
  "audio/mp4",
  "audio/m4a",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/octet-stream",
])

export async function POST(request: NextRequest) {
  const { user, supabase, error: authError } = await getAuthenticatedUser(request)

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  }

  let body: { ext?: string; contentType?: string; contentLength?: number; scope?: string; filename?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const ext = (body.ext || "").toLowerCase().replace(/^\./, "")
  const contentType = body.contentType || "application/octet-stream"

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json({ error: `Unsupported audio extension: ${ext}` }, { status: 400 })
  }
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    return NextResponse.json({ error: `Unsupported content type: ${contentType}` }, { status: 400 })
  }

  // An unmeasured upload cannot be checked against anything, so it is refused outright rather
  // than waved through — every caller has the Blob in hand and knows its size.
  const contentLength = body.contentLength
  if (typeof contentLength !== "number" || !Number.isInteger(contentLength) || contentLength < 0) {
    return NextResponse.json(
      { error: "An upload must declare its size." },
      { status: 400 },
    )
  }

  const isJournalAttachment = body.scope === "journal-attachment" && Boolean(body.filename)

  try {
    const entitlements = await getEntitlements(supabase, user.id)

    if (isJournalAttachment && !entitlements.journalAttachments) {
      return NextResponse.json(
        {
          error: "Images and voice notes in the journal need a subscription.",
          reason: "attachments-not-included",
          tier: entitlements.tier,
        },
        { status: 403 },
      )
    }

    // Listing the prefix is the authority on usage rather than a running total in Postgres: a
    // failed upload, an orphaned object or a delete that half-succeeded would all drift a
    // counter, and the one number that cannot drift is what the bucket actually holds.
    const usedBytes = await getUsageBytesForPrefix(`${user.id}/`)
    const verdict = checkUpload(entitlements, usedBytes, contentLength)

    if (!verdict.allowed) {
      const tooLarge = verdict.reason === "too-large"
      return NextResponse.json(
        {
          // Two different problems deserve two different sentences. Telling someone to subscribe
          // when they should have shortened a recording is how a paywall starts feeling dishonest.
          error: tooLarge
            ? "That file is larger than a single upload allows."
            : "This account has no room left for another upload.",
          reason: verdict.reason,
          tier: entitlements.tier,
          usedBytes,
          quotaBytes: entitlements.storageQuotaBytes,
          maxUploadBytes: entitlements.maxUploadBytes,
        },
        { status: tooLarge ? 413 : 507 },
      )
    }

    // Journal attachments are addressed by the filename their note's markdown references, and
    // live beside the notes/ prefix so the bucket reads as a vault. Meditation audio keeps its
    // existing flat, UUID-named layout.
    const key = isJournalAttachment
      ? buildJournalAttachmentKey(user.id, body.filename!)
      : buildAudioObjectKey(user.id, ext)
    const uploadUrl = await createUploadUrl(key, contentType, contentLength)
    return NextResponse.json({ uploadUrl, key })
  } catch (error) {
    log.error("[storage] Failed to prepare an upload:", error)
    return NextResponse.json({ error: "Unable to prepare an upload URL." }, { status: 500 })
  }
}
