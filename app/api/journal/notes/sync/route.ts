import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/supabase/server"
import { buildJournalNoteKey } from "@/lib/storage"
import { NOTE_FILE_COLUMNS, writeNoteFile } from "@/lib/journal-note-file"
import { deriveTitle } from "@/lib/journal-markdown"
import { log } from "@/lib/log"

/**
 * Brings note files in R2 back in step with the index.
 *
 * Two things put them out of step, and neither is an error the user should have to know about:
 *
 *   - A note whose file was never written. The client inserts the row directly when the note
 *     route is unreachable, and it holds no R2 credentials, so that note arrives with a null
 *     `note_key`. A failed write during creation lands the same way, deliberately.
 *   - A note whose frontmatter has gone stale. The file carries its folder's *name* so it means
 *     something on its own, which means renaming a folder leaves every file inside it describing
 *     a folder that no longer exists under that name.
 *
 * Called with no folder this repairs the first; called with one it rewrites that folder's notes.
 * Both are the same operation underneath — compose the file again from the row — so they share
 * an implementation rather than drifting apart.
 */

/** Kept small so a sweep cannot become an unbounded amount of work in one request. */
const MAX_NOTES_PER_SWEEP = 200

export async function POST(request: NextRequest) {
  const { user, supabase, error: authError } = await getAuthenticatedUser(request)

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  }

  let payload: { folderId?: unknown }
  try {
    payload = await request.json()
  } catch {
    // No body is the ordinary case — it means "repair whatever is missing".
    payload = {}
  }

  const folderId = typeof payload.folderId === "string" ? payload.folderId : null

  let query = supabase
    .from("journal_entries")
    .select(NOTE_FILE_COLUMNS)
    .eq("profile_id", user.id)
    .limit(MAX_NOTES_PER_SWEEP)

  query = folderId ? query.eq("folder_id", folderId) : query.is("note_key", null)

  const { data, error } = await query

  if (error) {
    log.error("[journal] Could not list notes to sync:", error)
    return NextResponse.json({ error: "Unable to list notes." }, { status: 500 })
  }

  const rows = data ?? []
  let written = 0
  let failed = 0

  for (const row of rows) {
    const slug = row.slug ?? row.id
    const noteKey = row.note_key ?? buildJournalNoteKey(user.id, slug)
    const body = row.content_md ?? ""
    const updatedAt = new Date().toISOString()

    try {
      await writeNoteFile({
        client: supabase,
        profileId: user.id,
        noteKey,
        title: row.title?.trim() || deriveTitle(body),
        body,
        updatedAt,
        row: { ...row, slug },
      })

      if (!row.note_key) {
        const { error: keyError } = await supabase
          .from("journal_entries")
          .update({ note_key: noteKey })
          .eq("id", row.id)
          .eq("profile_id", user.id)
        if (keyError) throw keyError
      }

      written += 1
    } catch (syncError) {
      // One bad note must not stop the rest: the next sweep picks it up again.
      failed += 1
      log.warn("[journal] Could not sync a note's file:", syncError)
    }
  }

  return NextResponse.json({ ok: true, written, failed })
}
