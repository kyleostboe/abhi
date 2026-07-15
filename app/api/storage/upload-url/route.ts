import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { buildAudioObjectKey, createUploadUrl } from "@/lib/storage"

const ALLOWED_EXTENSIONS = new Set(["ogg", "m4a", "mp3", "wav"])
const ALLOWED_CONTENT_TYPES = new Set([
  "audio/ogg",
  "audio/mp4",
  "audio/m4a",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
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

  let body: { ext?: string; contentType?: string }
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
    const key = buildAudioObjectKey(user.id, ext)
    const uploadUrl = await createUploadUrl(key, contentType)
    return NextResponse.json({ uploadUrl, key })
  } catch (error) {
    console.error("[storage] Failed to mint upload URL:", error)
    return NextResponse.json({ error: "Unable to prepare an upload URL." }, { status: 500 })
  }
}
