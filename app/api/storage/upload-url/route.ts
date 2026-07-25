import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { buildAudioObjectKey, buildJournalAttachmentKey, createUploadUrl } from "@/lib/storage"

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
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  }

  let body: { ext?: string; contentType?: string; scope?: string; filename?: string }
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

  try {
    // Journal attachments are addressed by the filename their note's markdown references, and
    // live beside the notes/ prefix so the bucket reads as a vault. Meditation audio keeps its
    // existing flat, UUID-named layout.
    const key =
      body.scope === "journal-attachment" && body.filename
        ? buildJournalAttachmentKey(user.id, body.filename)
        : buildAudioObjectKey(user.id, ext)
    const uploadUrl = await createUploadUrl(key, contentType)
    return NextResponse.json({ uploadUrl, key })
  } catch (error) {
    console.error("[storage] Failed to mint upload URL:", error)
    return NextResponse.json({ error: "Unable to prepare an upload URL." }, { status: 500 })
  }
}
