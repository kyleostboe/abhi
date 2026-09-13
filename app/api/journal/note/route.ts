import { type NextRequest, NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createAdminClient, getAuthenticatedUser } from "@/lib/supabase/server"
import { buildJournalNoteKey, deleteObject, getTextObject, putTextObject } from "@/lib/storage"
import { composeNoteFile, parseNoteFile, type NoteFrontmatter } from "@/lib/journal-frontmatter"
import { deriveTitle, derivePreview, slugify } from "@/lib/journal-markdown"
import { log } from "@/lib/log"

/**
 * Note bodies live in R2 as markdown files; the database keeps only an index.
 *
 * Reads and writes go through the server rather than a presigned URL because a note is small
 * text and the write has to update the index row in the same request — a presigned PUT would
 * leave the file and its index entry able to drift apart.
 *
 * Every file is written with complete frontmatter, so the index is reconstructible from the
 * bucket alone if it is ever lost or the app moves off Postgres. Creating a note writes its file
 * too, not only editing one — otherwise a note written and never touched again would exist in
 * the index and nowhere else.
 *
 * One case still escapes that: when this route is unreachable the client inserts the row
 * directly, and it has no R2 credentials of its own. Such a note has no `note_key`, GET serves
 * it from the index column, and the next save writes the file.
 */

const INDEX_COLUMNS =
  "id, slug, title, preview, content_md, note, note_key, folder_id, meditation_id, meditation_title, session_id, practice_type, tags, font, played_at, updated_at, visibility"

/**
 * Composes a note's markdown file and writes it to R2.
 *
 * Shared by create and update so a note's file is written the same way whichever end it comes
 * from. The folder is written as its name rather than its id — the file has to make sense on its
 * own once it leaves the database behind — and the lookup is filtered by profile so a folder id
 * taken from the request body cannot name somebody else's folder.
 */
async function writeNoteFile(
  client: SupabaseClient,
  profileId: string,
  noteKey: string,
  frontmatter: Omit<NoteFrontmatter, "folder"> & { folderId: string | null },
  body: string,
): Promise<void> {
  const { folderId, ...rest } = frontmatter

  let folderName: string | null = null
  if (folderId) {
    const { data: folder } = await client
      .from("journal_folders")
      .select("name")
      .eq("profile_id", profileId)
      .eq("id", folderId)
      .maybeSingle()
    folderName = folder?.name ?? null
  }

  await putTextObject(noteKey, composeNoteFile({ ...rest, folder: folderName }, body))
}

/** POST /api/journal/note — creates a new journal note row and its markdown file */
export async function POST(request: NextRequest) {
  const { user, supabase, error: authError } = await getAuthenticatedUser(request)

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  }

  let payload: {
    contentMd?: string
    title?: string
    slug?: string
    folderId?: string | null
    meditationId?: string | null
    meditationTitle?: string | null
    sessionId?: string | null
    practiceType?: string | null
    playedAt?: string
  }
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const contentMd = payload.contentMd ?? ""
  const title = payload.title?.trim() || deriveTitle(contentMd)
  const slug =
    payload.slug || slugify(title, `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`)
  const playedAt = payload.playedAt ?? new Date().toISOString()
  const updatedAt = new Date().toISOString()
  const preview = derivePreview(contentMd)
  const noteKey = buildJournalNoteKey(user.id, slug)

  const insertData = {
    profile_id: user.id,
    content_md: contentMd,
    note: contentMd,
    note_key: noteKey,
    title,
    slug,
    preview,
    folder_id: payload.folderId ?? null,
    meditation_id: payload.meditationId ?? null,
    meditation_title: payload.meditationTitle ?? null,
    session_id: payload.sessionId ?? null,
    practice_type: payload.practiceType ?? null,
    played_at: playedAt,
    updated_at: updatedAt,
  }

  const adminClient = createAdminClient()
  const clientToUse = adminClient || supabase

  const { data, error } = await clientToUse
    .from("journal_entries")
    .insert(insertData)
    .select(INDEX_COLUMNS)
    .single()

  if (error || !data) {
    log.error("[journal] Failed to create note in DB:", error)
    return NextResponse.json({ error: error?.message || "Failed to create note." }, { status: 500 })
  }

  // The row goes in before the file goes out: the unique index on (profile_id, slug) is what
  // proves this slug is ours, and writing first would let a colliding slug overwrite the file of
  // a note that already owns it. An empty body is a real case — a note offered after a sit and
  // saved before anything is typed — and still produces a file with complete frontmatter.
  //
  // A failure here is not fatal to the note: the body is in the index row too, GET falls back to
  // it when the object is missing, and the next save writes the file. It is still logged, because
  // until that save happens this note is absent from the bucket.
  try {
    await writeNoteFile(
      clientToUse,
      user.id,
      noteKey,
      {
        title: data.title ?? title,
        slug: data.slug ?? slug,
        date: data.played_at ?? playedAt,
        updated: updatedAt,
        folderId: data.folder_id ?? null,
        meditation: data.meditation_title,
        practiceType: data.practice_type,
        tags: data.tags ?? [],
        font: data.font,
        visibility: data.visibility ?? "private",
      },
      contentMd,
    )
  } catch (storageError) {
    log.error("[journal] Created the note but could not write its file:", storageError)
  }

  return NextResponse.json({ ok: true, note: data })
}


/** GET /api/journal/note?id=<uuid> — returns the note's markdown body. */
export async function GET(request: NextRequest) {
  const { user, supabase, error: authError } = await getAuthenticatedUser(request)

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  }

  const id = request.nextUrl.searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "Missing note id." }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("journal_entries")
    .select("id, note_key, content_md, note")
    .eq("profile_id", user.id)
    .eq("id", id)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ error: "Note not found." }, { status: 404 })
  }

  // Notes written before this moved to R2 still have their body in the column; fall back to it
  // so nothing has to be migrated up front.
  if (!data.note_key) {
    return NextResponse.json({ body: data.content_md ?? data.note ?? "" })
  }

  try {
    const contents = await getTextObject(data.note_key)
    if (contents === null) {
      return NextResponse.json({ body: data.content_md ?? data.note ?? "" })
    }
    return NextResponse.json({ body: parseNoteFile(contents).body })
  } catch (storageError) {
    log.error("[journal] Failed to read note from storage:", storageError)
    return NextResponse.json({ error: "Unable to read the note." }, { status: 500 })
  }
}

/** PUT /api/journal/note — writes the markdown file and refreshes the index row. */
export async function PUT(request: NextRequest) {
  const { user, supabase, error: authError } = await getAuthenticatedUser(request)

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  }

  let payload: { id?: string; body?: string }
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const id = typeof payload.id === "string" ? payload.id : null
  const body = typeof payload.body === "string" ? payload.body : ""
  if (!id) {
    return NextResponse.json({ error: "Missing note id." }, { status: 400 })
  }

  const { data: existing, error: lookupError } = await supabase
    .from("journal_entries")
    .select(INDEX_COLUMNS)
    .eq("profile_id", user.id)
    .eq("id", id)
    .maybeSingle()

  if (lookupError || !existing) {
    return NextResponse.json({ error: "Note not found." }, { status: 404 })
  }

  const slug = existing.slug ?? id
  const title = deriveTitle(body)
  const updatedAt = new Date().toISOString()
  const noteKey = existing.note_key ?? buildJournalNoteKey(user.id, slug)

  try {
    await writeNoteFile(
      supabase,
      user.id,
      noteKey,
      {
        title,
        slug,
        date: existing.played_at,
        updated: updatedAt,
        folderId: existing.folder_id ?? null,
        meditation: existing.meditation_title,
        practiceType: existing.practice_type,
        tags: existing.tags ?? [],
        font: existing.font,
        visibility: existing.visibility ?? "private",
      },
      body,
    )
  } catch (storageError) {
    log.error("[journal] Failed to write note to storage:", storageError)
    return NextResponse.json({ error: "Unable to save the note." }, { status: 500 })
  }

  const { error: updateError } = await supabase
    .from("journal_entries")
    .update({
      note_key: noteKey,
      title,
      preview: derivePreview(body),
      updated_at: updatedAt,
      // content_md is kept in sync as a safety net while R2 becomes the source of truth. It can
      // be dropped once every note has a note_key.
      content_md: body,
      note: body,
    })
    .eq("id", id)

  if (updateError) {
    log.error("[journal] Failed to update note index:", updateError)
    return NextResponse.json({ error: "Saved the file but could not update the index." }, { status: 500 })
  }

  return NextResponse.json({ ok: true, noteKey, title, updatedAt })
}

/** DELETE /api/journal/note?id=<uuid> — removes the markdown file (the row is deleted client-side). */
export async function DELETE(request: NextRequest) {
  const { user, supabase, error: authError } = await getAuthenticatedUser(request)

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  }

  const id = request.nextUrl.searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "Missing note id." }, { status: 400 })
  }

  const { data } = await supabase
    .from("journal_entries")
    .select("note_key")
    .eq("profile_id", user.id)
    .eq("id", id)
    .maybeSingle()

  if (data?.note_key?.startsWith(`${user.id}/`)) {
    try {
      await deleteObject(data.note_key)
    } catch (storageError) {
      log.warn("[journal] Could not delete note file:", storageError)
    }
  }

  return NextResponse.json({ ok: true })
}
