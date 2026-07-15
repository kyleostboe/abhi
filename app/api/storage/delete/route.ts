import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { deleteAudioObject } from "@/lib/storage"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  }

  let body: { meditationId?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const meditationId = typeof body.meditationId === "string" ? body.meditationId : null
  if (!meditationId) {
    return NextResponse.json({ error: "meditationId is required." }, { status: 400 })
  }

  const { data: row, error: lookupError } = await supabase
    .from("meditations")
    .select("id, audio_key")
    .eq("id", meditationId)
    .eq("profile_id", user.id)
    .maybeSingle()

  if (lookupError) {
    console.error("[storage] Failed to look up meditation for delete:", lookupError)
    return NextResponse.json({ error: "Unable to look up meditation." }, { status: 500 })
  }
  if (!row) {
    return NextResponse.json({ error: "Meditation not found." }, { status: 404 })
  }

  // Delete the R2 object before the row: if this fails, the row (and its still-valid
  // audio_key) survives so the delete can be safely retried. The reverse order risks an
  // orphaned object with no row left to point at it.
  if (row.audio_key) {
    try {
      await deleteAudioObject(row.audio_key)
    } catch (error) {
      console.error(`[storage] Failed to delete R2 object for meditation ${meditationId}:`, error)
      return NextResponse.json({ error: "Unable to delete stored audio." }, { status: 500 })
    }
  }

  const { error: deleteError } = await supabase
    .from("meditations")
    .delete()
    .eq("id", meditationId)
    .eq("profile_id", user.id)

  if (deleteError) {
    console.error("[storage] Failed to delete meditation row:", deleteError)
    return NextResponse.json({ error: "Unable to delete meditation." }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
