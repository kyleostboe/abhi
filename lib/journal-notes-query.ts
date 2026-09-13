import type { SupabaseClient } from "@supabase/supabase-js"

import { deriveTitle, derivePreview } from "@/lib/journal-markdown"
import { log } from "@/lib/log"

/**
 * The Journal's index query, and the row mapping that goes with it.
 *
 * Lifted out of `hooks/use-journal-notes.ts` so the warmer (`components/data-warmer.tsx`) and the
 * hook can run the *same* query rather than two that have to be kept in step. Nothing about the
 * shape changed in the move.
 */

export type JournalNote = {
  id: string
  slug: string
  title: string
  preview: string
  /** Markdown body. Empty until loaded from storage when `isBodyLoaded` is false. */
  contentMd: string
  noteKey: string | null
  isBodyLoaded: boolean
  folderId: string | null
  meditationId: string | null
  meditationTitle: string | null
  /** The sit this note was written about, when it was written about one. */
  sessionId: string | null
  practiceType: string | null
  tags: string[]
  font: string | null
  playedAt: string
  updatedAt: string
}

export type JournalFolder = {
  id: string
  name: string
  sortOrder: number
}

export type NoteRow = {
  id: string
  slug: string | null
  title: string | null
  preview: string | null
  content_md: string | null
  note: string | null
  note_key: string | null
  folder_id: string | null
  meditation_id: string | null
  meditation_title: string | null
  session_id: string | null
  practice_type: string | null
  tags: string[] | null
  font: string | null
  played_at: string
  updated_at: string | null
}

// The list only needs the index. A note's markdown body lives in R2 and is fetched when the
// note is actually opened, so loading the journal never pulls every note's full text.
export const NOTE_COLUMNS =
  "id, slug, title, preview, content_md, note, note_key, folder_id, meditation_id, meditation_title, session_id, practice_type, tags, font, played_at, updated_at"

export const mapNote = (row: NoteRow): JournalNote => {
  // `content_md` is the Journal's markdown body. `note` is the column the Library's own journal
  // (hooks/use-journal.ts) still writes for the same table, so a row created there is readable
  // here rather than appearing empty.
  const contentMd = row.content_md ?? row.note ?? ""
  // Entries created by playing a meditation start with no body at all, so fall back to the
  // meditation's name rather than labelling every one of them "New note".
  const derivedTitle = contentMd.trim() ? deriveTitle(contentMd) : (row.meditation_title?.trim() || "New note")
  return {
    id: row.id,
    slug: row.slug ?? row.id,
    title: row.title?.trim() || derivedTitle,
    preview: row.preview?.trim() || derivePreview(contentMd),
    contentMd,
    noteKey: row.note_key,
    /** True once the body has been read from storage (or is known to live in the column). */
    isBodyLoaded: !row.note_key,
    folderId: row.folder_id,
    meditationId: row.meditation_id,
    meditationTitle: row.meditation_title,
    sessionId: row.session_id,
    practiceType: row.practice_type,
    tags: row.tags ?? [],
    font: row.font,
    playedAt: row.played_at,
    updatedAt: row.updated_at ?? row.played_at,
  }
}




/** The whole index — notes and folders — in one round trip. */
export async function loadJournalData(
  supabase: SupabaseClient,
): Promise<{ notes: JournalNote[]; folders: JournalFolder[] }> {
  const [noteResult, folderResult] = await Promise.all([
    supabase.from("journal_entries").select(NOTE_COLUMNS).order("updated_at", { ascending: false }),
    supabase.from("journal_folders").select("id, name, sort_order").order("sort_order", { ascending: true }),
  ])

  if (noteResult.error) log.error("[journal] Failed to load notes:", noteResult.error)
  if (folderResult.error) log.error("[journal] Failed to load folders:", folderResult.error)

  // A failed half yields an empty half rather than throwing: the Journal with its folders and no
  // notes is still a Journal, and the errors are already logged above.
  return {
    notes: ((noteResult.data ?? []) as NoteRow[]).map((row) => mapNote(row)),
    folders: ((folderResult.data ?? []) as { id: string; name: string; sort_order: number | null }[]).map((row) => ({
      id: row.id,
      name: row.name,
      sortOrder: row.sort_order ?? 0,
    })),
  }
}
