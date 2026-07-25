import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createDownloadUrl } from "@/lib/storage"

const MAX_PER_REQUEST = 100

/**
 * Mints short-lived signed URLs for a user's own journal attachments, keyed by filename (the
 * same identifier the note's markdown references). Journal attachments are private: the bucket
 * is never public, and every URL here is scoped to the caller's own rows — a filename belonging
 * to someone else is simply absent from the response.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  }

  let body: { filenames?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const filenames = Array.isArray(body.filenames)
    ? body.filenames.filter((name): name is string => typeof name === "string").slice(0, MAX_PER_REQUEST)
    : []

  if (filenames.length === 0) {
    return NextResponse.json({ urls: {} })
  }

  const { data, error } = await supabase
    .from("journal_attachments")
    .select("filename, storage_key")
    .eq("profile_id", user.id)
    .in("filename", filenames)

  if (error) {
    console.error("[journal] Failed to look up attachments:", error)
    return NextResponse.json({ error: "Unable to look up attachments." }, { status: 500 })
  }

  const urls: Record<string, string> = {}
  for (const row of data ?? []) {
    if (!row.storage_key) continue
    try {
      urls[row.filename] = await createDownloadUrl(row.storage_key)
    } catch (urlError) {
      console.error(`[journal] Failed to mint URL for ${row.filename}:`, urlError)
    }
  }

  return NextResponse.json({ urls })
}
