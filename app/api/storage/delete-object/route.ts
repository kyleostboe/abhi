import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { deleteAudioObject } from "@/lib/storage"

// Deletes a single R2 object by key, not tied to a meditation row. Used to clean up an
// audio_key that's just been superseded (e.g. replaceMeditationAudio uploading a new object
// in place of an old one) — unlike /api/storage/delete, there's no row to look the key up
// through by this point, so the key is taken directly and scoped to the caller's own prefix
// to prevent deleting another user's object.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  }

  let body: { audioKey?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const audioKey = typeof body.audioKey === "string" ? body.audioKey : null
  if (!audioKey || !audioKey.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Invalid or unauthorized audio key." }, { status: 400 })
  }

  try {
    await deleteAudioObject(audioKey)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`[storage] Failed to delete R2 object ${audioKey}:`, error)
    return NextResponse.json({ error: "Unable to delete stored audio." }, { status: 500 })
  }
}
