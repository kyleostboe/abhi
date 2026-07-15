import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createDownloadUrl } from "@/lib/storage"
import { extensionForContainer } from "@/lib/audio-utils"

const MAX_IDS_PER_REQUEST = 200

const buildFilename = (title: unknown, metadata: unknown): string => {
  const safeTitle =
    (typeof title === "string" && title.trim().replace(/[\\/:*?"<>|]+/g, "_").slice(0, 150)) || "meditation"
  const container =
    metadata && typeof metadata === "object" ? (metadata as { audioFormat?: { container?: string } }).audioFormat?.container : undefined
  const ext = extensionForContainer(container as Parameters<typeof extensionForContainer>[0])
  return `${safeTitle}.${ext}`
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  }

  let body: { meditationIds?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const meditationIds = Array.isArray(body.meditationIds)
    ? body.meditationIds.filter((id): id is string => typeof id === "string").slice(0, MAX_IDS_PER_REQUEST)
    : []

  if (meditationIds.length === 0) {
    return NextResponse.json({ urls: {} })
  }

  // RLS also enforces this, but filtering by profile_id here keeps the intent explicit and
  // means a mismatched id is simply excluded from the result rather than relying solely on
  // the policy to reject it.
  const { data, error } = await supabase
    .from("meditations")
    .select("id, audio_key, title, metadata")
    .eq("profile_id", user.id)
    .in("id", meditationIds)

  if (error) {
    console.error("[storage] Failed to look up meditations for download URLs:", error)
    return NextResponse.json({ error: "Unable to look up meditations." }, { status: 500 })
  }

  const urls: Record<string, string> = {}
  for (const row of data ?? []) {
    if (!row.audio_key) continue
    try {
      urls[row.id] = await createDownloadUrl(row.audio_key, buildFilename(row.title, row.metadata))
    } catch (error) {
      console.error(`[storage] Failed to mint download URL for meditation ${row.id}:`, error)
    }
  }

  return NextResponse.json({ urls })
}
