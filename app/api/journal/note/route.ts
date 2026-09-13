import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient, getAuthenticatedUser } from "@/lib/supabase/server"
import { buildJournalNoteKey, deleteObject, getTextObject } from "@/lib/storage"
import { parseNoteFile } from "@/lib/journal-frontmatter"
import { writeNoteFile } from "@/lib/journal-note-file"
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
 * `note_key` is set only once the file is actually there, which makes a null one mean exactly
 * "this note has no file yet" rather than "this note is old". Some will always land that way —
 * the client inserts the row directly when this route is unreachable, and it holds no R2
 * credentials of its own — so the sweep in ../notes/sync repairs them, and GET reads from the
 * index column until it does.
 */

const INDEX_COLUMNS =
  "id, slug, title, preview, content_md, note, note_key, folder_id, meditation_id, meditation_title, session_id, practice_type, tags, font, played_at, updated_at, visibility"

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
    // Also written to `note`, which the Library's own journal (hooks/use-journal.ts) reads from
    // this same table. Dropping one without unifying the two would leave a note created in one
    // place looking empty in the other.
    note: contentMd,
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
  // note_key is claimed only after the write succeeds, so a null one always means the file is
  // genuinely missing. A failure here costs nothing the user can see: the body is in the index
  // row, GET reads it from there, and ../notes/sync writes the file on the next journal load.
  try {
    await writeNoteFile({
      client: clientToUse,
      profileId: user.id,
      noteKey,
      title: data.title ?? title,
      body: contentMd,
      updatedAt,
      row: data,
    })

    const { error: keyError } = await clientToUse
      .from("journal_entries")
      .update({ note_key: noteKey })
      .eq("id", data.id)
      .eq("profile_id", user.id)

    if (keyError) throw keyError
    data.note_key = noteKey
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
    await writeNoteFile({
      client: supabase,
      profileId: user.id,
      noteKey,
      title,
      body,
      updatedAt,
      row: { ...existing, slug },
    })
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
      // content_md stays in step with the file: it is what GET serves when the object is missing
      // and what ../notes/sync rebuilds a missing file from. `note` is the same text again, for
      // the Library's own journal (hooks/use-journal.ts), which still reads that column.
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
