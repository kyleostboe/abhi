import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { composeNoteFile } from "@/lib/journal-frontmatter"
import { putTextObject } from "@/lib/storage"

/**
 * Writing a note's markdown file to R2.
 *
 * Lifted out of the note route so every path that produces a file — creating, editing, and the
 * repair sweep — composes it the same way. A note's file is the thing the journal can be rebuilt
 * from, so there must not be two spellings of it.
 *
 * `server-only`: this reaches R2 through lib/storage.ts and must never be pulled into the client
 * bundle.
 */

/** The row fields a note's frontmatter is built from. */
export type NoteFileRow = {
  slug: string | null
  played_at: string
  folder_id: string | null
  meditation_title: string | null
  practice_type: string | null
  tags: string[] | null
  font: string | null
  visibility: string | null
}

/** Select list for a caller that needs to write note files but not the whole index row. */
export const NOTE_FILE_COLUMNS =
  "id, slug, title, content_md, note_key, played_at, folder_id, meditation_title, practice_type, tags, font, visibility"

/**
 * Composes a note's markdown file and writes it to R2.
 *
 * The folder is written as its name rather than its id — the file has to make sense on its own
 * once it leaves the database behind — and the lookup is filtered by profile so a folder id taken
 * from a request body cannot name somebody else's folder.
 */
export async function writeNoteFile(params: {
  client: SupabaseClient
  profileId: string
  noteKey: string
  title: string
  body: string
  updatedAt: string
  row: NoteFileRow
}): Promise<void> {
  const { client, profileId, noteKey, title, body, updatedAt, row } = params

  let folderName: string | null = null
  if (row.folder_id) {
    const { data: folder } = await client
      .from("journal_folders")
      .select("name")
      .eq("profile_id", profileId)
      .eq("id", row.folder_id)
      .maybeSingle()
    folderName = folder?.name ?? null
  }

  const file = composeNoteFile(
    {
      title,
      slug: row.slug ?? "",
      date: row.played_at,
      updated: updatedAt,
      folder: folderName,
      meditation: row.meditation_title,
      practiceType: row.practice_type,
      tags: row.tags ?? [],
      font: row.font,
      visibility: row.visibility ?? "private",
    },
    body,
  )

  await putTextObject(noteKey, file)
}
